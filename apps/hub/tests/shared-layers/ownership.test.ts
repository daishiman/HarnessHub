// HF-A4-OWNER-001: shared-layers 登録層すべてに owner / 公開 API / consumer が定義され、owner 未定義が 0 件であること
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/ci/check-shared-layer-duplicates.mjs');
const REGISTRY = path.join(REPO_ROOT, 'scripts/ci/shared-layer-registry.json');

interface LayerReport {
  id: string;
  owner_package: string;
  package_name: string | null;
  owner_exists: boolean;
  public_api: string[];
  consumers: string[];
  boundary_only: boolean;
}

const workDirs: string[] = [];

/** detector の --report で E1 証跡 (owner / 公開 API / consumer 一覧) を生成して読む。 */
function generateReport(): { layers: LayerReport[] } {
  const dir = mkdtempSync(path.join(tmpdir(), 'hub-ownership-'));
  workDirs.push(dir);
  const reportPath = path.join(dir, 'shared-layer-ownership.json');
  execFileSync(process.execPath, [SCRIPT, '--report', reportPath, '--no-fail'], { encoding: 'utf8' });
  return JSON.parse(readFileSync(reportPath, 'utf8')) as { layers: LayerReport[] };
}

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe('HF-A4-OWNER-001: 登録共通層の owner 一覧', () => {
  const report = generateReport();
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8')) as { layers: unknown[] };

  it('登録簿の全層が報告に含まれる', () => {
    expect(report.layers).toHaveLength(registry.layers.length);
  });

  it('owner 未定義 (owner_package 不在) の層が 0 件である', () => {
    const missing = report.layers.filter((layer) => !layer.owner_exists);
    expect(missing.map((l) => l.id)).toEqual([]);
  });

  it('全層に consumer が 1 系統以上定義されている', () => {
    const noConsumer = report.layers.filter((layer) => layer.consumers.length === 0);
    expect(noConsumer.map((l) => l.id)).toEqual([]);
  });

  it('boundary_only でない層は公開 API を 1 件以上持つ', () => {
    // packages/db は feat-domain-model-db 完了まで境界と型のみ (ADR §11.3-7)
    const empty = report.layers.filter((layer) => !layer.boundary_only && layer.public_api.length === 0);
    expect(empty.map((l) => l.id)).toEqual([]);
  });

  it('package 化された層は @harness-hub/ 名前空間を持つ (ADR §11.3-2 の公開 contract 規約)', () => {
    const packaged = report.layers.filter((layer) => layer.owner_package.startsWith('packages/'));
    expect(packaged.length).toBeGreaterThan(0);
    for (const layer of packaged) {
      expect(layer.package_name).toMatch(/^@harness-hub\//);
    }
  });
});
