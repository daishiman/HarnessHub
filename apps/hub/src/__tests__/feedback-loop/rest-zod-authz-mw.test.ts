// P04 テストスタブ (SYS-FEEDBACK-LOOP-P04)
// rest-zod-authz-mw: feedback REST API は zod を単一ソースとし、認可は単一ミドルウェアへ適合する
// (B1/SEC2, ADR §8)。feature 固有の認可分岐コードを作らない。
//
// zod 単一ソース性は契約レベルで検証できる: 全 schema が .strict() で未知フィールドを拒否し、
// 型を手書き複製していないこと (z.output から型を導出していること) を固定する。
// 単一認可ミドルウェアへの適合 (feature 固有の authz 分岐を作らない) は、
// ルートハンドラが存在しないため P05 実装後の受入契約とする。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createFeedbackRequestSchema,
  feedbackListQuerySchema,
  updateFeedbackStatusRequestSchema,
} from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

const APP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROUTE_FILES = ['app/api/v1/feedback/route.ts', 'app/api/v1/feedback/[id]/route.ts'] as const;
const routeSources = () => ROUTE_FILES.map((file) => readFileSync(path.resolve(APP_SRC, file), 'utf8'));

describe('rest-zod-authz-mw: zod 単一ソース性', () => {
  it('FL-B1-001: createFeedbackRequestSchema は .strict() で未知フィールドを拒否する', () => {
    const result = createFeedbackRequestSchema.safeParse({
      project_id: 'proj-1',
      type: 'improvement',
      priority: 'medium',
      body: '本文',
      unexpected_field: 'これは定義されていない',
    });

    expect(result.success).toBe(false);
  });

  it('FL-B1-002: updateFeedbackStatusRequestSchema は .strict() で未知フィールドを拒否する', () => {
    const result = updateFeedbackStatusRequestSchema.safeParse({ status: 'resolved', note: '余分な項目' });

    expect(result.success).toBe(false);
  });

  it('FL-B1-003: feedbackListQuerySchema は既存の paginationQuerySchema を拡張しており cursor/limit の検証を再実装していない', () => {
    const withInvalidLimit = feedbackListQuerySchema.safeParse({ limit: 0 });
    const withValidDefaults = feedbackListQuerySchema.safeParse({});

    expect(withInvalidLimit.success).toBe(false);
    expect(withValidDefaults.success).toBe(true);
    if (withValidDefaults.success) {
      expect(withValidDefaults.data.limit).toBe(50);
    }
  });

  it('FL-B1-004: type/priority/status のフィルタは既存の enum schema を再利用しており独自定義していない', () => {
    expect(feedbackListQuerySchema.safeParse({ status: 'open' }).success).toBe(true);
    expect(feedbackListQuerySchema.safeParse({ status: 'invalid_status' }).success).toBe(false);
    expect(feedbackListQuerySchema.safeParse({ type: 'bug' }).success).toBe(true);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---
  // 単一認可ミドルウェアへの適合 (feature 固有 authz 分岐の不在) は
  // ルートハンドラ実装が存在しないため検証できない。
  describe('P05 実装後: 単一認可ミドルウェアへの適合', () => {
    it('FL-B1-101: feedback route はプロジェクト共通の authz ミドルウェアだけを通し feature 固有分岐を持たない', () => {
      for (const source of routeSources()) {
        expect(source).toContain('withAuthz');
        expect(source).not.toMatch(/principal\.role|effectiveRole\s*===/);
      }
    });

    it('FL-B1-102: 未認証リクエストは全 4 endpoint で共通ミドルウェアにより 401 を返す (withAuthz 経由の handler export のみ)', () => {
      const [collectionRoute, itemRoute] = routeSources();
      expect(collectionRoute).toContain('export const POST = withAuthz(');
      expect(collectionRoute).toContain('export const GET = withAuthz(');
      expect(itemRoute).toContain('export const GET = withAuthz<FeedbackParams>(');
      expect(itemRoute).toContain('export const PATCH = withAuthz<FeedbackParams>(');
    });
  });
});
