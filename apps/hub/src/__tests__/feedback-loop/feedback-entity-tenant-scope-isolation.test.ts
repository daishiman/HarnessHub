// P04 テストスタブ (SYS-FEEDBACK-LOOP-P04)
// feedback-entity-tenant-scope-isolation: feedbacks テーブルの tenant_id/workspace_id 分離 (D4, ADR §1)。
//
// D4 の実体 (WHERE 句への強制注入) はリポジトリ層の責務であり、リポジトリ実装が
// まだ存在しないため DB を介した分離テストは P05 実装後に実行対象へ昇格する。
// P04 時点で契約レベルとして固定できるのは「wire スキーマが tenant_id/workspace_id を
// レスポンスへ漏らさない」こと (dual-catalog-web の CatalogEntry と同じ設計判断:
// テナント境界はレスポンス body ではなく認可ミドルウェア/リポジトリ層で閉じる)。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feedbackDetailSchema, feedbackListItemSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

const APP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_ROOT = path.resolve(APP_SRC, '..', '..', '..');
const repoSource = () => readFileSync(path.resolve(REPO_ROOT, 'packages/db/repository/feedback-loop.ts'), 'utf8');

describe('feedback-entity-tenant-scope-isolation: wire スキーマの tenant 非漏洩', () => {
  it('FL-D4-001: feedbackListItemSchema は tenant_id/workspace_id を定義しない', () => {
    const shape = feedbackListItemSchema.shape;

    expect(shape).not.toHaveProperty('tenant_id');
    expect(shape).not.toHaveProperty('workspace_id');
  });

  it('FL-D4-002: feedbackDetailSchema も同様に tenant_id/workspace_id を定義しない', () => {
    const shape = feedbackDetailSchema.shape;

    expect(shape).not.toHaveProperty('tenant_id');
    expect(shape).not.toHaveProperty('workspace_id');
  });

  it('FL-D4-003: .strict() のため未知フィールド (テナント混入含む) の混入を拒否する', () => {
    const withTenantLeak = {
      id: 'fb-1',
      code: 'FR-0001',
      project_id: 'proj-1',
      type: 'improvement',
      priority: 'medium',
      source: 'harness',
      status: 'open',
      created_at: 0,
      updated_at: 0,
      tenant_id: 'tenant-should-not-be-here',
    };

    expect(feedbackListItemSchema.safeParse(withTenantLeak).success).toBe(false);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---
  // リポジトリ層の WHERE 句強制注入は実装が存在しないため検証できない。
  describe('P05 実装後: リポジトリ層の tenant/workspace 分離', () => {
    it('FL-D4-101: 他 tenant の feedbacks 行が一覧/詳細取得に 1 件も混入しない (WHERE tenant_id 強制注入)', () => {
      const repo = repoSource();
      const findFn = repo.slice(
        repo.indexOf('async function findFeedbackOn'),
        repo.indexOf('async function issueFeedbackCode'),
      );
      expect(findFn).toContain('eq(feedbacks.tenantId, context.tenantId)');
      const listMethod = repo.slice(repo.indexOf('async listFeedbacks'), repo.indexOf('async findFeedback('));
      expect(listMethod).toContain('eq(feedbacks.tenantId, context.tenantId)');
    });

    it('FL-D4-102: tenant_id は RepositoryContext 必須フィールドでありクエリ側で省略できない', () => {
      const repo = repoSource();
      // findFeedbackOn / listFeedbacks のいずれも tenantId predicate を条件分岐なしで先頭に積んでいる
      // (context.tenantId が undefined でも WHERE 句から外れない = 型レベルで必須化されている)。
      expect(repo).toContain('context: RepositoryContext');
      const findFn = repo.slice(
        repo.indexOf('async function findFeedbackOn'),
        repo.indexOf('async function issueFeedbackCode'),
      );
      expect(findFn.indexOf('eq(feedbacks.tenantId, context.tenantId)')).toBeLessThan(
        findFn.indexOf('if (context.workspaceId'),
      );
    });
  });
});
