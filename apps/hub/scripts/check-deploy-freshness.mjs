#!/usr/bin/env node
// 稼働ビルドが既定 branch の HEAD より古い状態で「放置されていないか」を検査する (V7)。
//
// 由来: 2026-08-03 に着地先を直した commit が、2026-08-07 まで 4 日間本番へ反映されていなかった。
// deploy は success を返し続け、/health も 200 を返し続けていたので、誰もそれに気づけなかった。
// 稼働成果物がどの commit なのかを問い合わせる手段が無かったことが、この 4 日間の本体である。
//
// 検査するのは「古いこと」ではなく「**古い状態が続いていること**」である。deploy には数分かかるので、
// HEAD が更新された直後の乖離まで落とすと、CI が常に赤くなって誰も見なくなる。
// そこで「HEAD が既定 branch へ入ってから MAX_LAG_MINUTES 以上経ってもなお稼働版が古い」ときだけ落とす。
//
// 使い方:
//   node apps/hub/scripts/check-deploy-freshness.mjs --health-url https://example.com/health
//   HUB_HEALTH_URL=... node apps/hub/scripts/check-deploy-freshness.mjs --json /tmp/freshness.json

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 乖離を許容する上限 (分)。しきい値はこの 1 箇所だけが正本で、CI からは
 * `DEPLOY_FRESHNESS_MAX_LAG_MINUTES` で上書きする。値を複数箇所へ書くと、
 * 「検査は 30 分・文書は 60 分」のような食い違いが起きて運用判断が割れる。
 *
 * 30 分の根拠: 本 repository の deploy job (install → migration → opennext build → wrangler deploy →
 * 各 smoke) は通常 10 分台で終わる。倍の余裕を見て 30 分とする。本件の 4 日間はこの 192 倍であり、
 * しきい値の精度に依存せず検出できる。
 */
export const DEFAULT_MAX_LAG_MINUTES = 30;

/** 40 桁小文字 hex 以外は commit 識別子として受け付けない (短縮 sha / branch 名を素性と誤認しない) */
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/;

/** 検査結果の分類。CI の出力と JSON 証跡で同じ語彙を使う */
export const OUTCOMES = {
  UP_TO_DATE: 'up-to-date',
  LAGGING_WITHIN_GRACE: 'lagging-within-grace',
  STALE: 'stale',
  COMMIT_UNAVAILABLE: 'commit-unavailable',
  HEALTH_UNREACHABLE: 'health-unreachable',
};

/**
 * 鮮度判定の本体。I/O を引数で受け取り、判定だけを行う純関数に近い形にしてある。
 * こうしないと「しきい値を超えた状態」を test で再現できず、検査が実際に落ちることを固定できない。
 *
 * @param {object} input
 * @param {string|undefined} input.servedCommit 稼働中の成果物が申告した commit (未埋込なら undefined)
 * @param {string} input.headCommit 既定 branch の HEAD commit
 * @param {Date} input.headCommittedAt HEAD commit が作られた時刻
 * @param {Date} input.now 判定時刻
 * @param {number} input.maxLagMinutes 許容する乖離時間 (分)
 */
export function evaluateFreshness(input) {
  const { servedCommit, headCommit, headCommittedAt, now, maxLagMinutes } = input;

  // 埋込が無い、あるいは形式が壊れている場合は「一致している」とは言えない。
  // ここを PASS にすると、埋込配線が壊れた瞬間に検査が永久に緑になる (fail-open) ため落とす。
  if (!servedCommit || !COMMIT_SHA_PATTERN.test(servedCommit)) {
    return {
      outcome: OUTCOMES.COMMIT_UNAVAILABLE,
      ok: false,
      lagMinutes: null,
      reason:
        '稼働中の成果物が commit を申告していない。埋込 (wrangler deploy --var HUB_COMMIT_SHA) が外れている可能性がある',
    };
  }

  if (servedCommit === headCommit) {
    return { outcome: OUTCOMES.UP_TO_DATE, ok: true, lagMinutes: 0, reason: '稼働版と既定 branch HEAD が一致している' };
  }

  const lagMinutes = (now.getTime() - headCommittedAt.getTime()) / 60_000;
  if (lagMinutes < maxLagMinutes) {
    return {
      outcome: OUTCOMES.LAGGING_WITHIN_GRACE,
      ok: true,
      lagMinutes,
      reason: `HEAD が更新されてまだ ${lagMinutes.toFixed(1)} 分 (許容 ${maxLagMinutes} 分)。deploy 進行中とみなす`,
    };
  }

  return {
    outcome: OUTCOMES.STALE,
    ok: false,
    lagMinutes,
    reason: `既定 branch HEAD から ${lagMinutes.toFixed(1)} 分 (許容 ${maxLagMinutes} 分) 経っても稼働版が古いまま`,
  };
}

function parseArgs(argv) {
  const get = (flag) => {
    const index = argv.indexOf(flag);
    return index > -1 ? argv[index + 1] : undefined;
  };
  return {
    healthUrl: get('--health-url') ?? process.env.HUB_HEALTH_URL,
    jsonPath: get('--json'),
    maxLagMinutes: Number(
      get('--max-lag-minutes') ?? process.env.DEPLOY_FRESHNESS_MAX_LAG_MINUTES ?? DEFAULT_MAX_LAG_MINUTES,
    ),
  };
}

/** 既定 branch の HEAD を local git から読む。CI では checkout 済みの HEAD がそれにあたる */
function readHead() {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().toLowerCase();
  // committer date を使う。author date は cherry-pick や rebase で過去のまま残り、
  // 「いつ既定 branch へ入ったか」を表さないため、経過時間の基準にできない
  const committedAt = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { encoding: 'utf8' }).trim();
  return { sha, committedAt: new Date(committedAt) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.healthUrl) {
    console.error('HUB_HEALTH_URL または --health-url が必要です');
    process.exit(2);
  }
  if (!Number.isFinite(args.maxLagMinutes) || args.maxLagMinutes < 0) {
    console.error(`許容乖離時間が数値ではありません: ${args.maxLagMinutes}`);
    process.exit(2);
  }

  const head = readHead();
  let result;
  let servedCommit;
  let servedVersion;

  try {
    // キャッシュ済み応答を「配信中の版」と誤認しないよう no-store を明示する
    const response = await fetch(args.healthUrl, { headers: { 'Cache-Control': 'no-cache' } });
    const body = await response.json();
    servedCommit = typeof body?.commit === 'string' ? body.commit.trim().toLowerCase() : undefined;
    servedVersion = typeof body?.version === 'string' ? body.version : undefined;
    result = evaluateFreshness({
      servedCommit,
      headCommit: head.sha,
      headCommittedAt: head.committedAt,
      now: new Date(),
      maxLagMinutes: args.maxLagMinutes,
    });
  } catch (error) {
    // 到達できないこと自体は鮮度の問題ではないが、「検査できなかった」を成功と混同しない
    result = {
      outcome: OUTCOMES.HEALTH_UNREACHABLE,
      ok: false,
      lagMinutes: null,
      reason: `/health へ到達できなかった: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const report = {
    checked_at: new Date().toISOString(),
    health_url: args.healthUrl,
    head_commit: head.sha,
    head_committed_at: head.committedAt.toISOString(),
    served_commit: servedCommit ?? null,
    served_version: servedVersion ?? null,
    max_lag_minutes: args.maxLagMinutes,
    ...result,
  };

  if (args.jsonPath) {
    const out = resolve(args.jsonPath);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
  if (!result.ok) {
    console.error(`::error::deploy 鮮度検査 ${result.outcome}: ${result.reason}`);
    process.exit(1);
  }
}

// import されたとき (test) は実行しない。URL 文字列の直接比較は、
// ワークツリーの path に日本語や空白があると percent-encode 差で常に false になる。
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
