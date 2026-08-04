/**
 * FL-UNIT-*: route 実行テストではモック越しにしか通らない下位レイヤー
 * (`features/feedback-loop/runtime.ts` の env 解決・`notification.ts` の channel 組立と
 * fire-and-forget 失敗ログ・`ai-job-adapter` の DTO 変換・`service.ts` の分岐) を、
 * 各層を直接呼び出して実行する単体テスト。
 *
 * route-handler-execution.test.ts は `feedbackLoopRuntime` を vi.mock で差し替えているため、
 * この singleton 自体 (env 未設定時のエラー・cache キー・createTursoWebClient への分岐) は
 * そちらでは 1 行も実行されない。ここでは本物の module をそのまま import して直接検証する。
 */
import type { BuildsRepository, FeedbackRepository, FeedbackRow, RepositoryContext } from '@harness-hub/db';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildFeedbackResponsePayload,
  parseFeedbackResponseResult,
  serializeFeedbackResponseResult,
  toPulledFeedbackResponseJob,
} from '../../features/feedback-loop/ai-job-adapter/index.js';
import { createFeedbackResolvedNotificationPort } from '../../features/feedback-loop/notification.js';
import { createFeedbackLoopRuntime, feedbackLoopRuntime } from '../../features/feedback-loop/runtime.js';
import { createFeedbackLoopService } from '../../features/feedback-loop/service.js';
import type { NotificationDeliveryResult, NotificationDispatcher } from '../../shared/notification/index.js';

describe('FL-UNIT: feedbackLoopRuntime() の env 解決とキャッシュ', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('FL-UNIT-001: TURSO_DATABASE_URL が無いと明示的なエラーで止まる', () => {
    expect(() => feedbackLoopRuntime({})).toThrow('環境変数 TURSO_DATABASE_URL が未設定です');
  });

  it('FL-UNIT-002: リモート URL (https/libsql/wss) で TURSO_AUTH_TOKEN が無いとエラーになる', () => {
    expect(() => feedbackLoopRuntime({ TURSO_DATABASE_URL: 'https://example.turso.io' })).toThrow(
      'リモート TURSO_DATABASE_URL には TURSO_AUTH_TOKEN が必要です',
    );
    expect(() => feedbackLoopRuntime({ TURSO_DATABASE_URL: 'libsql://example.turso.io' })).toThrow(
      'リモート TURSO_DATABASE_URL には TURSO_AUTH_TOKEN が必要です',
    );
  });

  it('FL-UNIT-003: url/token が揃うと runtime を構築でき、同じ組では cache を再利用する', () => {
    const source = { TURSO_DATABASE_URL: 'libsql://fl-unit-003.example.turso.io', TURSO_AUTH_TOKEN: 'token-a' };
    const first = feedbackLoopRuntime(source);
    const second = feedbackLoopRuntime({ ...source });
    expect(second).toBe(first);
  });

  it('FL-UNIT-004: url/token の組が変わると cache を再構築する', () => {
    const first = feedbackLoopRuntime({
      TURSO_DATABASE_URL: 'libsql://fl-unit-004-a.example.turso.io',
      TURSO_AUTH_TOKEN: 'token-a',
    });
    const second = feedbackLoopRuntime({
      TURSO_DATABASE_URL: 'libsql://fl-unit-004-b.example.turso.io',
      TURSO_AUTH_TOKEN: 'token-b',
    });
    expect(second).not.toBe(first);
  });
});

describe('FL-UNIT: createFeedbackResolvedNotificationPort の channel 組立と fire-and-forget ログ', () => {
  const BASE_INPUT = {
    tenantId: 'tenant-a',
    workspaceId: 'ws-a1',
    recipientUserId: 'user-1',
    feedbackId: 'fb-1',
    feedbackCode: 'FR-0001',
  };

  it('FL-UNIT-101: notifyEmailOptIn=true では in_app/email 両方へ dispatch する', async () => {
    const dispatch = vi.fn<NotificationDispatcher['dispatch']>().mockResolvedValue([
      { channel: 'in_app', delivered: true },
      { channel: 'email', delivered: true },
    ]);
    const port = createFeedbackResolvedNotificationPort({ dispatch });

    await port.notifyResolved({ ...BASE_INPUT, notifyEmailOptIn: true });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]?.[1]).toEqual(['in_app', 'email']);
    expect(dispatch.mock.calls[0]?.[0]).toMatchObject({
      tenantId: 'tenant-a',
      workspaceId: 'ws-a1',
      recipientSubject: 'user-1',
      kind: 'feedback.resolved',
      idempotencyKey: 'feedback-resolved:fb-1',
    });
  });

  it('FL-UNIT-102: notifyEmailOptIn=false では in_app のみへ dispatch する', async () => {
    const dispatch = vi
      .fn<NotificationDispatcher['dispatch']>()
      .mockResolvedValue([{ channel: 'in_app', delivered: true }]);
    const port = createFeedbackResolvedNotificationPort({ dispatch });

    await port.notifyResolved({ ...BASE_INPUT, notifyEmailOptIn: false });

    expect(dispatch.mock.calls[0]?.[1]).toEqual(['in_app']);
  });

  it('FL-UNIT-103: 送出失敗が 1 件でもあれば console.error に残すが、例外にはしない (fire-and-forget)', async () => {
    const failed: NotificationDeliveryResult = {
      channel: 'email',
      delivered: false,
      detail: 'transport_not_registered',
    };
    const dispatch = vi
      .fn<NotificationDispatcher['dispatch']>()
      .mockResolvedValue([{ channel: 'in_app', delivered: true }, failed]);
    const port = createFeedbackResolvedNotificationPort({ dispatch });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(port.notifyResolved({ ...BASE_INPUT, notifyEmailOptIn: true })).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      '[feedback-loop] resolved 通知の一部送出に失敗しました',
      expect.objectContaining({ feedbackId: 'fb-1', failed: [failed] }),
    );
    errorSpy.mockRestore();
  });

  it('FL-UNIT-104: 全 channel 成功時は console.error を呼ばない', async () => {
    const dispatch = vi
      .fn<NotificationDispatcher['dispatch']>()
      .mockResolvedValue([{ channel: 'in_app', delivered: true }]);
    const port = createFeedbackResolvedNotificationPort({ dispatch });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await port.notifyResolved({ ...BASE_INPUT, notifyEmailOptIn: false });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('FL-UNIT: ai-job-adapter の DTO 変換', () => {
  it('FL-UNIT-201: buildFeedbackResponsePayload は snake_case payload を組み立てる', () => {
    const payload = buildFeedbackResponsePayload({
      feedbackId: 'fb-1',
      feedbackCode: 'FR-0001',
      type: 'improvement',
      body: '本文',
    });
    expect(payload).toMatchObject({ feedback_id: 'fb-1', feedback_code: 'FR-0001', type: 'improvement', body: '本文' });
  });

  it('FL-UNIT-202: toPulledFeedbackResponseJob は AiJobRow から pull 応答 DTO を組み立てる', () => {
    const row = {
      id: 'job-1',
      kind: 'feedback_response' as const,
      payloadJson: JSON.stringify({ feedback_id: 'fb-1', feedback_code: 'FR-0001', type: 'improvement', body: '本文' }),
      leaseExpiresAt: 12_345,
    };
    const pulled = toPulledFeedbackResponseJob(row as unknown as Parameters<typeof toPulledFeedbackResponseJob>[0]);
    expect(pulled).toMatchObject({ id: 'job-1', kind: 'feedback_response', lease_expires_at: 12_345 });
  });

  it('FL-UNIT-203: serializeFeedbackResponseResult / parseFeedbackResponseResult は往復できる', () => {
    const serialized = serializeFeedbackResponseResult({ ai_response: 'AI からの回答' });
    expect(parseFeedbackResponseResult(serialized)).toEqual({ ai_response: 'AI からの回答' });
  });

  it('FL-UNIT-204: parseFeedbackResponseResult は null 入力で null を返す', () => {
    expect(parseFeedbackResponseResult(null)).toBeNull();
  });

  it('FL-UNIT-205: parseFeedbackResponseResult は契約外 JSON では null を返す (例外にしない)', () => {
    expect(parseFeedbackResponseResult(JSON.stringify({ unexpected: true }))).toBeNull();
  });
});

describe('FL-UNIT: createFeedbackLoopService の分岐 (repository を fake で差し替え)', () => {
  function fakeRepository(overrides: Partial<FeedbackRepository>): FeedbackRepository {
    const notImplemented = () => {
      throw new Error('このテストでは呼ばれない repository method です');
    };
    return {
      createAndEnqueue: notImplemented,
      listFeedbacks: notImplemented,
      findFeedback: notImplemented,
      updateFeedbackStatus: notImplemented,
      getNotifyFeedbackPreference: notImplemented,
      claimNextFeedbackResponseJob: notImplemented,
      findFeedbackResponseJob: notImplemented,
      completeFeedbackResponseJob: notImplemented,
      failFeedbackResponseJob: notImplemented,
      ...overrides,
    } as unknown as FeedbackRepository;
  }

  const CONTEXT: RepositoryContext = { tenantId: 'tenant-a', workspaceId: 'ws-a1' } as RepositoryContext;

  it('FL-UNIT-301: getFeedback は行が無いと null を返す (repository が null を返す分岐)', async () => {
    const repository = fakeRepository({ findFeedback: async () => null });
    const service = createFeedbackLoopService(repository);
    expect(await service.getFeedback({ context: CONTEXT, id: 'missing' })).toBeNull();
  });

  it('FL-UNIT-302: updateFeedbackStatus は対象行が無いと例外を投げる', async () => {
    const repository = fakeRepository({ findFeedback: async () => null });
    const service = createFeedbackLoopService(repository);
    await expect(
      service.updateFeedbackStatus({ context: CONTEXT, id: 'missing', status: 'in_progress' }),
    ).rejects.toThrow('feedback が見つかりません');
  });

  it('FL-UNIT-303: updateFeedbackStatus は不正な遷移 (open→resolved) を拒否する', async () => {
    const row: FeedbackRow = {
      id: 'fb-1',
      tenantId: 'tenant-a',
      workspaceId: 'ws-a1',
      code: 'FR-0001',
      projectId: 'proj-1',
      type: 'improvement',
      priority: 'medium',
      source: 'manual',
      body: '本文',
      status: 'open',
      aiResponse: null,
      aiJobId: null,
      createdBy: 'user-1',
      createdAt: 0,
      updatedAt: 0,
    } as FeedbackRow;
    const repository = fakeRepository({ findFeedback: async () => row });
    const service = createFeedbackLoopService(repository);
    await expect(service.updateFeedbackStatus({ context: CONTEXT, id: 'fb-1', status: 'resolved' })).rejects.toThrow(
      '不正な状態遷移です: open → resolved',
    );
  });

  it('FL-UNIT-304: listFeedbacks は workspaceId 未指定 (input.workspaceId===undefined) でも動く', async () => {
    const listFeedbacks = vi.fn(async () => ({ items: [], nextCursor: null }));
    const repository = fakeRepository({ listFeedbacks });
    const service = createFeedbackLoopService(repository);

    await service.listFeedbacks({ context: CONTEXT, query: { limit: 25 } });

    expect(listFeedbacks).toHaveBeenCalledWith(CONTEXT, { limit: 25 });
  });

  it('FL-UNIT-305: createFeedbackLoopRuntime は repository/buildsRepository を injectable に受け取り service を組み立てる', () => {
    const repository = fakeRepository({});
    const buildsRepository: BuildsRepository = {
      findOrCreateBuildForFeedback: async () => {
        throw new Error('このテストでは呼ばれない builds repository method です');
      },
    };
    const runtime = createFeedbackLoopRuntime(repository, buildsRepository);
    expect(runtime.repository).toBe(repository);
    expect(runtime.buildsRepository).toBe(buildsRepository);
    expect(runtime.service).toBeDefined();
  });
});
