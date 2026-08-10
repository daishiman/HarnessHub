#!/usr/bin/env node
// smoke 直前の「配信中の版がいま deploy した版のままか」の再確認 (HarnessHub-u9zq)。
//
// 背景: ci.yml の version_gate は「新しい版がエッジへ届いたか」を見る検査で、届くまでの
// ramp-up を許容する長い timeout を持つ。2026-08-07 の PR #674 で連続一致 (streak) を
// 通過条件にしたことで「単発の一致で通す」窓は塞がったが、ゲート通過から smoke 開始までの
// 間には別の step (鮮度検査) が挟まり、その間に別 colo (エッジ拠点) の旧版へ smoke が当たる
// 窓が残っていた。run 31221676748 では /health が新版へ切替わってゲートは通ったのに、続く
// hearing smoke が修正前のコード (tenant_mismatch=403) を叩いて落ちている。
//
// version_gate との役割の違い:
//   version_gate  … 「まだ届いていない」を許容しながら、届いたことを確かめる (伝播の立ち上がり)
//   この検査      … 「もう届いている」前提で、いま直前に崩れていないかを確かめる (伝播ムラ / 巻き戻り)
// そのため不一致の意味が違う。ここでの不一致は待てば直る途中経過ではなく、smoke が旧版を
// 検査してしまう状態そのものなので、有限回だけ再試行して届かなければ必ず落とす。
//
// fail-open にしない設計:
//   - 必要な「連続」一致に達したときだけ exit 0。それ以外の経路 (期限切れ / 試行上限 /
//     通信失敗 / JSON 不正 / version 欠落) はすべて exit 1。
//   - 応答が取れなかった試行は「不一致」として数え、連続一致を 0 へ戻す。取得できなかったことを
//     「変化なし」と読み替えない。
//
//   node scripts/ci/assert-served-version.mjs --health-url <url> --expect <version> \
//     [--samples 3] [--interval-seconds 2] [--timeout-seconds 60] [--json <path>]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEFAULTS = { samples: 3, intervalSeconds: 2, timeoutSeconds: 60 };

function parseArgs(argv) {
  const args = { healthUrl: null, expect: null, json: null, ...DEFAULTS };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--health-url') args.healthUrl = argv[++i];
    else if (argv[i] === '--expect') args.expect = argv[++i];
    else if (argv[i] === '--json') args.json = resolve(argv[++i]);
    else if (argv[i] === '--samples') args.samples = Number.parseInt(argv[++i], 10);
    else if (argv[i] === '--interval-seconds') args.intervalSeconds = Number(argv[++i]);
    else if (argv[i] === '--timeout-seconds') args.timeoutSeconds = Number(argv[++i]);
    else throw new Error(`未知の引数: ${argv[i]}`);
  }
  if (!args.healthUrl) throw new Error('--health-url は必須');
  if (!args.expect) throw new Error('--expect は必須 (deploy が控えた version id)');
  if (!Number.isInteger(args.samples) || args.samples < 1) throw new Error('--samples は 1 以上の整数');
  return args;
}

const sleep = (seconds) => new Promise((done) => setTimeout(done, seconds * 1000));

/**
 * /health を 1 回観測する。
 * 取得できなかった場合も throw せず served=null で返し、呼び出し側で「不一致」として扱う
 * (通信失敗を素通りさせないため)。
 */
async function observe(healthUrl, attempt, remainingMs) {
  // cache-buster と no-cache を併用し、途中のキャッシュ応答を「配信中の版」と誤認しない
  const separator = healthUrl.includes('?') ? '&' : '?';
  const url = `${healthUrl}${separator}_smoke_recheck=${attempt}`;
  try {
    // fetch 自体が無応答でぶら下がって全体 deadline を越えないよう、残り時間以内で中断する。
    // 10 秒上限は通常の /health 遅延を吸収しつつ、1 回の通信待ちが再確認全体を占有しないための上限。
    const requestTimeoutMs = Math.max(1, Math.min(10_000, remainingMs));
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache' },
      redirect: 'follow',
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    // cf-ray の末尾が応答した colo。どの拠点を何回観測して通したかを後から検証できるようにする
    const colo = (response.headers.get('cf-ray') ?? '').split('-').pop() || 'unknown';
    if (!response.ok) return { served: null, colo, error: `HTTP ${response.status}` };
    const body = await response.json();
    const served = typeof body?.version === 'string' && body.version ? body.version : null;
    return { served, colo, error: served ? null : 'version フィールドが空' };
  } catch (cause) {
    return { served: null, colo: 'unreachable', error: String(cause?.message ?? cause) };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const deadline = Date.now() + args.timeoutSeconds * 1000;
  const observations = [];
  let streak = 0;
  let attempt = 0;
  // 一度でも一致したあとに不一致へ落ちたか。これが立っていれば「まだ届いていない」ではなく
  // 「拠点によって新旧が混ざっている」= この検査が塞ぎたい状態そのもの
  let flapped = false;

  while (Date.now() < deadline) {
    attempt += 1;
    const { served, colo, error } = await observe(args.healthUrl, attempt, deadline - Date.now());
    const matched = served === args.expect;
    if (matched) {
      streak += 1;
    } else {
      if (streak > 0) flapped = true;
      streak = 0;
    }
    observations.push({ attempt, colo, served, matched, error });
    console.log(
      `attempt=${attempt} colo=${colo} served=${served ?? 'none'} streak=${streak}/${args.samples}` +
        (error ? ` error=${error}` : ''),
    );
    if (streak >= args.samples) break;
    await sleep(args.intervalSeconds);
  }

  const colos = [...new Set(observations.map((o) => o.colo))];
  const passed = streak >= args.samples;
  const evidence = {
    checked_at: new Date().toISOString(),
    health_url: args.healthUrl,
    expected_version: args.expect,
    required_consecutive: args.samples,
    achieved_consecutive: streak,
    observed_colos: colos,
    flapped,
    observations,
    status: passed ? 'pass' : 'fail',
  };
  if (args.json) {
    mkdirSync(dirname(args.json), { recursive: true });
    writeFileSync(args.json, `${JSON.stringify(evidence, null, 2)}\n`);
  }

  console.log(
    `expected=${args.expect} streak=${streak}/${args.samples} attempts=${attempt} colos=${colos.join(' ')} flapped=${flapped}`,
  );

  if (!passed) {
    console.error(
      `::error::smoke 直前の再確認で、配信版が ${args.timeoutSeconds} 秒以内に ${args.samples} 回連続で ${args.expect} と一致しなかった。` +
        (flapped ? ' 一致と不一致が混在しており、colo 間の伝播が完了していない。' : ' 配信版が入れ替わっていない。') +
        ' このまま smoke を走らせると旧版を検査することになるため中止する',
    );
    process.exit(1);
  }
  console.log('smoke 直前の再確認 OK: 配信版は deploy した版で安定している');
}

main().catch((error) => {
  // 想定外の失敗も success へ倒さない
  console.error(`::error::assert-served-version が異常終了した: ${error?.message ?? error}`);
  process.exit(1);
});
