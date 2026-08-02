#!/usr/bin/env node
// Cloudflare Workers Secret の設定検査 (GitHub Actions 側 check-actions-secrets.mjs の Cloudflare 版)。
//
// 背景 (HarnessHub-o2i.13 / 2026-08-02): 本番 Worker に `AUTH_ACCESS_TOKEN_SECRET` が未投入のまま
// 稼働していた。wrangler.jsonc は secrets.required に同名を宣言しており、テストもその**宣言**を検査
// していたが、「宣言した secret が本番に実際に入っているか」は誰も見ていなかった。
// GitHub 側には check-actions-secrets.mjs --live があるのに Cloudflare 側に等価物が無い、という
// 非対称がこの穴の本体である。
//
// 発覚が遅れたのは middleware が fail-closed だったため。鍵が無いとき Bearer を cookie へ fallback
// させず principal=null に倒す設計は正しいが、副作用として「鍵が無い」と「token が不正」が同じ 401
// へ潰れ、設定漏れが障害として立ち上がらなかった。だから**投入そのもの**を機械で見る。
//
//   node scripts/ci/check-worker-secrets.mjs [--root <dir>] [--registry <path>] [--json <path>] [--live]
//
// --live は `wrangler secret list` を実行するため Cloudflare の認証 (CLOUDFLARE_API_TOKEN +
// CLOUDFLARE_ACCOUNT_ID、またはローカルの wrangler login) が要る。deploy より前に置くこと。
// 失敗しても本番は前進していないので、赤は「古い版が動き続ける」だけで済む。
//
// ## なぜ secret だけを見るのか (2026-08-02 の調査結果)
//
// 「宣言したのに本番に無い」が起きうるのは**帯域外 (out-of-band) の設定**、つまり `wrangler deploy` が
// 押し込まないものに限られる。本番設定面を棚卸しした結果は次のとおり。
//
//   帯域外 (乖離しうる → 検査が要る):
//     - Workers Secret            ... `wrangler secret put`。**このファイルが担当**
//     - R2 bucket                 ... 事前作成が必要。ただし未作成だと deploy 自体が失敗するので deploy が実質のゲート
//     - GitHub Actions secret/var ... check-actions-secrets.mjs --live が担当
//     - Turso migration           ... deploy job の drizzle migrate step が適用し、失敗すれば deploy が止まる
//   帯域内 (乖離しない → 検査しても意味が無い):
//     - vars / bindings / cron triggers / compatibility flags ... すべて wrangler.jsonc から deploy が押し込む
//
// つまり検査対象を増やすなら「帯域外なのに、失敗しても deploy が止まらないもの」を探すこと。
// 帯域内の設定に検査を足すと、設定ファイルを読んで設定ファイルと比べるだけの空回りになる。

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const DEFAULT_REGISTRY = join(HERE, 'worker-secrets-registry.json');
const REGISTRY_PATH = 'scripts/ci/worker-secrets-registry.json';
const WRANGLER_PATH = 'apps/hub/wrangler.jsonc';
// required だけが wrangler.jsonc の secrets.required と一致する。それ以外を宣言へ混ぜると
// 「未投入が恒常的な赤」になり、本当に足りない secret の検知が鈍る (共有 Google OIDC runbook S-02 と同じ判断)。
const VALID_REQUIREMENTS = new Set(['required', 'optional', 'planned', 'legacy']);

function parseArgs(argv) {
  const args = { root: REPO_ROOT, registry: DEFAULT_REGISTRY, json: null, live: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--root') args.root = resolve(argv[++i]);
    else if (argv[i] === '--registry') args.registry = resolve(argv[++i]);
    else if (argv[i] === '--json') args.json = resolve(argv[++i]);
    else if (argv[i] === '--live') args.live = true;
    else throw new Error(`未知の引数: ${argv[i]}`);
  }
  return args;
}

/** 台帳を読み、形式不備 (未知の requirement / 重複) はその場で落とす。 */
export function loadRegistry(registryPath) {
  const parsed = JSON.parse(readFileSync(registryPath, 'utf8'));
  /** @type {Map<string, {name: string, requirement: string, purpose: string, degrades: string, setup: string}>} */
  const registry = new Map();
  for (const entry of parsed.entries) {
    if (registry.has(entry.name)) throw new Error(`台帳に重複エントリがあります: ${entry.name}`);
    if (!VALID_REQUIREMENTS.has(entry.requirement)) {
      throw new Error(`台帳の requirement が不正です (${entry.name}): ${entry.requirement}`);
    }
    for (const field of ['purpose', 'degrades', 'setup']) {
      if (typeof entry[field] !== 'string' || entry[field].length === 0) {
        throw new Error(`台帳の ${field} が空です: ${entry.name}`);
      }
    }
    registry.set(entry.name, entry);
  }
  return registry;
}

/**
 * wrangler.jsonc が宣言している必須 secret 名を読む。
 * JSONC のため行コメントだけ落として JSON として解釈する
 * (apps/hub/tests/auth-tenancy/wrangler-production-auth-config.test.ts と同じ読み方に揃える)。
 */
export function readDeclaredRequired(wranglerPath) {
  const raw = readFileSync(wranglerPath, 'utf8');
  const parsed = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''));
  return parsed.secrets?.required ?? [];
}

/**
 * `wrangler secret list` の出力から JSON 配列だけを取り出す。
 *
 * wrangler は版バナーや更新告知を同じ stdout へ混ぜ、その中に `[WARNING]` のような角括弧が出る。
 * 最初の `[` から素朴に切ると壊れるので、**実際に配列として解釈できた最初の候補**を採る。
 */
export function extractSecretNames(stdout) {
  for (let start = stdout.indexOf('['); start !== -1; start = stdout.indexOf('[', start + 1)) {
    // JSON 配列の閉じ括弧は「stdout 全体の最後」とは限らない。wrangler が JSON の後ろへ
    // `[WARNING]` を出す版でも、各 `]` を短い候補から順に試せば実データだけを選べる。
    for (let end = stdout.indexOf(']', start + 1); end !== -1; end = stdout.indexOf(']', end + 1)) {
      let parsed;
      try {
        parsed = JSON.parse(stdout.slice(start, end + 1));
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;
      // 空配列 (secret が 1 件も無い本番) も正当な結果なので、要素の有無では弾かない
      if (parsed.every((item) => item !== null && typeof item === 'object' && typeof item.name === 'string')) {
        return parsed.map((item) => item.name);
      }
    }
  }
  throw new Error('wrangler secret list の出力を secret 一覧として解釈できません');
}

/** 本番 Worker へ実際に投入済みの secret 名を取る (--live 時のみ)。 */
function readConfiguredNames(root) {
  const stdout = execFileSync('pnpm', ['--filter', '@harness-hub/hub', 'exec', 'wrangler', 'secret', 'list'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return extractSecretNames(stdout);
}

/**
 * 台帳・wrangler.jsonc の宣言・(--live 時は) 実投入状況を突き合わせ、違反を列挙する。
 *
 * @param {Map<string, {name: string, requirement: string, purpose: string, degrades: string, setup: string}>} registry
 * @param {string[]} declared apps/hub/wrangler.jsonc の secrets.required
 * @param {string[] | null} configured --live 時のみ渡される実投入済みの名前。非 live では null
 * @returns {{kind: string, name: string, detail: string}[]} 違反 (空配列 = 合格)
 */
export function reconcile(registry, declared, configured) {
  /** @type {{kind: string, name: string, detail: string}[]} */
  const violations = [];
  const declaredSet = new Set(declared);

  // 方向 1: 台帳 → wrangler.jsonc。required は宣言と 1:1 で対応していなければならない。
  // ここがズレると「台帳では必須なのに deploy 設定は要求しない」secret が生まれる。
  for (const [name, entry] of registry) {
    const isRequired = entry.requirement === 'required';
    if (isRequired && !declaredSet.has(name)) {
      violations.push({
        kind: 'undeclared',
        name,
        detail: `台帳は required だが ${WRANGLER_PATH} の secrets.required に無い。宣言を実態へ合わせる`,
      });
    } else if (!isRequired && declaredSet.has(name)) {
      violations.push({
        kind: 'over-declared',
        name,
        detail: `台帳は ${entry.requirement} だが ${WRANGLER_PATH} が required として宣言している。未投入が恒常的な赤になるため、投入と同じ変更で台帳を required へ移すか宣言を外す`,
      });
    }
  }

  // 方向 2: wrangler.jsonc → 台帳。宣言だけ増えて説明が無い状態を残さない。
  for (const name of declared) {
    if (registry.has(name)) continue;
    violations.push({
      kind: 'undocumented-declaration',
      name,
      detail: `${WRANGLER_PATH} が宣言しているが台帳に無い。${REGISTRY_PATH} へ用途と縮退内容を追記する`,
    });
  }

  if (!configured) return violations;

  const pool = new Set(configured);

  // 方向 3 (--live): 台帳 → 実投入。o2i.13 の defect そのもの。
  // optional は縮退するだけ、legacy は用途未確定なので落とさない。planned は「投入されている方」が異常。
  for (const [name, entry] of registry) {
    if (entry.requirement === 'required' && !pool.has(name)) {
      violations.push({
        kind: 'not-configured',
        name,
        detail: `required だが本番 Worker へ未投入。影響: ${entry.degrades} / 投入: ${entry.setup}`,
      });
    }
    if (entry.requirement === 'planned' && pool.has(name)) {
      violations.push({
        kind: 'configured-planned',
        name,
        detail: `実装が参照していない (planned) のに投入済み。用途不明の有効な credential を残さないため、実装と同じ変更で required へ移すか削除する`,
      });
    }
  }

  // 方向 4 (--live): 実投入 → 台帳。「誰かが入れたが誰も説明していない」credential を可視化する。
  // docs/infrastructure-spec.md §2 の「この表にないものを Workers Secret に置かない」を機械で担保する。
  for (const name of pool) {
    if (registry.has(name)) continue;
    violations.push({
      kind: 'configured-undocumented',
      name,
      detail: `本番 Worker に投入済みだが台帳に無い。まだ要るなら ${REGISTRY_PATH} へ載せ、要らないなら \`pnpm --filter @harness-hub/hub exec wrangler secret delete ${name}\` で消す`,
    });
  }

  return violations;
}

function main() {
  const args = parseArgs(process.argv);
  const wranglerPath = join(args.root, 'apps', 'hub', 'wrangler.jsonc');
  if (!existsSync(wranglerPath)) {
    console.error(`[worker-secrets] NG: ${WRANGLER_PATH} が見つかりません (root=${args.root})`);
    process.exit(1);
  }

  const registry = loadRegistry(args.registry);
  const declared = readDeclaredRequired(wranglerPath);

  let configured = null;
  let liveError = null;
  if (args.live) {
    try {
      configured = readConfiguredNames(args.root);
    } catch (error) {
      // 認証不足やネットワーク断で「検査できなかった」を「合格」と読み替えない。
      // deploy より前に置いてあるので、ここで止めても本番は古い版のまま動き続ける。
      liveError = (error?.stderr?.toString() || error?.message || String(error))
        .trim()
        .split('\n')
        .slice(-6)
        .join('\n');
    }
  }

  const violations = liveError
    ? [
        {
          kind: 'live-query-failed',
          name: '(wrangler secret list)',
          detail: `実投入状況を取得できませんでした。CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID と token の Workers Scripts 権限を確認する。出力末尾: ${liveError}`,
        },
      ]
    : reconcile(registry, declared, configured);

  const result = {
    scanned_root: args.root,
    registry: args.registry,
    live: args.live,
    registry_count: registry.size,
    declared_count: declared.length,
    configured_count: configured?.length ?? null,
    violation_count: violations.length,
    violations,
  };
  if (args.json) {
    mkdirSync(dirname(args.json), { recursive: true });
    writeFileSync(args.json, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (violations.length === 0) {
    console.log(
      `[worker-secrets] OK: 台帳 ${registry.size} 件と ${WRANGLER_PATH} の宣言 ${declared.length} 件が一致しています` +
        (args.live ? ` (本番 Worker の実投入 ${configured.length} 件も確認済み)` : ''),
    );
    process.exit(0);
  }
  console.error(`[worker-secrets] NG: ${violations.length} 件の違反を検出しました`);
  for (const v of violations) console.error(`  - [${v.kind}] ${v.name}: ${v.detail}`);
  console.error(`  台帳: ${REGISTRY_PATH} / 散文の正本: docs/infrastructure-spec.md §2`);
  process.exit(1);
}

// テストからは reconcile / extractSecretNames を直接呼ぶため、CLI 実行時のみ main を走らせる
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
