// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-METRICS-*: 個別ダッシュボードが読む metrics_rollups (dim=user) の実装有無確認 (P03 申し送り事項2)。
//
// design-review-notes.md 指摘事項4: AD-2 の個別ダッシュボード (S17) は `metrics_rollups` (dim=user) の
// 読取りを前提としているが、`packages/db/schema`・`packages/db/repository` のいずれにも実装が存在しない
// (owner は feat-metrics-tracking)。AD-4 (`tenant_coefficients`) と同型の cross-feature 依存だが、
// AD-2 側には同水準の明示的な手当てが無いと P03 が指摘した。
//
// このテストは「未実装なら P05 着手前に確認が必要」という P03 の申し送りを、実行するたびに
// 実際のファイルシステムを検査して固定する契約テストである。it.todo にしないのは、この確認自体が
// 実行可能でなければならない (「確認した」という宣言だけでは P05 が見落とせてしまう) ため。
//
// 実装された場合はこのテストが赤くなる。赤くなったら本ファイルを更新し、consumer 契約テストへ昇格させること。

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const DB_SCHEMA_DIR = path.join(REPO_ROOT, 'packages/db/schema');
const DB_REPOSITORY_DIR = path.join(REPO_ROOT, 'packages/db/repository');

/** ディレクトリ配下 (再帰) のファイル内に metrics_rollups への言及があるか。無ければ空配列。 */
function findFilesContaining(dir: string, needle: string): string[] {
  if (!existsSync(dir)) return [];
  const hits: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...findFilesContaining(full, needle));
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    const content = readFileSync(full, 'utf8');
    if (content.includes(needle)) hits.push(path.relative(REPO_ROOT, full));
  }
  return hits;
}

describe('契約: metrics_rollups の実装有無確認 (P03 指摘事項4 / cross-feature 依存)', () => {
  it('UOA-METRICS-001: packages/db/schema に metrics_rollups の定義が無い (現時点の既知状態)', () => {
    const hits = findFilesContaining(DB_SCHEMA_DIR, 'metrics_rollups');
    // このテストが失敗した = feat-metrics-tracking 側の実装が現れた、という合図。
    // その場合は本ファイルを「実 port を消費する契約テスト」へ書き換える (it.todo の昇格)。
    expect(hits).toStrictEqual([]);
  });

  it('UOA-METRICS-002: packages/db/repository に metrics_rollups を読む repository が無い (現時点の既知状態)', () => {
    const hits = findFilesContaining(DB_REPOSITORY_DIR, 'metrics_rollups');
    expect(hits).toStrictEqual([]);
  });

  it('UOA-METRICS-003 (Goodhart対策): 走査対象ディレクトリ自体は実在し、既存の別テーブル定義は検出できる (空振り検出でないことの確認)', () => {
    expect(existsSync(DB_SCHEMA_DIR)).toBe(true);
    // tenant_coefficients (AD-4 で既存確認済み) は同じ走査ロジックで見つかるはずで、
    // 「metrics_rollups が 0 件」が「検査していない」の言い換えになっていないことを保証する。
    const tenantCoefficientsHits = findFilesContaining(DB_SCHEMA_DIR, 'tenant_coefficients');
    expect(tenantCoefficientsHits.length).toBeGreaterThan(0);
  });
});

describe('P05 着手前の確認事項 (実装対象のため it.todo)', () => {
  it.todo(
    'UOA-METRICS-101: feat-metrics-tracking 側で metrics_rollups の実装が確定した後、個別ダッシュボードが dim=user の rollup を読む port 消費契約を追加する (AD-4 と同型: 集計のみ消費し本 feature は算出しない)',
  );
  it.todo(
    'UOA-METRICS-102: UOA-METRICS-101 が確定するまで、個別ダッシュボードの rollup 表示部分は P05 実装から除外するか、feat-metrics-tracking への cross-feature follow-up を dev-graph 依存関係として明示する (design-review-notes.md 指摘事項4 のフォロー)',
  );
});
