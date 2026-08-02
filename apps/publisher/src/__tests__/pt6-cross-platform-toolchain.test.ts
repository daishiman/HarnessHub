/**
 * PT6: cross-platform toolchain (qa-043)。
 * 対応: docs/features/feat-publisher-plugin/test-design.md §PT6, acceptance 1。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { runInitialPublishTimebox } from './support/e2e-fixture.js';

const PACKAGE_JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');

describe('PT6-A pnpm script の OS 非依存性', () => {
  const scripts: Record<string, string> = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8')).scripts;

  it('package.json の scripts 文字列にハードコードされた \\ path 区切りが含まれない', () => {
    for (const command of Object.values(scripts)) {
      expect(command).not.toMatch(/\\/);
    }
  });

  it('package.json の scripts 文字列に POSIX シェル依存構文 (&&, ||, $()) を直接埋め込んでいない', () => {
    for (const command of Object.values(scripts)) {
      expect(command).not.toMatch(/&&|\|\||\$\(/);
    }
  });
});

describe('PT6-B macOS/Windows 両実機での publish E2E 成功 (acceptance 1)', () => {
  it('macOS: 初回 publish が exit code 0 相当で完了し Hub への登録が確認できる (PT4-D と同一の実行)', async () => {
    const { result } = await runInitialPublishTimebox();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.status).toBe('published');
      expect(result.deployedUrl).toBe('https://demo.example.workers.dev');
    }
  });

  it.todo(
    'Windows 実機: この開発環境には実機が存在しないため自動テスト対象外。' +
      'test-run-results.md の手動実施用再現手順書を参照する (2026-08-02 作者確認)',
  );
});
