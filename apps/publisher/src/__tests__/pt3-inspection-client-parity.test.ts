/**
 * PT3: inspection-client 判定同値・owner 境界。
 * 対応: docs/features/feat-publisher-plugin/test-design.md §PT3, AD-3, acceptance 2。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createPublishInspectionRules, type InspectionFile, runInspection } from '@harness-hub/inspection';
import { describe, expect, it } from 'vitest';

import { runLocalPreCheck } from '../inspection-client/index.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HUB_PACKAGE_INSPECTION = join(REPO_ROOT, 'apps/hub/src/lib/publish/package-inspection.ts');
const PUBLISHER_SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function collectTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('PT3-A Publisher context / Hub context の verdict 一致 (acceptance 2)', () => {
  const files: InspectionFile[] = [
    {
      path: '.claude-plugin/plugin.json',
      content: JSON.stringify({ name: 'demo', version: '1.0.0', description: 'd' }),
    },
    { path: 'SKILL.md', content: '# demo skill' },
  ];

  it('inspection-client/ (Publisher) は packages/inspection の createPublishInspectionRules をそのまま呼ぶ', () => {
    const viaPublisher = runLocalPreCheck(files);
    const viaDirectCall = runInspection(createPublishInspectionRules(), { files, metadata: {} });
    expect(viaPublisher).toEqual(viaDirectCall);
  });

  it('Hub 側 (apps/hub/src/lib/publish/package-inspection.ts) も同一の createPublishInspectionRules を経由する (回帰確認)', () => {
    // apps/hub は Next.js app であり apps/publisher から runtime import しない (アプリ境界を跨がない)。
    // 「二つの呼び出し経路が同一関数に収束している」ことは、両者が同じ合成関数
    // (createPublishInspectionRules → runInspection) を呼んでいることの静的確認で担保する
    // (test-design.md PT3-A: 「二つの呼び出し経路が同一関数に収束していることの回帰確認に限定する」)。
    const hubSource = readFileSync(HUB_PACKAGE_INSPECTION, 'utf-8');
    expect(hubSource).toMatch(/createPublishInspectionRules/);
    expect(hubSource).toMatch(/runInspection\(createPublishInspectionRules\(\)/);
  });
});

describe('PT3-B 二重実装がないことの構造テスト', () => {
  it('inspection-client/ が severity 分岐ロジックを再実装していない (packages/inspection の import のみ)', () => {
    const source = readFileSync(join(PUBLISHER_SRC, 'inspection-client', 'index.ts'), 'utf-8');
    expect(source).not.toMatch(/severity\s*(===|==)\s*['"](error|warn|info)['"]/);
    expect(source).not.toMatch(/case ['"](error|warn|info)['"]/);
  });

  it('apps/publisher の write scope に Hub 側 API (publish/:id/submit 等) の実装ファイルが存在しない', () => {
    const routeHandlerFiles = collectTsFiles(PUBLISHER_SRC).filter((path) => {
      const source = readFileSync(path, 'utf-8');
      return /export (async )?function (GET|POST|PUT|PATCH|DELETE)\(/.test(source);
    });
    expect(routeHandlerFiles).toEqual([]);
  });
});
