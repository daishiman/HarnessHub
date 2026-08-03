// P04 テストスタブ (SYS-FEEDBACK-LOOP-P04)
// two-route-single-resource: CLI (Bearer=harness) / Web (session=manual) の 2 経路が
// 単一資源 `feedbacks` に正規化されること (B6/I12)。
//
// ADR §2 は「source は principal 種別から自動導出し、クライアント申告値を受理しない」と決めている。
// したがって受入契約はまず契約レベルで固定できる: createFeedbackRequestSchema に `source` を
// 含めることを禁止し (.strict() が拒否する)、source の分岐はレスポンス表現 (feedbackSourceSchema) の
// 列挙だけで表現されることを検証する。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFeedbackRequestSchema, feedbackSourceSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

const APP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const routeSource = () => readFileSync(path.resolve(APP_SRC, 'app/api/v1/feedback/route.ts'), 'utf8');

describe('two-route-single-resource: 2 経路の単一資源正規化', () => {
  it('FL-B6-001: createFeedbackRequestSchema は source フィールドを持たない (クライアント申告を拒否)', () => {
    const withSource = {
      project_id: 'proj-1',
      type: 'improvement',
      priority: 'medium',
      body: '本文',
      source: 'harness',
    };

    const result = createFeedbackRequestSchema.safeParse(withSource);

    expect(result.success).toBe(false);
  });

  it('FL-B6-002: source は harness/manual の 2 値だけを許可する (principal 導出の受け皿)', () => {
    expect(feedbackSourceSchema.safeParse('harness').success).toBe(true);
    expect(feedbackSourceSchema.safeParse('manual').success).toBe(true);
    expect(feedbackSourceSchema.safeParse('cli').success).toBe(false);
  });

  it('FL-B6-003: 正規の CLI/Web リクエストはどちらも同じ createFeedbackRequestSchema を満たす', () => {
    const cliShaped = { project_id: 'proj-1', type: 'bug', priority: 'high', body: '再現手順' };
    const webShaped = { project_id: 'proj-2', type: 'review', priority: 'low', body: 'レビュー依頼' };

    expect(createFeedbackRequestSchema.safeParse(cliShaped).success).toBe(true);
    expect(createFeedbackRequestSchema.safeParse(webShaped).success).toBe(true);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---
  // POST /api/v1/feedback ハンドラが Bearer=harness と session=manual の両方から
  // 同一ハンドラ・同一テーブルへ書き込むことは、ルート実装が存在しないため現時点では検証できない。
  describe('P05 実装後: ルートハンドラの経路別 principal 判定', () => {
    it('FL-B6-101: Bearer=harness リクエストは source=harness で永続化される', () => {
      const route = routeSource();
      expect(route).toContain("credential === 'access_token' ? 'harness' : 'manual'");
      expect(route).toContain('source: deriveSource(authz.principal.credential)');
    });

    it('FL-B6-102: session=manual リクエストは source=manual で永続化される', () => {
      const route = routeSource();
      // deriveSource は credential==='access_token' 以外 (session を含む) を一律 manual へ写像する。
      const fn = route.slice(route.indexOf('function deriveSource'), route.indexOf('export const POST'));
      expect(fn).toContain("return credential === 'access_token' ? 'harness' : 'manual';");
    });

    it('FL-B6-103: 経路によらず feedbacks テーブルの 1 レコードにしか書き込まれない (別資源へ分岐しない)', () => {
      const route = routeSource();
      expect(route).toContain('feedbackLoopRuntime().service.createFeedback');
      // POST ハンドラ内に別 runtime/別サービスへの分岐が無いことを確認する
      // (authRuntime() は認可判定専用で書き込み先を分岐させない)。
      const handler = route.slice(route.indexOf('export const POST'), route.indexOf('export const GET'));
      expect(handler.match(/feedbackLoopRuntime\(\)/g)).toEqual(['feedbackLoopRuntime()']);
      expect(handler).not.toContain('hearingIntakeRuntime');
    });
  });
});
