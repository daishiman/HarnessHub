// secret scan CLI の実体。走査は src/secret-scan-fs.ts、判定は src/secret-scan-preset.ts に委譲し、
// ここは引数で受けた root の処理と証跡 JSON の出力だけを持つ。
// 単体では実行せず、scripts/scan-secrets.mjs から vitest 経由で起動される (buildless で TS を実行するため)。

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { expect, it } from 'vitest';

import { collectSecretScanFiles } from '../src/secret-scan-fs';
import { scanFilesForSecrets, secretScanExitCode } from '../src/secret-scan-preset';

const root = resolve(process.env['HARNESS_SECRET_SCAN_ROOT'] ?? process.cwd());
const jsonPath = process.env['HARNESS_SECRET_SCAN_JSON'];
/** 空振り (0 ファイル) による偽の緑を防ぐ下限。--root で部分木を指す場合に備えて既定は緩めに取る。 */
const minimumFiles = Number(process.env['HARNESS_SECRET_SCAN_MIN_FILES'] ?? '1');

it('secret scan: 検出 0 件 (G6 / qa-038【2】)', () => {
  expect(existsSync(root), `走査対象が存在しません: ${root}`).toBe(true);

  const files = collectSecretScanFiles(root);
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

  // 走査が空振りしていないこと自体を検査する (0 ファイルなら検出 0 件になり偽の緑になるため)。
  expect(files.length).toBeGreaterThanOrEqual(minimumFiles);
  expect(result.findings).toStrictEqual([]);
  expect(exitCode).toBe(0);
});
