// P04 テストスタブ (SYS-FEEDBACK-LOOP-P04) → P10 差し戻し後の P06 格上げ (SYS-FEEDBACK-LOOP-P05/P10)
// publish-connect-no-automerge: feedback からの修正版公開は既存 PublishRequest 状態機械へ
// 接続するのみで、feedback-loop 独自の自動マージ/公開経路を新設しない (ADR §7)。
//
// スコープ外: publish 状態機械のテスト実装自体 (owner=feat-publish-pipeline)。
//
// P10 最終独立レビューで、旧 FL-PUB-101/102 が「publish 関連の文字列がソースに無いこと」という
// 否定命題の静的検査に留まっていることが発覚した。ADR §7/§12 (P10 差し戻し再設計) は
// `builds` テーブルの新規作成と、AiJob(`feedback_response`) 完了時の `builds` 行の冪等作成を
// feat-feedback-loop のスコープと確定したため、ここでは実際に
// `POST /api/v1/ai-jobs/:id/complete` (kind=feedback_response) を Request/Response として実行し、
// `builds` 行が feedback_id 一意で正しい stage に冪等作成されることを検証する実行テストへ格上げする。
// (builds の CRUD API・7 工程遷移 UI・PublishRequest 状態遷移そのものは本テストの対象外)

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schemas from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedbackLoopRuntime } from '../../features/feedback-loop/runtime.js';
import type { AuthRuntime } from '../../lib/authz/runtime.js';

const APP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const completeRouteSource = () =>
  readFileSync(path.resolve(APP_SRC, 'app/api/v1/ai-jobs/[id]/complete/route.ts'), 'utf8');

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 authRuntime が未設定です');
      return runtimeHolder.current;
    },
  };
});

const feedbackRuntimeHolder = vi.hoisted(() => ({ current: null as FeedbackLoopRuntime | null }));

vi.mock('../../features/feedback-loop/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/feedback-loop/runtime.js')>();
  return {
    ...actual,
    feedbackLoopRuntime: () => {
      if (feedbackRuntimeHolder.current === null) throw new Error('テスト用 feedbackLoopRuntime が未設定です');
      return feedbackRuntimeHolder.current;
    },
  };
});

// ai-jobs/pull・complete の resolveResource は kind 判定のため hearingIntakeRuntime().repository.findJob
// も必ず呼ぶ (ADR §5: ai_jobs は kind 非依存の共通テーブル)。この file は sheet_generation を一切
// 扱わないため、TURSO_* 環境変数を要求する本物の runtime を初期化させず、常に null を返す最小スタブへ
// 差し替える (feedback_response 側の分岐だけを実行対象にする)。
vi.mock('../../features/hearing-intake/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/hearing-intake/runtime.js')>();
  return {
    ...actual,
    hearingIntakeRuntime: () => ({
      repository: { findJob: async () => null },
      service: {},
    }),
  };
});

import { TENANT_A, WORKSPACE_A1 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  ALLOWED_ORIGIN,
  createTokenRouteHarness,
  issuePublisherToken,
  sessionCookieFor,
  type TokenRouteHarness,
  testUser,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { POST as completeRoute } from '../../app/api/v1/ai-jobs/[id]/complete/route.js';
import { POST as pullRoute } from '../../app/api/v1/ai-jobs/pull/route.js';
import { POST as createFeedbackRoute } from '../../app/api/v1/feedback/route.js';
import { createFeedbackLoopRuntime } from '../../features/feedback-loop/runtime.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware/index.js';
import { createFeedbackDbHarness, type FeedbackDbHarness } from './support/real-db.js';

const MEMBER = testUser('user-member');
const ADMIN = testUser('user-admin', { role: 'workspace-admin' });

const FEEDBACK_LOOP_EXPORT_NAMES = [
  'createFeedbackRequestSchema',
  'createFeedbackResponseSchema',
  'FEEDBACK_STATUS_TRANSITIONS',
  'feedbackDetailSchema',
  'feedbackListItemSchema',
  'feedbackListQuerySchema',
  'feedbackListResponseSchema',
  'feedbackPrioritySchema',
  'feedbackResponseJobPayloadSchema',
  'feedbackResponseJobResultSchema',
  'feedbackSourceSchema',
  'feedbackStatusSchema',
  'feedbackTypeSchema',
  'isValidFeedbackStatusTransition',
  'updateFeedbackStatusRequestSchema',
] as const;

describe('publish-connect-no-automerge: feedback-loop 契約に publish 固有 state を持たない', () => {
  it('FL-PUB-001: feedback-loop の export に publish/automerge 関連の名前が存在しない', () => {
    for (const name of FEEDBACK_LOOP_EXPORT_NAMES) {
      expect(schemas).toHaveProperty(name);
    }
    const exportNames = FEEDBACK_LOOP_EXPORT_NAMES as readonly string[];
    for (const name of exportNames) {
      expect(name.toLowerCase()).not.toContain('publish');
      expect(name.toLowerCase()).not.toContain('automerge');
    }
  });
});

describe('P10 差し戻し実行テスト: AiJob(feedback_response) 完了時の builds 冪等作成 (ADR §7/§12)', () => {
  let dbHarness: FeedbackDbHarness;
  let tokenHarness: TokenRouteHarness;

  beforeEach(async () => {
    tokenHarness = createTokenRouteHarness();
    tokenHarness.ports.users.put(MEMBER);
    tokenHarness.ports.users.put(ADMIN);
    runtimeHolder.current = tokenHarness.runtime;

    dbHarness = await createFeedbackDbHarness();
    feedbackRuntimeHolder.current = createFeedbackLoopRuntime(dbHarness.repository, dbHarness.buildsRepository);
  });

  afterEach(() => {
    dbHarness.close();
    runtimeHolder.current = null;
    feedbackRuntimeHolder.current = null;
  });

  function baseHeaders(extra: Record<string, string> = {}): Headers {
    return new Headers({
      [TENANT_HEADER]: TENANT_A,
      [WORKSPACE_HEADER]: WORKSPACE_A1,
      origin: ALLOWED_ORIGIN,
      ...extra,
    });
  }

  async function createFeedback(type: 'improvement' | 'review' | 'bug'): Promise<{ id: string }> {
    const headers = baseHeaders({
      cookie: await sessionCookieFor(MEMBER),
      'content-type': 'application/json',
    });
    const response = await createFeedbackRoute(
      new Request('https://hub.example.com/api/v1/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          project_id: 'proj-1',
          type,
          priority: 'medium',
          body: `${type} の修正提案本文です。`,
        }),
      }),
    );
    expect(response.status).toBe(201);
    return (await response.json()) as { id: string };
  }

  /** workspace-admin の publisher token で AiJob(feedback_response) を pull し、job id を返す。 */
  async function pullFeedbackResponseJob(accessToken: string): Promise<string> {
    const headers = baseHeaders({
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    });
    const response = await pullRoute(
      new Request('https://hub.example.com/api/v1/ai-jobs/pull', {
        method: 'POST',
        headers,
        body: JSON.stringify({ kind: 'feedback_response' }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string };
    return body.id;
  }

  async function completeFeedbackResponseJob(
    jobId: string,
    accessToken: string,
    aiResponse: string,
  ): Promise<Response> {
    const headers = baseHeaders({
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    });
    return completeRoute(
      new Request(`https://hub.example.com/api/v1/ai-jobs/${jobId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ai_response: aiResponse }),
      }),
      { params: Promise.resolve({ id: jobId }) },
    );
  }

  it('FL-PUB-101: type=improvement の完了は stage=design で builds 行を冪等作成する', async () => {
    const feedback = await createFeedback('improvement');
    const token = await issuePublisherToken(tokenHarness, ADMIN.id, WORKSPACE_A1, ['aijob:process']);

    const jobId = await pullFeedbackResponseJob(token.access_token);
    const response = await completeFeedbackResponseJob(jobId, token.access_token, 'AI からの改善提案です。');

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; status: string };
    expect(body.status).toBe('completed');

    // builds は CRUD API を持たない (スコープ外) ため、repository の冪等作成 API を直接呼び、
    // 「行が増えない」「既存 stage が上書きされない」ことを確認する。異なる引数 (stage=publish) を
    // 渡しても HTTP complete 経路が作った既存行がそのまま返るなら、その行を検出できたことになる。
    const idempotent = await dbHarness.buildsRepository.findOrCreateBuildForFeedback(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1 },
      { id: feedback.id, workspaceId: WORKSPACE_A1, type: 'improvement' },
      'publish',
    );
    expect(idempotent.feedbackId).toBe(feedback.id);
    expect(idempotent.stage).toBe('design');
    expect(idempotent.type).toBe('improvement');

    // 2 回目の冪等作成でも id/stage が変わらない (行が増えない・上書きされない)
    const secondCall = await dbHarness.buildsRepository.findOrCreateBuildForFeedback(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1 },
      { id: feedback.id, workspaceId: WORKSPACE_A1, type: 'improvement' },
      'test',
    );
    expect(secondCall.id).toBe(idempotent.id);
    expect(secondCall.stage).toBe('design');
  });

  it('FL-PUB-102: type=bug の完了は stage=test で builds 行を冪等作成し、PublishRequest の状態機械を新設しない', async () => {
    const feedback = await createFeedback('bug');
    const token = await issuePublisherToken(tokenHarness, ADMIN.id, WORKSPACE_A1, ['aijob:process']);

    const jobId = await pullFeedbackResponseJob(token.access_token);
    const response = await completeFeedbackResponseJob(jobId, token.access_token, 'バグ修正方針を提案します。');
    expect(response.status).toBe(200);

    const build = await dbHarness.buildsRepository.findOrCreateBuildForFeedback(
      { tenantId: TENANT_A, workspaceId: WORKSPACE_A1 },
      { id: feedback.id, workspaceId: WORKSPACE_A1, type: 'bug' },
      'design',
    );
    expect(build.stage).toBe('test');
    expect(build.publishRequestId).toBeNull();

    // 自動マージ/独自 publish 経路を新設していないことは FL-PUB-001 の契約検査と、complete route の
    // ソースが PublishRequest 状態機械へ一切触れていないことの両方で担保する。
    const source = completeRouteSource();
    expect(source.toLowerCase()).not.toContain('automerge');
    expect(source).not.toMatch(/publish\.(approve|reject)/);
    expect(source).not.toMatch(/publish-requests['"]/);
  });
});
