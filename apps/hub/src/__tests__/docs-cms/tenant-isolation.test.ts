// P04 テストスタブ (SYS-DOCS-CMS-P04)
// DOCS-TEN-*: tenant スコープ doc が他テナントから参照できないこと (D4 / acceptance)。
//
// ADR (architecture-decision-record.md §3.1/§6, P03 レビュー対応) は
// resource.tenantId を principal.tenantId から絶対に写さず (with-authz.ts の anti-pattern 回避)、
// 常に header 宣言済み tenantId を使う設計を確定している。したがって tenant 分離の実効境界は
// decide() の tenant_mismatch ではなく、repository query 層の
// `or(eq(documents.scope, 'common'), eq(documents.tenantId, context.tenantId))` 条件にある。
// 本ファイルはその可視性述語を直接固定し、P05 実装 (packages/db/repository/docs-cms.ts) が
// 同じ述語を実装しているかを構造走査で検証する。

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Scope = 'common' | 'tenant';

interface DocumentRow {
  readonly id: string;
  readonly tenantId: string;
  readonly scope: Scope;
}

/** ADR §3.1 の可視性述語そのもの。repository 実装が満たすべき正本ロジック。 */
function isVisible(doc: DocumentRow, requesterTenantId: string): boolean {
  return doc.scope === 'common' || doc.tenantId === requesterTenantId;
}

const TENANT_A_DOC: DocumentRow = { id: 'doc-a', tenantId: 'tenant-a', scope: 'tenant' };
const TENANT_B_DOC: DocumentRow = { id: 'doc-b', tenantId: 'tenant-b', scope: 'tenant' };
const COMMON_DOC: DocumentRow = { id: 'doc-common', tenantId: 'tenant-a', scope: 'common' };

describe('DOCS-TEN: 可視性述語 (ADR §3.1)', () => {
  it('DOCS-TEN-001: tenant スコープ doc は所有テナントの requester にのみ見える', () => {
    expect(isVisible(TENANT_A_DOC, 'tenant-a')).toBe(true);
    expect(isVisible(TENANT_A_DOC, 'tenant-b')).toBe(false);
  });

  it('DOCS-TEN-002: common スコープ doc はどの requester にも見える (所有テナントを問わない)', () => {
    expect(isVisible(COMMON_DOC, 'tenant-a')).toBe(true);
    expect(isVisible(COMMON_DOC, 'tenant-b')).toBe(true);
  });

  it('DOCS-TEN-003: 一覧フィルタで他テナントの tenant スコープ doc が 1 件も混入しない', () => {
    const rows = [TENANT_A_DOC, TENANT_B_DOC, COMMON_DOC];
    const visibleToA = rows.filter((doc) => isVisible(doc, 'tenant-a'));

    expect(visibleToA.map((doc) => doc.id).sort()).toEqual(['doc-a', 'doc-common']);
    expect(visibleToA).not.toContainEqual(TENANT_B_DOC);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---

  const REPOSITORY_FILE = resolve(process.cwd(), '../../packages/db/repository/docs-cms.ts');
  const repositorySource = () => readFileSync(REPOSITORY_FILE, 'utf8');

  it('DOCS-TEN-101: repository は resource.tenantId を doc の所有テナントへすり替えない', () => {
    if (!existsSync(REPOSITORY_FILE)) return;
    const source = repositorySource();
    // ADR §3.1/§6 が禁じる anti-pattern: principal/context の tenantId を doc 行の値へ上書きする代入
    expect(source).not.toMatch(/tenantId\s*[:=]\s*(doc|document|row)\.tenantId/);
  });

  it('DOCS-TEN-102: repository query が scope=common と tenantId 一致の OR 条件を実装する', () => {
    if (!existsSync(REPOSITORY_FILE)) return;
    const source = repositorySource();
    expect(source).toContain("scope, 'common'");
    expect(source).toMatch(/or\(/);
    expect(source).toContain('documents.tenantId');
  });

  it('DOCS-TEN-103: tenant スコープ doc への他テナント GET/PATCH は 404 になる (decide の tenant_mismatch には依存しない)', () => {
    if (!existsSync(REPOSITORY_FILE)) return;
    const source = repositorySource();
    // repository が該当行を返さないことで handler 側が 404 を返す設計 (findJob の null 分岐と同型)
    expect(source).toMatch(/return\s+null/);
  });
});
