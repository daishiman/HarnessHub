// DMDB-T14: 手順書に載っている CLI 呼び出しが「書かれたまま」実行できることを検証する。
//
// DMDB-T12 は CLI を `node --import tsx <script>` で直接叩き cwd も packages/db 固定で呼ぶため、
// 「実装が動く」ことしか示さない。運用者が実際に打つのは runbook の `pnpm --filter ... exec ...` 形で、
// こちらは pnpm 10 の `--` 透過と `--filter` の cwd 差で落ちていた (HarnessHub-0yvi)。
// 実装と手順書のどちらが動くかは別の事実なので、手順書の側も実走で押さえる。

// biome-ignore-all lint/suspicious/noTemplateCurlyInString: shell fixture 内の `${stamp}` は JavaScript でなく、障害を再現する shell 変数参照

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedTwoTenants } from './fixtures/two-tenants';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

const PKG_ROOT = join(import.meta.dirname, '..');
const REPO_ROOT = join(PKG_ROOT, '..', '..');
const RUNBOOK = 'docs/features/feat-domain-model-db/runbook.md';

/**
 * CLI 呼び出しを載せうる場所を走査対象にする。固定リストにすると新しい文書が検査から漏れるため、
 * 「どこに書いても検査される」形にして、リストの更新忘れという別の欠陥を作らない。
 */
const SCAN_ROOTS = ['docs', 'packages/db/scripts', '.github/workflows'] as const;
const SCAN_EXTENSIONS = ['.md', '.ts', '.mjs', '.yml'] as const;

/**
 * パスを値に取るオプション。`pnpm --filter` は対象 package を cwd にして子プロセスを起動するため、
 * ここへ相対パスを書くと呼び出し元 (リポジトリ根・workflow の step) の基準と食い違って必ず外れる。
 * `--file` は wrangler r2 object put/get 用。
 */
const PATH_OPTIONS = new Set(['--out', '--in', '--ddl', '--migrations-dir', '--file', '--tombstone-manifest']);

const readSource = (relPath: string): string => readFileSync(join(REPO_ROOT, relPath), 'utf8');

/**
 * 検査対象にする「コマンド面」を切り出す。
 *
 * `.md` は fenced code block の中だけを見る。散文や表に埋まった `pnpm ...` は
 * 「過去こう打って失敗した」という実測記録であることが多く (release-record.md の F-2、
 * final-review-notes.md の F-02 がまさにそれ)、壊れた書き方を証拠として引用している。
 * ここを直すと記録が起きた事実と食い違うため、記録は記録のまま残すのが正しい。
 * 逆に、運用者がコピペして打つ手順は常に code block の側にある。
 * → **手順として打たせたいコマンドは code block に書く** ことが、この検査を効かせる前提になる。
 *
 * `.yml` / `.ts` / `.mjs` は全体が実行される物なので、そのまま全文を対象にする。
 */
function commandSurface(relPath: string, text: string): string {
  if (!relPath.endsWith('.md')) return text;
  const fenced: string[] = [];
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) fenced.push(line);
  }
  return fenced.join('\n');
}

/** 走査対象のファイルを相対パスで列挙する。 */
function scanTargets(): string[] {
  return SCAN_ROOTS.flatMap((root) =>
    readdirSync(join(REPO_ROOT, root), { recursive: true, encoding: 'utf8' })
      .filter((rel) => SCAN_EXTENSIONS.some((ext) => rel.endsWith(ext)))
      .map((rel) => join(root, rel)),
  );
}

/**
 * 文書から `pnpm --filter <pkg> (run|exec) ...` の呼び出しを 1 行へ畳んで拾う。
 * 行継続 (`\` 改行) と、コード引用の飾り (`//` `#` `>` `-`) は剥がして素のコマンドに戻す。
 *
 * package も `run` / `exec` も限定しない。cwd がずれる原因は `--filter` そのもの (対象 package を
 * cwd にして子プロセスを起動する) であって、呼び方や package の別ではないため。
 * 実際 backup.yml の `--filter @harness-hub/hub exec wrangler` が同じ理由で壊れていた。
 */
function documentedInvocations(text: string): string[] {
  return text
    .replace(/\\\n\s*(?:\/\/\s*)?/g, ' ')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\/\/|#|>|-)\s*/, '').trim())
    .filter((line) => /\bpnpm\s+--filter\s+\S+\s+(?:run|exec)\s/.test(line));
}

/** 素の shell 代入。`NAME=value` の 1 行だけを見る (env 前置きコマンドを誤検出しないよう行末まで要求する)。 */
const PLAIN_ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=("[^"]*"|'[^']*'|\S*)\s*$/;
/** GitHub Actions の step 間受け渡し。`echo "NAME=value" >> "$GITHUB_ENV"` も代入として扱う。 */
const ACTIONS_ENV_EXPORT = /^\s*echo\s+"([A-Za-z_][A-Za-z0-9_]*)=([^"]*)"\s*>>\s*"?\$\{?GITHUB_ENV\}?"?\s*$/;

/**
 * 同一ファイル内の変数代入を集める。
 *
 * `--file "$LOCAL_PATH"` のように値を変数へ逃がすと、相対パスかどうかが呼び出し行から消える。
 * main に land していた backup.yml の欠陥がまさにこの形で
 * (`echo "LOCAL_PATH=backup/${stamp}.sql.gz" >> "$GITHUB_ENV"` → `--file "$LOCAL_PATH"`)、
 * 変数を追わない検査は「値が `$` で始まるから安全」と読み違えて素通しする。
 */
function assignedValues(text: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const line of text.split('\n')) {
    const match = ACTIONS_ENV_EXPORT.exec(line) ?? PLAIN_ASSIGNMENT.exec(line);
    if (!match) continue;
    vars.set(match[1] as string, (match[2] as string).replace(/^["']|["']$/g, ''));
  }
  return vars;
}

/**
 * 値の先頭にある変数参照を、解決できる間だけ展開する。
 * 判定に効くのは先頭 (絶対パスか相対パスか) だけなので、全置換ではなく先頭だけを繰り返し剥がす。
 * 同一ファイルで解決できない名前 (`$GITHUB_WORKSPACE` など外から与えられる値) はそこで打ち切り、
 * 判断材料が無いものを違反にはしない。
 */
function expandLeadingVars(value: string, vars: Map<string, string>): string {
  let expanded = value;
  for (let hop = 0; hop < 4; hop += 1) {
    const ref = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}|^\$([A-Za-z_][A-Za-z0-9_]*)/.exec(expanded);
    const resolved = ref ? vars.get((ref[1] ?? ref[2]) as string) : undefined;
    if (!ref || resolved === undefined) break;
    expanded = resolved + expanded.slice(ref[0].length);
  }
  return expanded;
}

/**
 * 読み手の cwd に依存しない値かどうか。
 * `--filter` 経由の子プロセスは対象 package を cwd にして走るため、
 * 呼び出し元 (リポジトリ根・workflow の step) 基準の相対パスを書くと必ず外れる。
 */
function isCwdIndependentValue(value: string): boolean {
  const bare = value.replace(/^["']|["']$/g, '');
  if (bare === '') return true; // usage 表記の末尾など、値が続かないケースは検査対象外
  return (
    bare.startsWith('$') || // 環境変数
    bare.startsWith('<') || // プレースホルダ
    bare.startsWith('[') || // usage 表記の任意オプション
    bare.startsWith('/') // 絶対パス
  );
}

/**
 * 手順書中で当該 script を呼ぶ行を 1 本に特定する。
 *
 * 0 本 / 複数本はどちらも手順書側の欠陥として落とす。0 本なら検査対象を見失っていて
 * (このテストが「何も検査せず緑」になる)、複数本なら運用者がどれを打つべきか決まらないうえ、
 * 片方だけ直す片肺修正でいずれ食い違う。
 */
function invocationOf(text: string, scriptPath: string): string {
  const found = documentedInvocations(text).filter((line) => line.includes(scriptPath));
  if (found.length !== 1) {
    throw new Error(`${scriptPath} の呼び出しが手順書で 1 本に定まりません (${found.length} 本)`);
  }
  return found[0] as string;
}

let workDir: string;
let srcPath: string;

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'dmdb-runbook-'));
  srcPath = join(workDir, 'runbook-src.db');
  const srcDb = await createLibsqlTestDb(`file:${srcPath}`);
  await seedTwoTenants(asCore(srcDb), testCipher(asCore(srcDb)));
  srcDb.close();
}, 60_000);

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('DMDB-T14 手順書の CLI 呼び出しが実行可能であること', () => {
  it('runbook §1 の export → §2 の manifest 抽出 → restore が、書かれたコマンドのまま exit 0 で完走する', () => {
    const runbook = commandSurface(RUNBOOK, readSource(RUNBOOK));
    const targetPath = join(workDir, 'runbook-target.db');

    // 手順書の行をそのまま並べて実行する。書き換えるのは環境変数の中身だけで、
    // コマンド本体 (区切り `--` の有無・パスの基準) には一切手を入れない。
    // §1 の export と §2 の manifest 抽出・restore が同じ `$WORK_DIR/export.jsonl` を介して
    // 噛み合うことが手順書側の設計で、噛み合っていなければこの実走がそのまま落ちる。
    const drill = [
      'set -eu',
      `WORK_DIR=${JSON.stringify(workDir)}`,
      invocationOf(runbook, 'scripts/export-control-plane.ts'),
      invocationOf(runbook, 'scripts/extract-tenant-data-tombstones.ts'),
      invocationOf(runbook, 'scripts/restore-control-plane.ts'),
    ].join('\n');

    const output = execFileSync('sh', ['-c', drill], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        TURSO_DATABASE_URL: `file:${srcPath}`,
        DRILL_DATABASE_URL: `file:${targetPath}`,
      },
    });

    // restore CLI は report を stdout の最終 JSON 行へ出す。ok=true / chainOk=true が drill 成功の条件。
    const reportLine = output
      .trim()
      .split('\n')
      .filter((line) => line.startsWith('{'))
      .at(-1);
    const report = JSON.parse(reportLine as string) as { ok: boolean; chainOk: boolean };
    expect(report.ok).toBe(true);
    expect(report.chainOk).toBe(true);
  }, 180_000);

  // 実走できるのは runbook の 1 本だけなので、他の文書は静的不変条件で押さえる。
  // 「動く 1 本」と「壊れた書き方を増やさない」は別の保証で、後者はこちらが担う。
  it('文書中の CLI 呼び出しが、pnpm 10 で壊れる書き方を含まない', () => {
    const offenders: string[] = [];
    const inspected: string[] = [];

    for (const relPath of scanTargets()) {
      const surface = commandSurface(relPath, readSource(relPath));
      const vars = assignedValues(surface);

      for (const invocation of documentedInvocations(surface)) {
        inspected.push(relPath);
        const tokens = invocation.split(/\s+/);

        // pnpm 10 は `run <script> -- <args>` の `--` を剥がさず子プロセスへそのまま渡す。
        // 受け側の parseArgs は strict なので、`--` 以降が positional 扱いになって即死する (HarnessHub-0yvi)。
        if (tokens.includes('--')) {
          offenders.push(`${relPath}: 区切り \`--\` が混じっている → ${invocation}`);
        }

        for (const [i, token] of tokens.entries()) {
          if (!PATH_OPTIONS.has(token)) continue;
          const value = tokens[i + 1] ?? '';
          const actual = expandLeadingVars(value.replace(/^["']|["']$/g, ''), vars);
          if (isCwdIndependentValue(actual)) continue;
          const shown = actual === value ? value : `${value} = ${actual}`;
          offenders.push(`${relPath}: ${token} の値が cwd 依存の相対パス (${shown}) → ${invocation}`);
        }
      }
    }

    expect(offenders).toEqual([]);

    // 「0 件検査して緑」を緑と見なさない。呼び出し形が `run <script>` から `exec tsx <script>` へ
    // 変わったとき、対象を拾えなくなったまま合格し続ける状態に実際になりかけた。
    // 検査対象が空になったこと自体を失敗として扱い、この検査の無力化を検知する。
    expect(inspected.length).toBeGreaterThan(0);

    // backup.yml の `--filter @harness-hub/hub exec wrangler --file <相対パス>` が
    // まさにこの型の欠陥だったため、workflow を必ず 1 本以上見ていることを明示的に押さえる。
    expect(inspected.filter((relPath) => relPath.startsWith('.github/workflows/'))).not.toEqual([]);
  });

  // 検出力の裏取り。上の検査は「違反が無い」ことしか示さず、検査が壊れて何も見なくなった場合も同じ緑になる。
  // main へ実際に land していた欠陥をそのまま食わせて、検知できる状態が保たれていることを別途押さえる。
  it('変数へ逃がした相対パスを見逃さない (main の backup.yml で実際に起きた形)', () => {
    const pathArgOf = (source: string): string => {
      const tokens = (documentedInvocations(source)[0] as string).split(/\s+/);
      const raw = tokens[tokens.indexOf('--file') + 1] as string;
      return expandLeadingVars(raw.replace(/^["']|["']$/g, ''), assignedValues(source));
    };

    // 欠陥版: `--file "$LOCAL_PATH"` の実体はリポジトリ根基準の相対パス。
    // wrangler は cwd = apps/hub で起動するので apps/hub/backup/... を探し、upload も検証も落ちる。
    const landed = [
      'stamp="$(date -u +%Y-%m-%d)"',
      'echo "LOCAL_PATH=backup/${stamp}.sql.gz" >> "$GITHUB_ENV"',
      'pnpm --filter @harness-hub/hub exec wrangler r2 object put \\',
      '  "harness-hub-backups/$OBJECT_KEY" --file "$LOCAL_PATH" --remote',
    ].join('\n');
    expect(pathArgOf(landed)).toBe('backup/${stamp}.sql.gz');
    expect(isCwdIndependentValue(pathArgOf(landed))).toBe(false);

    // 是正版: 実体が `$GITHUB_WORKSPACE` 起点の絶対パスなら、cwd がどこでも同じ物を指す。
    const fixed = landed.replace('LOCAL_PATH=backup/', 'LOCAL_PATH=$GITHUB_WORKSPACE/backup/');
    expect(isCwdIndependentValue(pathArgOf(fixed))).toBe(true);
  });
});
