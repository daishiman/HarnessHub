// apps/hub 内で owner される共通層 7 種 (authz-middleware / auth / audit / aijob / notification / pii / telemetry) の
// consumer 系統検証。package 化されていないため public API 入口は各層の index.ts になる。
//
// requirements-baseline §4.2 A4-1 は「§8 登録簿の**全**共通層について consumer 2 系統以上」を要求する。
// 従来 contract test は package 化された 4 層しか見ておらず、判定範囲が要件の 1/3 だった (P10 指摘 F-06)。

import { describe, expect, it } from 'vitest';
import { authorize, isPublicPath, PUBLIC_PATH_PREFIXES, resolveRequestedScope } from '../../src/middleware/index.js';
import { createAiJobQueue } from '../../src/shared/aijob/index.js';
import { auditEventFromContext, createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import { createAuthAdapter, denyAllAuthProvider } from '../../src/shared/auth/index.js';
import { createNotificationDispatcher } from '../../src/shared/notification/index.js';
import { ADMIN_ROLE, canView, maskPii, maskPiiForExport, PII_MASK } from '../../src/shared/pii/index.js';
import { createTelemetryIngest, rollupTelemetry } from '../../src/shared/telemetry/index.js';
import * as usesAiJob from '../fixtures/consumer-a/uses-aijob.js';
import * as usesAudit from '../fixtures/consumer-a/uses-audit.js';
import * as usesAuth from '../fixtures/consumer-a/uses-auth.js';
import * as usesAuthz from '../fixtures/consumer-a/uses-authz-middleware.js';
import * as usesNotification from '../fixtures/consumer-a/uses-notification.js';
import * as usesPii from '../fixtures/consumer-a/uses-pii.js';
import * as usesTelemetry from '../fixtures/consumer-a/uses-telemetry.js';
import { APP_SRC, CONSUMER_A, inAppDeepImports, inAppEntryImports } from './source-scan.js';

/** shared-layer-registry.json の owner_package から apps/hub 相対にしたもの */
const LAYERS = {
  'authz-middleware': 'src/middleware',
  'auth-adapter': 'src/shared/auth',
  'audit-event-logger': 'src/shared/audit',
  'aijob-queue': 'src/shared/aijob',
  'notification-dispatch': 'src/shared/notification',
  'pii-guard': 'src/shared/pii',
  'telemetry-ingest-rollup': 'src/shared/telemetry',
} as const;

/**
 * apps/hub 本体 (src/**) に実利用がある層。
 * 残りは境界だけ用意されていて本体側の呼び出し元がまだ無く、**consumer は fixture 系統のみ**である。
 * ここを固定しておくと、結線が進んだとき (= この一覧が古くなったとき) にテストが落ちて更新を強制できる。
 */
const WIRED_IN_APP_LAYERS: readonly (keyof typeof LAYERS)[] = ['authz-middleware', 'auth-adapter'];

describe('contract: apps/hub 内 owner の共通層', () => {
  it('全 7 層が consumer-a fixture (第 2 系統) から公開入口経由で参照されている', () => {
    const missing = Object.entries(LAYERS).filter(([, dir]) => inAppEntryImports(CONSUMER_A, dir).length === 0);
    expect(missing.map(([id]) => id)).toEqual([]);
  });

  it('参照走査が空振りしていない (どの層でも非 0 を返す実装だと上のテストが無条件に緑になる)', () => {
    // 共通層ではないディレクトリは 0 件になること
    expect(inAppEntryImports(CONSUMER_A, 'src/app/health')).toEqual([]);
    // 実在する層は 1 件以上になること
    expect(inAppEntryImports(CONSUMER_A, LAYERS['pii-guard']).length).toBeGreaterThan(0);
  });

  it('公開入口 index を迂回した内部ファイル参照が無い', () => {
    for (const [id, dir] of Object.entries(LAYERS)) {
      expect(inAppDeepImports(APP_SRC, dir).map((record) => `${id}:${record.file}`)).toEqual([]);
      expect(inAppDeepImports(CONSUMER_A, dir).map((record) => `${id}:${record.file}`)).toEqual([]);
    }
  });

  it('本体側に呼び出し元がある層の一覧が既知の状態と一致する (未結線を緑で隠さない)', () => {
    const wired = Object.entries(LAYERS)
      .filter(([, dir]) => inAppEntryImports(APP_SRC, dir).length > 0)
      .map(([id]) => id);

    // 一致しなくなったら「結線が進んだ」か「結線が消えた」のどちらか。どちらも申告なしに通してはいけない
    expect(wired.sort()).toStrictEqual([...WIRED_IN_APP_LAYERS].sort());
  });
});

describe('contract: authz-middleware', () => {
  it('2 系統が同一の実装を指している', () => {
    expect(usesAuthz.boundAuthorize).toBe(authorize);
    expect(usesAuthz.boundIsPublicPath).toBe(isPublicPath);
    expect(usesAuthz.boundResolveRequestedScope).toBe(resolveRequestedScope);
  });

  it('fixture 経由でも deny-by-default が効く', () => {
    // 未認証は拒否
    expect(usesAuthz.decideAnonymous('/api/v1/harnesses').allowed).toBe(false);
    // 自スコープは許可
    expect(usesAuthz.decideInScope('/api/v1/harnesses').allowed).toBe(true);
    // 越境は拒否
    expect(usesAuthz.decideCrossTenant('/api/v1/harnesses').allowed).toBe(false);
  });

  it('公開 path の allowlist が単一ソースから来ている', () => {
    expect(usesAuthz.boundPublicPathPrefixes).toBe(PUBLIC_PATH_PREFIXES);
    // 外形監視が認証なしで叩く /health は公開、業務 API は非公開
    expect(usesAuthz.boundIsPublicPath('/health')).toBe(true);
    expect(usesAuthz.boundIsPublicPath('/api/v1/harnesses')).toBe(false);
  });
});

describe('contract: auth-adapter', () => {
  it('2 系統が同一の実装を指している', () => {
    expect(usesAuth.boundCreateAuthAdapter).toBe(createAuthAdapter);
    expect(usesAuth.boundDenyAllAuthProvider).toBe(denyAllAuthProvider);
  });

  it('provider 未注入では未認証に倒れる (fail-closed)', async () => {
    await expect(usesAuth.resolveWithDefaultProvider()).resolves.toBeNull();
  });

  it('壊れた Principal を返す provider は境界で弾かれる', async () => {
    await expect(usesAuth.resolveWithMalformedProvider()).resolves.toBeNull();
  });
});

describe('contract: audit-event-logger', () => {
  it('2 系統が同一の実装を指している', () => {
    expect(usesAudit.boundCreateAuditLogger).toBe(createAuditLogger);
    expect(usesAudit.boundAuditEventFromContext).toBe(auditEventFromContext);
    expect(usesAudit.boundCreateInMemoryAuditSink).toBe(createInMemoryAuditSink);
  });

  it('スコープ (RepositoryContext) から監査イベントを組み立てる経路が一致する', () => {
    expect(usesAudit.buildEvent()).toStrictEqual({
      ...usesAudit.sampleDetail,
      actorSubject: 'user-1',
      tenantId: 'tenant-a',
      workspaceId: 'workspace-1',
    });
  });

  it('記録経路が append-only の sink に載る', async () => {
    const events = await usesAudit.recordSample();
    expect(events).toStrictEqual([
      { ...usesAudit.buildEvent(), id: 'audit-1', recordedAt: '2026-07-21T00:00:00.000Z' },
    ]);
  });
});

describe('contract: aijob-queue', () => {
  it('2 系統が同一の実装を指している', () => {
    expect(usesAiJob.boundCreateAiJobQueue).toBe(createAiJobQueue);
  });

  it('pull 型の境界が store へ委譲されている', async () => {
    const calls: string[] = [];
    const queue = usesAiJob.queueWith(calls);

    await queue.enqueue(usesAiJob.sampleEnqueueInput);
    await queue.lease({ tenantId: 'tenant-a', kinds: ['harness.review'], leaseSeconds: 60 });

    expect(calls).toStrictEqual(['upsertQueued', 'takeNextQueued']);
  });

  it('kinds 空配列では store を呼ばない (deny-by-default と同じ思想)', async () => {
    const calls: string[] = [];
    const result = await usesAiJob.queueWith(calls).lease({ tenantId: 'tenant-a', kinds: [], leaseSeconds: 60 });

    expect(result).toBeNull();
    expect(calls).toStrictEqual([]);
  });
});

describe('contract: notification-dispatch', () => {
  it('2 系統が同一の実装を指している', () => {
    expect(usesNotification.boundCreateNotificationDispatcher).toBe(createNotificationDispatcher);
  });

  it('メール送出の失敗がアプリ内通知を巻き込まない (D6: アプリ内が正本)', async () => {
    const sent: (typeof usesNotification.sampleMessage)[] = [];
    const results = await usesNotification.dispatchBothChannels(sent);

    expect(sent).toStrictEqual([usesNotification.sampleMessage]);
    expect(results).toStrictEqual([
      { channel: 'in_app', delivered: true },
      { channel: 'email', delivered: false, detail: 'resend_unavailable' },
    ]);
  });
});

describe('contract: pii-guard', () => {
  it('2 系統が同一の実装を指している', () => {
    expect(usesPii.boundMaskPii).toBe(maskPii);
    expect(usesPii.boundMaskPiiForExport).toBe(maskPiiForExport);
    expect(usesPii.boundCanView).toBe(canView);
    expect(usesPii.boundAdminRole).toBe(ADMIN_ROLE);
    expect(usesPii.boundPiiMask).toBe(PII_MASK);
  });

  it('admin 以外には要保護属性を返さない', () => {
    const forMember = usesPii.maskForViewer(usesPii.memberViewer);
    expect(forMember['salary']).toBe(PII_MASK);
    expect(forMember['passwordHash']).toBe(PII_MASK);
    // policy に載っていない属性はそのまま通る
    expect(forMember['displayName']).toBe('山田');
  });

  it('admin でも never_exposed は返さない', () => {
    const forAdmin = usesPii.maskForViewer(usesPii.adminViewer);
    expect(forAdmin['salary']).toBe(6_000_000);
    expect(forAdmin['passwordHash']).toBe(PII_MASK);
  });

  it('export では閲覧者に関わらず全てマスクする', () => {
    expect(usesPii.maskForExport()['salary']).toBe(PII_MASK);
  });
});

describe('contract: telemetry-ingest-rollup', () => {
  it('2 系統が同一の実装を指している', () => {
    expect(usesTelemetry.boundCreateTelemetryIngest).toBe(createTelemetryIngest);
    expect(usesTelemetry.boundRollupTelemetry).toBe(rollupTelemetry);
  });

  it('冪等キーでバッチ内の重複が畳まれる', async () => {
    const collected: Parameters<typeof usesTelemetry.rollupSample>[0][number][] = [];
    const result = await usesTelemetry.ingestSample(collected);

    expect(collected.map((event) => event.idempotencyKey)).toStrictEqual(['e-1', 'e-2']);
    expect(result).toStrictEqual({ accepted: 2, deduplicated: 1 });
  });

  it('事前集計が rollup 関数を通して行われる (生イベントのオンライン集計をしない)', async () => {
    const collected: Parameters<typeof usesTelemetry.rollupSample>[0][number][] = [];
    await usesTelemetry.ingestSample(collected);
    const rollups = usesTelemetry.rollupSample(collected);

    expect(rollups).toStrictEqual(rollupTelemetry(collected, 86_400));
    expect(rollups).toHaveLength(1);
    expect(rollups[0]).toMatchObject({ metric: 'harness.run', count: 2, sum: 3 });
  });
});
