// 走査範囲 (I/O 層) の単体テスト。
// 「走査範囲が黙って縮んで検出 0 件になる」= 偽の緑が最も危険な故障なので、範囲決定を重点的に検証する。

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { collectSecretScanFiles } from './secret-scan-fs';
import { scanFilesForSecrets, secretScanExitCode } from './secret-scan-preset';

/** 検出パターンに一致するダミー値。ソース上に連続した形で置かないため連結で組み立てる。 */
const DUMMY_AWS_KEY = `AKIA${'1234567890ABCDEF'}`;

function write(root: string, relativePath: string, content: string): void {
  const absolute = join(root, relativePath);
  mkdirSync(join(absolute, '..'), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

describe('collectSecretScanFiles: workspace root を指した場合', () => {
  let root = '';

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'harness-scan-ws-'));
    write(root, 'pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n');
    write(root, 'apps/hub/app.ts', 'export const a = 1;\n');
    write(root, 'packages/ui/index.ts', 'export const b = 2;\n');
    write(root, 'scripts/ci/check.mjs', 'export const c = 3;\n');
    write(root, '.github/workflows/ci.yml', 'name: ci\n');
    // 走査対象外のディレクトリ
    write(root, 'docs/sample.ts', 'export const d = 4;\n');
    write(root, 'apps/hub/node_modules/dep/index.ts', 'export const e = 5;\n');
    write(root, 'apps/hub/dist/bundle.js', 'export const f = 6;\n');
    // 走査対象外の拡張子
    write(root, 'apps/hub/readme.md', '# doc\n');
  });

  it('SECRET_SCAN_DIRECTORIES 配下だけを、宣言順に集める', () => {
    const paths = collectSecretScanFiles(root).map((file) => file.path);
    expect(paths).toStrictEqual([
      'apps/hub/app.ts',
      'packages/ui/index.ts',
      'scripts/ci/check.mjs',
      '.github/workflows/ci.yml',
    ]);
  });

  it('node_modules・生成物・対象外拡張子を除外する', () => {
    const paths = collectSecretScanFiles(root).map((file) => file.path);
    expect(paths.some((path) => path.includes('node_modules'))).toBe(false);
    expect(paths.some((path) => path.includes('dist/'))).toBe(false);
    expect(paths.some((path) => path.endsWith('.md'))).toBe(false);
  });

  it('走査順が決定的である', () => {
    expect(collectSecretScanFiles(root)).toStrictEqual(collectSecretScanFiles(root));
  });
});

describe('collectSecretScanFiles: 部分木を指した場合', () => {
  let root = '';

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'harness-scan-sub-'));
    // workspace root ではないが、たまたま scripts/ を持つ package を模した構成
    write(root, 'package.json', '{"name":"pkg"}\n');
    write(root, 'scripts/tool.mjs', 'export const a = 1;\n');
    write(root, 'src/app.ts', 'export const b = 2;\n');
  });

  it('root 全体を走査する (同名ディレクトリがあっても範囲を縮めない)', () => {
    const paths = collectSecretScanFiles(root).map((file) => file.path);
    expect(paths).toStrictEqual(['package.json', 'scripts/tool.mjs', 'src/app.ts']);
  });
});

describe('走査 + 判定の結合 (ゲートが素通りしない証明)', () => {
  it('植え込んだ秘密情報を検出し、終了コードが非ゼロになる', () => {
    const root = mkdtempSync(join(tmpdir(), 'harness-scan-leak-'));
    write(root, 'src/leak.ts', `const id = "${DUMMY_AWS_KEY}";\n`);

    const files = collectSecretScanFiles(root);
    const result = scanFilesForSecrets(files);

    expect(files.length).toBeGreaterThan(0);
    expect(result.verdict).toBe('fail');
    expect(result.findings[0]?.ruleId).toBe('secret-scan/aws-access-key-id');
    expect(result.findings[0]?.location?.path).toBe('src/leak.ts');
    expect(secretScanExitCode(result)).toBe(1);
  });

  it('秘密情報が無ければ終了コード 0', () => {
    const root = mkdtempSync(join(tmpdir(), 'harness-scan-clean-'));
    write(root, 'src/app.ts', 'export const greeting = "hello";\n');

    const result = scanFilesForSecrets(collectSecretScanFiles(root));
    expect(result.findings).toStrictEqual([]);
    expect(secretScanExitCode(result)).toBe(0);
  });
});
