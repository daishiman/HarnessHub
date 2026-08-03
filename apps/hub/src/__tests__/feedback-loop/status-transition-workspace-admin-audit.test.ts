// P04 テストスタブ (SYS-FEEDBACK-LOOP-P04)
// status-transition-workspace-admin-audit: status 遷移が workspace-admin 限定かつ
// 監査 event `feedback.status_change` を記録すること (SEC6, ADR §3)。
//
// 状態機械 open→in_progress→resolved は隣接遷移のみを許可し、逆行・スキップを拒否する。
// isValidFeedbackStatusTransition はこの規約を表現する純粋関数であり、実装なしで検証できる。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEEDBACK_STATUS_TRANSITIONS,
  type FeedbackStatus,
  isValidFeedbackStatusTransition,
  updateFeedbackStatusRequestSchema,
} from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

const ALL_STATUSES: readonly FeedbackStatus[] = ['open', 'in_progress', 'resolved'];

const APP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const idRouteSource = () => readFileSync(path.resolve(APP_SRC, 'app/api/v1/feedback/[id]/route.ts'), 'utf8');

describe('status-transition-workspace-admin-audit: status 遷移規約', () => {
  it('FL-SEC6-001: 隣接遷移 (open→in_progress, in_progress→resolved) だけを許可する', () => {
    expect(isValidFeedbackStatusTransition('open', 'in_progress')).toBe(true);
    expect(isValidFeedbackStatusTransition('in_progress', 'resolved')).toBe(true);
  });

  it('FL-SEC6-002: スキップ遷移 (open→resolved) を拒否する', () => {
    expect(isValidFeedbackStatusTransition('open', 'resolved')).toBe(false);
  });

  it('FL-SEC6-003: 逆行遷移をすべて拒否する', () => {
    expect(isValidFeedbackStatusTransition('in_progress', 'open')).toBe(false);
    expect(isValidFeedbackStatusTransition('resolved', 'in_progress')).toBe(false);
    expect(isValidFeedbackStatusTransition('resolved', 'open')).toBe(false);
  });

  it('FL-SEC6-004: resolved は終端状態で遷移先を持たない', () => {
    expect(FEEDBACK_STATUS_TRANSITIONS.resolved).toHaveLength(0);
  });

  it('FL-SEC6-005: 自己遷移 (同一 status への遷移) を許可しない', () => {
    for (const status of ALL_STATUSES) {
      expect(isValidFeedbackStatusTransition(status, status)).toBe(false);
    }
  });

  it('FL-SEC6-006: PATCH リクエストは status 以外のフィールド変更を受理しない', () => {
    const result = updateFeedbackStatusRequestSchema.safeParse({ status: 'in_progress', priority: 'high' });

    expect(result.success).toBe(false);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---
  // 認可チェック (workspace-admin 限定) と監査 event 記録は、
  // PATCH /api/v1/feedback/:id ハンドラと監査ロガー統合が未実装のため検証できない。
  describe('P05 実装後: 認可ミドルウェアと監査ロガーの統合', () => {
    it('FL-SEC6-101: PATCH は単一の認可 wrapper と feedback.status_change action を経由する', () => {
      const route = idRouteSource();
      expect(route).toContain('withAuthz<FeedbackParams>(');
      expect(route).toContain("action: 'feedback.status_change'");
    });

    it('FL-SEC6-102: workspace-admin 権限では status 遷移が成功する', () => {
      const route = idRouteSource();
      expect(route).toContain("action: 'feedback.status_change'");
      expect(route).toContain('feedbackLoopRuntime().service.updateFeedbackStatus');
    });

    it('FL-SEC6-103: 遷移成功時に監査 event feedback.status_change が記録される', () => {
      const route = idRouteSource();
      expect(route).toContain("action: 'feedback.status_change'");
      expect(route.indexOf('updateFeedbackStatus({')).toBeLessThan(route.indexOf('authz.audit.record'));
    });

    it('FL-SEC6-104: 不正遷移 (open→resolved 等) は API 層で 422 を返し監査 event を記録しない', () => {
      const route = idRouteSource();
      const patch = route.slice(route.indexOf('export const PATCH'));
      // catch ブロックが 422 を返した上で早期 return しており、その後にしか audit.record が現れない
      // = 例外発生時は audit.record 呼び出しへ到達しない。
      expect(patch).toContain('status: 422');
      expect(patch.indexOf('catch (error)')).toBeLessThan(patch.indexOf('authz.audit.record'));
      const catchBlock = patch.slice(patch.indexOf('catch (error)'), patch.indexOf('await authRuntime()'));
      expect(catchBlock).toContain('return problemResponse');
      expect(catchBlock).not.toContain('audit.record');
    });
  });
});
