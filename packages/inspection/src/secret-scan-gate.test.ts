// G6 secret scan ゲート。qa-038【2】が「publish pipeline と同一の検査ロジック共有 package を CI からも呼ぶ」と
// 確定しているため、CI はこの package の実装を経由して秘密情報を検査する (= CI が実在する第 2 consumer)。
// 検出 0 件で pass、1 件以上で fail (fail-closed)。
//
// ルール束と走査実装は secret-scan-preset.ts / secret-scan-fs.ts に一元化してある。
// CLI (scripts/scan-secrets.mjs) も同じ 2 module を呼ぶため、この test と CLI で判定が食い違うことはない。
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { collectSecretScanFiles } from './secret-scan-fs';
import { scanFilesForSecrets, secretScanExitCode } from './secret-scan-preset';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');

describe('G6 secret scan: Hub monorepo に秘密情報が混入していない', () => {
  const files = collectSecretScanFiles(REPO_ROOT);
  const result = scanFilesForSecrets(files);

  it('走査が空振りしていない', () => {
    // 0 ファイルでも「検出 0 件」になるため、空振りによる偽の緑を排除する
    expect(files.length).toBeGreaterThan(50);
  });

  it('検出 0 件である', () => {
    const detected = result.findings.map(
      (finding) => `${finding.location?.path}:${finding.location?.line} ${finding.message}`,
    );
    expect(detected).toEqual([]);
    expect(result.verdict).toBe('pass');
    expect(secretScanExitCode(result)).toBe(0);
  });
});
