// secret scan の I/O シェル。判定は src/secret-scan-preset.ts の純関数に委譲し、ここは走査と出力だけを持つ。
// 単体では実行せず、scripts/scan-secrets.mjs から vitest 経由で起動される (buildless で TS を実行するため)。

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { expect, it } from 'vitest';

import { scanFilesForSecrets, secretScanExitCode } from '../src/secret-scan-preset';
import type { InspectionFile } from '../src/types';

/** 走査対象外。生成物・VCS・依存など「リポジトリの管理対象でないもの」だけを外す。 */
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  '.open-next',
  '.wrangler',
  '.turbo',
  '.vercel',
  'dist',
  'build',
  'coverage',
  'artifacts',
]);

/** テキストとして読めないファイル。内容比較ではなく拡張子で外す (誤検出ではなく走査効率の問題)。 */
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.svgz',
  '.pdf', '.zip', '.gz', '.tgz', '.br', '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.mov', '.mp3', '.wav', '.db', '.sqlite', '.wasm', '.node', '.lockb',
]);

/** 1 ファイルの上限。これを超えるものは生成物とみなす (実ソースで 2MiB を超えることは想定しない)。 */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function extensionOf(path: string): string {
  const index = path.lastIndexOf('.');
  return index < 0 ? '' : path.slice(index).toLowerCase();
}

/** 走査対象ファイルを列挙する。並び順を固定して判定を決定的にする。 */
function collectFiles(root: string): InspectionFile[] {
  const files: InspectionFile[] = [];

  const walk = (directory: string): void => {
    const entries = readdirSync(directory, { withFileTypes: true })
      .slice()
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          walk(absolute);
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (BINARY_EXTENSIONS.has(extensionOf(entry.name))) {
        continue;
      }
      if (statSync(absolute).size > MAX_FILE_BYTES) {
        continue;
      }
      files.push({
        path: relative(root, absolute),
        content: readFileSync(absolute, 'utf8'),
      });
    }
  };

  walk(root);
  return files;
}

const root = resolve(process.env['HARNESS_SECRET_SCAN_ROOT'] ?? process.cwd());
const jsonPath = process.env['HARNESS_SECRET_SCAN_JSON'];

it('secret scan: 検出 0 件 (G6 / qa-038【2】)', () => {
  expect(existsSync(root), `走査対象が存在しません: ${root}`).toBe(true);

  const files = collectFiles(root);
  const result = scanFilesForSecrets(files);
  const exitCode = secretScanExitCode(result);

  if (jsonPath !== undefined && jsonPath !== '') {
    const target = resolve(jsonPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(
      target,
      `${JSON.stringify(
        {
          root,
          scannedFileCount: files.length,
          verdict: result.verdict,
          findingCount: result.findings.length,
          evaluatedRuleIds: result.evaluatedRuleIds,
          findings: result.findings,
          exitCode,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }

  console.log(
    `[secret-scan] root=${root} files=${files.length} findings=${result.findings.length} verdict=${result.verdict}`,
  );
  for (const finding of result.findings) {
    console.log(
      `[secret-scan] ${finding.location?.path}:${finding.location?.line}:${finding.location?.column} ${finding.ruleId} ${finding.message}`,
    );
  }

  expect(result.findings).toStrictEqual([]);
  expect(exitCode).toBe(0);
});
