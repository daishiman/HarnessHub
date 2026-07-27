#!/usr/bin/env node
// GitHub Actions の secret / variable 設定検査。
//
// 背景 (HarnessHub-fnzl): actions/secrets=0 のまま hub-backup が 4 夜連続で落ち、本番 Worker も未デプロイだった。
// backup.yml は「runbook §1 の手順で設定してください」と案内していたが、その §1 には backup 系の secret が
// 1 つも書かれていなかった。つまり「どの workflow が何を要求するか」の台帳が実態と乖離しており、
// 設定漏れを誰も突き合わせられない状態が defect の本体だった。
//
// 本検査は台帳 (actions-secrets-registry.json) と workflow の実参照を双方向で突合し、乖離を fail-closed で落とす。
// --live を付けると gh CLI 経由で「実際に投入済みか」まで見る (認証が要るのでローカル/手動運用向け)。
//
//   node scripts/ci/check-actions-secrets.mjs [--root <dir>] [--registry <path>] [--json <path>] [--live]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const DEFAULT_REGISTRY = join(HERE, 'actions-secrets-registry.json');
const CONTEXT_TO_KIND = { secrets: 'secret', vars: 'variable' };
const VALID_REQUIREMENTS = new Set(['required', 'optional', 'auto']);

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

// GitHub Actions が実際に評価する `${{ secrets.X }}` / `${{ vars.X }}` だけを拾う。
// 散文コメントの `secrets.X` まで数えると、実参照を削除してもコメントだけで台帳が緑になるため。
const REFERENCE_PATTERN = /\$\{\{\s*(secrets|vars)\.([A-Za-z_][A-Za-z0-9_]*)\b/g;

/**
 * workflow YAML が参照している secret / variable を集める。
 * @returns {Map<string, {kinds: string[], workflows: string[]}>}
 */
function scanWorkflowReferences(workflowsDir) {
  /** @type {Map<string, {kinds: string[], workflows: string[]}>} */
  const referenced = new Map();
  if (!existsSync(workflowsDir)) return referenced;
  for (const file of readdirSync(workflowsDir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort()) {
    const text = readFileSync(join(workflowsDir, file), 'utf8');
    // コメントアウト済み step に式が残っていても Actions は評価しない。
    const activeText = text
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n');
    for (const [, context, name] of activeText.matchAll(REFERENCE_PATTERN)) {
      const kind = CONTEXT_TO_KIND[context];
      const entry = referenced.get(name) ?? { kinds: [], workflows: [] };
      if (!entry.kinds.includes(kind)) entry.kinds.push(kind);
      if (!entry.workflows.includes(file)) entry.workflows.push(file);
      referenced.set(name, entry);
    }
  }
  return referenced;
}

/** 台帳を読み、形式不備 (未知の requirement / 重複) はその場で落とす。 */
function loadRegistry(registryPath) {
  const parsed = JSON.parse(readFileSync(registryPath, 'utf8'));
  /** @type {Map<string, {name: string, kind: string, requirement: string, workflows: string[], purpose: string, setup: string}>} */
  const registry = new Map();
  for (const entry of parsed.entries) {
    if (registry.has(entry.name)) throw new Error(`台帳に重複エントリがあります: ${entry.name}`);
    if (!VALID_REQUIREMENTS.has(entry.requirement)) {
      throw new Error(`台帳の requirement が不正です (${entry.name}): ${entry.requirement}`);
    }
    registry.set(entry.name, entry);
  }
  return registry;
}

/**
 * gh CLI 経由で実際に投入済みの名前を取る (--live 時のみ)。
 *
 * `gh secret list --json` / `gh variable` はどちらも比較的新しい gh でしか使えず、
 * 手元の 2.20.0 では前者が `unknown flag`、後者は `unknown command` で落ちる。
 * REST API を直接叩けば gh のサブコマンド表面の変化から独立するので、`gh api` に寄せる。
 */
function readConfiguredNames() {
  const list = (endpoint, key) =>
    execFileSync('gh', ['api', `repos/:owner/:repo/actions/${endpoint}`, '--paginate', '--jq', `.${key}[].name`], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  return { secret: list('secrets', 'secrets'), variable: list('variables', 'variables') };
}

/**
 * 台帳・workflow の実参照・(--live 時は) 実投入状況を突き合わせ、違反を列挙する。
 *
 * @param {Map<string, {kinds: string[], workflows: string[]}>} referenced
 *   workflow が実際に参照している名前 → { kinds: ['secret'|'variable'], workflows: 参照している workflow ファイル名 }
 * @param {Map<string, {name: string, kind: string, requirement: string, workflows: string[], purpose: string, setup: string}>} registry
 *   台帳のエントリ。requirement は 'required' | 'optional' | 'auto'
 * @param {{secret: string[], variable: string[]} | null} configured
 *   --live 時のみ渡される、実際に投入済みの名前。非 live では null
 * @returns {{kind: string, name: string, detail: string}[]} 違反 (空配列 = 合格)
 */
function reconcile(referenced, registry, configured) {
  /** @type {{kind: string, name: string, detail: string}[]} */
  const violations = [];
  const registryPath = 'scripts/ci/actions-secrets-registry.json';

  // 方向 1: workflow → 台帳。「使っているのに載っていない」が fnzl の defect そのもの。
  for (const [name, ref] of referenced) {
    const entry = registry.get(name);
    const where = ref.workflows.join(' / ');

    if (!entry) {
      violations.push({
        kind: 'undocumented',
        name,
        detail: `${where} が参照しているが台帳に無い。${registryPath} へ用途と requirement を追記する`,
      });
      continue;
    }

    // 同名を `secrets.X` と `vars.X` の両方で読むと、どちらへ投入すべきか決められない。
    // 先に見つけた context だけを採用すると workflow の走査順で結果が変わるため、明示的に落とす。
    if (ref.kinds.length > 1) {
      violations.push({
        kind: 'reference-kind-conflict',
        name,
        detail: `${where} が同じ名前を secrets / vars の両方で参照している。GitHub 上では別の入れ物なので 1 種類へ統一する`,
      });
    } else if (!ref.kinds.includes(entry.kind)) {
      // GitHub 上 secret と variable は別の入れ物で、投入先を間違えると読めない。
      const actualKind = ref.kinds[0];
      const context = actualKind === 'secret' ? 'secrets' : 'vars';
      violations.push({
        kind: 'kind-mismatch',
        name,
        detail: `台帳は ${entry.kind} だが ${where} は \`${context}.${name}\` で参照している。投入先が食い違うため、どちらかへ揃える`,
      });
    }

    // 台帳の workflows 欄が実態とずれると「どこに影響するか」を追えなくなる。両方向で見る。
    const undeclared = ref.workflows.filter((w) => !entry.workflows.includes(w));
    const stale = entry.workflows.filter((w) => !ref.workflows.includes(w));
    if (undeclared.length > 0 || stale.length > 0) {
      const parts = [];
      if (undeclared.length > 0) parts.push(`台帳に無い参照元: ${undeclared.join(' / ')}`);
      if (stale.length > 0) parts.push(`実際には参照していない: ${stale.join(' / ')}`);
      violations.push({
        kind: 'workflow-drift',
        name,
        detail: `${parts.join(' / ')}。${registryPath} の workflows 欄を実態へ合わせる`,
      });
    }
  }

  // 方向 2: 台帳 → workflow。参照ゼロの項目を残すと「投入すれば効く」と誤読される。
  for (const name of registry.keys()) {
    if (referenced.has(name)) continue;
    violations.push({
      kind: 'unreferenced',
      name,
      detail: `台帳にあるがどの workflow も参照していない。使わなくなったなら ${registryPath} から削除し、これから使うなら参照する workflow と同じ変更で追加する`,
    });
  }

  // 方向 3 (--live のみ): 台帳 → 実投入。required だけを落とす。
  // optional は未投入でも workflow は成功する (縮退するだけ)、auto は Actions が自動注入するため、
  // ここで落とすと「直しようのない赤」を作ってしまい、ゲートが無視される方向へ効く。
  if (configured) {
    const pools = { secret: new Set(configured.secret), variable: new Set(configured.variable) };
    for (const [name, entry] of registry) {
      if (entry.requirement !== 'required') continue;
      if (pools[entry.kind]?.has(name)) continue;
      violations.push({
        kind: 'not-configured',
        name,
        detail: `required だが未投入 (${entry.kind})。用途: ${entry.purpose} / 投入: ${entry.setup}`,
      });
    }

    // 方向 4 (--live のみ): 実投入 → 台帳。REST の一覧に出るのは人が入れた物だけ (GITHUB_TOKEN のような
    // 自動注入分は含まれない) なので、台帳に無い名前は「誰かが入れたが誰も説明していない」状態そのもの。
    // 放置すると、用途不明の credential が有効なまま残り、rotate も revoke も判断できなくなる。
    for (const [kind, names] of Object.entries(pools)) {
      for (const name of names) {
        const entry = registry.get(name);
        if (entry?.kind === kind) continue;
        if (entry) {
          violations.push({
            kind: 'configured-kind-mismatch',
            name,
            detail: `GitHub に ${kind} として投入済みだが台帳は ${entry.kind}。同名でも別の入れ物なので、誤った ${kind} 側を削除する`,
          });
          continue;
        }
        violations.push({
          kind: 'configured-undocumented',
          name,
          detail: `GitHub に ${kind} として投入済みだが台帳に無い。まだ要るなら ${registryPath} と参照 workflow へ載せ、要らないなら \`gh api -X DELETE repos/:owner/:repo/actions/${kind === 'secret' ? 'secrets' : 'variables'}/${name}\` で消す`,
        });
      }
    }
  }

  return violations;
}

function main() {
  const args = parseArgs(process.argv);
  const referenced = scanWorkflowReferences(join(args.root, '.github', 'workflows'));
  const registry = loadRegistry(args.registry);
  const configured = args.live ? readConfiguredNames() : null;
  const violations = reconcile(referenced, registry, configured) ?? [];

  const result = {
    scanned_root: args.root,
    registry: args.registry,
    live: args.live,
    referenced_count: referenced.size,
    registry_count: registry.size,
    violation_count: violations.length,
    violations,
  };
  if (args.json) {
    mkdirSync(dirname(args.json), { recursive: true });
    writeFileSync(args.json, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (violations.length === 0) {
    console.log(
      `[actions-secrets] OK: workflow の参照 ${referenced.size} 件と台帳 ${registry.size} 件が一致しています` +
        (args.live ? ' (実投入状況も確認済み)' : ''),
    );
    process.exit(0);
  }
  console.error(`[actions-secrets] NG: ${violations.length} 件の違反を検出しました`);
  for (const v of violations) console.error(`  - [${v.kind}] ${v.name}: ${v.detail}`);
  console.error(
    '  台帳: scripts/ci/actions-secrets-registry.json / 投入手順: docs/features/feat-hub-foundation/runbook.md §1',
  );
  process.exit(1);
}

main();
