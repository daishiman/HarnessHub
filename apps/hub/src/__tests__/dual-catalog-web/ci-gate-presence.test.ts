/**
 * DC-CI-01..05: 品質ゲートが CI に「リリース条件として」存在すること (qa-018 / P03 指摘 R8)。
 *
 * acceptance 1 の「axe 違反 0 がリリース条件」は、検査が書かれているだけでは成立しない。
 * 落ちたら赤になり、指しているテスト・script が実在して初めて条件になる。そこまでを固定する。
 */
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/hub-web-quality-gate.yml');
const CI_PATH = path.join(REPO_ROOT, '.github/workflows/ci.yml');
const CATALOG_TEST_DIR = 'src/__tests__/dual-catalog-web';

async function readWorkflow(): Promise<string> {
  return readFile(WORKFLOW_PATH, 'utf8');
}

/**
 * コメント行を落とす。「continue-on-error を置かないこと」のような**禁止事項の説明**が
 * 禁止語の検出に引っかかると、正しい注意書きを消すことで緑になる歪んだ圧力が生まれる。
 */
function withoutComments(workflow: string): string {
  return workflow
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

/** `run:` で実際に実行される行だけを取り出す (コメントや step 名の文言を検査対象に混ぜない)。 */
function runCommands(workflow: string): string[] {
  const commands: string[] = [];
  let inRunBlock = false;

  for (const line of workflow.split('\n')) {
    const single = /^\s*run:\s*(\S.*)$/.exec(line);
    if (single !== null) {
      commands.push(single[1] ?? '');
      inRunBlock = false;
      continue;
    }
    if (/^\s*run:\s*[|>]/.test(line)) {
      inRunBlock = true;
      continue;
    }
    if (inRunBlock) {
      // 次の key が始まったら run ブロックの終わり
      if (/^\s*(-\s)?[a-z-]+:/.test(line)) inRunBlock = false;
      else if (line.trim() !== '') commands.push(line.trim());
    }
  }
  return commands;
}

describe('DC-CI / ゲートの存在', () => {
  it('DC-CI-01: hub-web-quality-gate.yml が存在する', async () => {
    await expect(access(WORKFLOW_PATH)).resolves.toBeUndefined();
    const workflow = await readWorkflow();
    expect(workflow).toContain('name: hub-web-quality-gate');
    // pull_request で走らないゲートはマージ前の条件にならない
    expect(workflow).toContain('pull_request:');
  });

  it('DC-CI-02: catalog 契約テストを実行する step を持つ', async () => {
    const commands = runCommands(await readWorkflow());
    const testCommand = commands.find((command) => command.includes(CATALOG_TEST_DIR));
    expect(testCommand, 'catalog テストを実行する run が無い').toBeDefined();
    expect(testCommand).toContain('vitest run');

    // 指し先が実在し、中身があること。空ディレクトリを指していても CI は緑になる
    const files = await readdir(path.join(REPO_ROOT, 'apps/hub', CATALOG_TEST_DIR));
    expect(files.filter((file) => file.endsWith('.test.ts') || file.endsWith('.test.tsx')).length).toBeGreaterThan(0);
  });

  it('DC-CI-03: client JS 予算チェックを実行する step を持つ', async () => {
    const commands = runCommands(await readWorkflow());
    expect(commands.some((command) => command.includes('check:client-bundle'))).toBe(true);
    // 予算は build 成果物を読む。build せずに実行すると計測不能のまま通り抜ける
    expect(commands.some((command) => command.includes('pnpm -r build'))).toBe(true);

    // 呼んでいる script が実在すること
    const hubPackage = JSON.parse(await readFile(path.join(REPO_ROOT, 'apps/hub/package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(hubPackage.scripts['check:client-bundle']).toBeDefined();
  });
});

describe('DC-CI / 失敗が伝播すること', () => {
  it('DC-CI-04: continue-on-error を持たない', async () => {
    const workflow = withoutComments(await readWorkflow());
    // 落ちても赤にならないゲートは「検査済み」という誤った安心だけを生む
    expect(workflow).not.toContain('continue-on-error');
    // 同様に `|| true` や `--passWithNoTests` も失敗を握り潰す
    for (const suppression of ['|| true', '|| exit 0', 'passWithNoTests']) {
      expect(workflow, `失敗を握り潰す指定がある (${suppression})`).not.toContain(suppression);
    }
  });
});

describe('DC-CI / 既存ゲートとの非重複', () => {
  it('DC-CI-05: ci.yml の G9 / G13 を再実装しない', async () => {
    const ci = await readFile(CI_PATH, 'utf8');
    // 共通ゲートの唯一の実装は ci.yml 側にあり続けること (移設・削除されていない)
    expect(ci).toContain('G9 axe a11y');
    expect(ci).toContain('G13 client JS 予算');
    expect(ci).toContain('pnpm --filter @harness-hub/hub run check:client-bundle');

    const commands = runCommands(await readWorkflow());
    // G9 (部品単体 + 画面結合の a11y) を二重に走らせない。catalog 固有の a11y は
    // 契約テスト側 (catalog-a11y.test.tsx) が持つ
    expect(commands.some((command) => command.includes('test:a11y'))).toBe(false);

    // G13 は同一 script を呼ぶ。閾値や計測方法を yml 側へ書き写すと実装が 2 つになる
    const bundleCommands = commands.filter((command) => command.includes('client-bundle'));
    expect(bundleCommands).toHaveLength(1);
    expect(bundleCommands[0]).toBe('pnpm --filter @harness-hub/hub run check:client-bundle');

    // 検査ロジックを yml へ直書きしない (script 呼び出しに閉じる)
    for (const inline of ['node -e', 'gzip -c', 'du -b', 'awk ']) {
      expect(
        commands.some((command) => command.includes(inline)),
        `検査ロジックを workflow へ直書きしている (${inline})`,
      ).toBe(false);
    }
  });
});
