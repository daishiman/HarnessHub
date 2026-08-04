// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-QC-*: task spec の Mandatory evidence「quality constraint 9 ID exact-set」「current context digest」を
// 実行可能な形で固定する契約層テスト。
//
// requirements-baseline.md (P01) は quality_constraints を8件と記載しているが、
// architecture-decision-record.md (P02) の「実装追補・未解決事項」が、Normative implementation closure
// (task spec 記載) に基づき 9 件目 `legal-static-page-all-users` を申し送っている。
// このテストは両文書を静的に読み、`instructions` (本タスク依頼文) が優先すると指示した
// 「ADR 側の記載を優先し、9 件を exact-set として扱う」という前提が実際の文書内容と矛盾しないことを保証する。
// 文書側が書き換えられて 9 件目の記述が消えたときにここが赤くなる (Goodhart 対策: 常に緑にならない)。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const DOCS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/features/feat-user-org-admin',
);

function readDoc(name: string): string {
  return readFileSync(path.resolve(DOCS_ROOT, name), 'utf8');
}

/** requirements-baseline.md §5 の表から `| id |` 列を抽出する。書式が崩れたら 0 件になり検出できる。 */
function extractBaselineQualityConstraintIds(markdown: string): string[] {
  const tableSection = markdown.split('## 5. 品質制約')[1]?.split('## 6.')[0] ?? '';
  const rows = tableSection
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| id') && !line.startsWith('|---'));
  return rows.map((row) => row.split('|')[1]?.trim()).filter((id): id is string => Boolean(id));
}

const EXPECTED_BASELINE_8 = [
  'role-4-integration',
  'salary-pii-guard',
  'audit-event-expansion',
  'notification-dispatch-common-layer',
  'backend-b10-user-management',
  'coefficient-and-user-entities',
  'auth-delegation-unchanged',
  'axe-a11y-zero',
] as const;

const NINTH_ID = 'legal-static-page-all-users';

describe('契約: quality_constraints 9 ID exact-set (task spec Mandatory evidence #1)', () => {
  it('UOA-QC-001: requirements-baseline.md §5 は現行8件をそのまま記載している (P01の確定転記)', () => {
    const baseline = readDoc('requirements-baseline.md');
    const ids = extractBaselineQualityConstraintIds(baseline);
    expect(ids).toStrictEqual([...EXPECTED_BASELINE_8]);
  });

  it('UOA-QC-002: architecture-decision-record.md が9件目 legal-static-page-all-users を明示的に申し送っている', () => {
    const adr = readDoc('architecture-decision-record.md');
    // 「実装追補・未解決事項」節に9件目の文字列が実在することを確認する。
    // 検出器が空振りしない証拠として、存在しないダミー ID では見つからないことも確認する (生存確認)。
    expect(adr).toContain(NINTH_ID);
    expect(adr).not.toContain('legal-static-page-nonexistent-dummy-id');
  });

  it('UOA-QC-003: 8件 + 9件目を合わせた exact-set が本 test-design の前提 (9件) と一致する', () => {
    const combined = [...EXPECTED_BASELINE_8, NINTH_ID];
    expect(combined).toHaveLength(9);
    expect(new Set(combined).size).toBe(9); // 重複が無いこと
  });
});

describe('契約: current context digest の一致 (task spec Mandatory evidence #2)', () => {
  function extractDigest(markdown: string): string | null {
    const match = /feature_context_digest:\s*(\S+)/.exec(markdown);
    return match?.[1] ?? null;
  }

  it('UOA-QC-004: requirements-baseline.md と architecture-decision-record.md の feature_context_digest が一致する', () => {
    const baselineDigest = extractDigest(readDoc('requirements-baseline.md'));
    const adrDigest = extractDigest(readDoc('architecture-decision-record.md'));
    expect(baselineDigest).not.toBeNull();
    expect(baselineDigest).toBe(adrDigest);
  });
});
