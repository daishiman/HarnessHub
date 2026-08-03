// P04 テストスタブ (SYS-FEEDBACK-LOOP-P04)
// ai-pull-queue-provider-admin-device-flow: AiJob(feedback_response) の pull/書戻し契約 (SEC8, ADR §5)。
//
// 注意: phase-04 spec の文言は「provider-admin Device Flow 限定」だが、
// P03 独立レビューで「AiJob pull endpoint は kind 非依存の単一権限チェックであり、
// feedback_response だけを provider-admin 限定にすると ADR §8 (feature 固有の認可分岐禁止) と矛盾する」
// という指摘を受け、ADR §5/§11 で qa-048 (2026-07-18 改訂) の汎用モデル
// (workspace-admin は自テナント限定 pull 可、provider-admin は cross-tenant) を feedback_response にも
// 適用する設計へ確定した。baseline の「provider-admin限定」表記は qa-048 revision 前の記述であり、
// baseline 自体は書き換えず goal-spec 再確認プロセスへ escalate する (rollback 規約)。
// 本ファイルはこの確定済み設計を受入契約として固定する。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feedbackResponseJobPayloadSchema, feedbackResponseJobResultSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

const APP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_ROOT = path.resolve(APP_SRC, '..', '..', '..');
const pullRoute = () => readFileSync(path.resolve(APP_SRC, 'app/api/v1/ai-jobs/pull/route.ts'), 'utf8');
const completeRoute = () => readFileSync(path.resolve(APP_SRC, 'app/api/v1/ai-jobs/[id]/complete/route.ts'), 'utf8');
const failRoute = () => readFileSync(path.resolve(APP_SRC, 'app/api/v1/ai-jobs/[id]/fail/route.ts'), 'utf8');
const aiQueueRegistrySource = () => readFileSync(path.resolve(APP_SRC, 'lib/ai-queue/registry.ts'), 'utf8');
const withAuthzSource = () => readFileSync(path.resolve(APP_SRC, 'lib/authz/with-authz.ts'), 'utf8');
const queueRepoSource = () =>
  readFileSync(path.resolve(REPO_ROOT, 'packages/db/repository/feedback-loop-queue.ts'), 'utf8');

describe('ai-pull-queue-provider-admin-device-flow: AiJob(feedback_response) 契約', () => {
  it('FL-SEC8-001: payload は feedback_id/feedback_code/type/body を必須で持つ', () => {
    const result = feedbackResponseJobPayloadSchema.safeParse({
      feedback_id: 'fb-1',
      feedback_code: 'FR-0001',
      type: 'improvement',
      body: '改善要望本文',
    });

    expect(result.success).toBe(true);
  });

  it('FL-SEC8-002: payload に未定義フィールドを混入させると拒否する (kind 固有の秘匿情報混入防止)', () => {
    const result = feedbackResponseJobPayloadSchema.safeParse({
      feedback_id: 'fb-1',
      feedback_code: 'FR-0001',
      type: 'improvement',
      body: '本文',
      internal_note: '漏れてはいけない社内情報',
    });

    expect(result.success).toBe(false);
  });

  it('FL-SEC8-003: result は空文字の ai_response を許可しない', () => {
    expect(feedbackResponseJobResultSchema.safeParse({ ai_response: '' }).success).toBe(false);
    expect(feedbackResponseJobResultSchema.safeParse({ ai_response: '対応方針を提案します。' }).success).toBe(true);
  });

  it('FL-SEC8-004: feedback_code は FR-xxx 形式のみ受理する', () => {
    expect(
      feedbackResponseJobPayloadSchema.safeParse({
        feedback_id: 'fb-1',
        feedback_code: 'bad-code',
        type: 'bug',
        body: '本文',
      }).success,
    ).toBe(false);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---
  // POST /api/v1/ai-jobs/pull・complete・fail は既存 feat-hub-foundation の汎用実装であり、
  // kind=feedback_response での配線 (enqueue タイミング・writeback 先) はまだ実装されていない。
  describe('P05 実装後: pull/writeback ハンドラの kind=feedback_response 配線', () => {
    it('FL-SEC8-101: workspace-admin は自テナントの feedback_response ジョブのみ pull できる (role 分岐を feature 側に持たない)', () => {
      const route = pullRoute();
      const registry = aiQueueRegistrySource();
      expect(route).toContain('withAuthz');
      expect(route).not.toMatch(/principal\.role|effectiveRole\s*===/);
      expect(route).toContain('AI_QUEUE_ADAPTERS[kind]');
      expect(route).toContain('adapter.claim');
      expect(route).toContain('workspaceId: authz.resource.workspaceId');
      expect(registry).toContain('feedback_response:');
      expect(registry).toContain('claimNextFeedbackResponseJob');
    });

    it('FL-SEC8-102: provider-admin は cross-tenant で feedback_response ジョブを pull できる (共通監査へ委譲)', () => {
      const route = pullRoute();
      const wrapper = withAuthzSource();
      expect(route).toContain("type: 'ai_job_queue'");
      expect(wrapper).toContain("action: 'provider.cross_tenant_access'");
      expect(wrapper).toContain('tenantId: resource.tenantId');
    });

    it('FL-SEC8-103: complete 後 feedbacks.ai_response と ai_job_id が書き戻される (status には触れない)', () => {
      const repo = queueRepoSource();
      const method = repo.slice(
        repo.indexOf('async completeFeedbackResponseJob'),
        repo.indexOf('async failFeedbackResponseJob'),
      );
      expect(method).toContain('aiResponse, aiJobId: job.id');
      // feedbacks への .set() は aiResponse/aiJobId/updatedAt だけで status を含まない
      // (aiJobs 側の .set({ status: 'completed', ... }) とは別物であることを区別する)。
      const feedbackUpdate = method.slice(method.indexOf('.update(feedbacks)'));
      expect(feedbackUpdate).toContain('.set({ aiResponse, aiJobId: job.id, updatedAt: now })');
      expect(feedbackUpdate.split('.where(')[0]).not.toContain('status');
      const route = completeRoute();
      const registry = aiQueueRegistrySource();
      expect(route).toContain('AI_QUEUE_ADAPTERS[job.kind]');
      expect(route).toContain('adapter.complete');
      expect(registry).toContain('completeFeedbackResponseJob');
      expect(registry).toContain('parseFeedbackResponseResult');
    });

    it('FL-SEC8-104: fail 後は再 enqueue され feedbacks.status は変化しない', () => {
      const repo = queueRepoSource();
      const method = repo.slice(repo.indexOf('async failFeedbackResponseJob'), repo.indexOf('};'));
      expect(method).toContain("status: dead ? 'dead' : 'queued'");
      // fail は feedbacks テーブルを一切更新しない (db.update(feedbacks) 呼び出しが無い)。
      expect(method).not.toContain('db.update(feedbacks)');
      expect(method).not.toContain('.update(feedbacks)');
      const route = failRoute();
      const registry = aiQueueRegistrySource();
      expect(route).toContain('AI_QUEUE_ADAPTERS[job.kind]');
      expect(route).toContain('adapter.fail');
      expect(registry).toContain('failFeedbackResponseJob');
    });
  });
});
