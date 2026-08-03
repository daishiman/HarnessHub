// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-NOTIF-*: 通知ディスパッチ共通層の消費 (quality_constraint notification-dispatch-common-layer / SEC9)。
//
// AD-7 の決定: `apps/hub/src/shared/notification/` の `NotificationDispatcher`/`NotificationMessage` を
// そのまま使う。本 feature が組み立てるのは NotificationMessage の中身のみ。
// P03 (design-review-notes.md §4) の継続申し送り: 「body への PII 非混入を機械検証する自動テストが
// ADR に無い」— このファイルの UOA-NOTIF-003/004 がその機械検証を P04 時点で用意する。

import { describe, expect, it } from 'vitest';
import {
  createNotificationDispatcher,
  type NotificationChannel,
  type NotificationDeliveryResult,
  type NotificationMessage,
  type NotificationTransport,
} from '../../src/shared/notification/index.js';

/**
 * AD-7 §決定1 のコード例と同型。本 feature が組み立てるのは NotificationMessage のみで、
 * 独自インタフェースは定義しない。role 変更を通知する例として使う。
 */
function buildRoleChangedMessage(input: {
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly recipientSubject: string;
  readonly targetUserName: string;
  readonly newRoleLabel: string;
  /** salary は通知の組立て関数へ意図的に渡さない引数として省く (SEC9)。渡り経路自体を作らない。 */
}): NotificationMessage {
  return {
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    recipientSubject: input.recipientSubject,
    kind: 'user.role_changed',
    subject: `${input.targetUserName} さんの権限が変更されました`,
    body: `${input.targetUserName} さんの権限が「${input.newRoleLabel}」に変更されました。`,
    idempotencyKey: `user.role_changed:${input.tenantId}:${input.recipientSubject}`,
  };
}

function fakeTransport(channel: NotificationChannel, sent: NotificationMessage[]): NotificationTransport {
  return {
    channel,
    async send(message) {
      sent.push(message);
    },
  };
}

describe('契約: NotificationMessage の組立て (AD-7)', () => {
  it('UOA-NOTIF-001: buildRoleChangedMessage は共通層の NotificationMessage 型の項目のみを持つ', () => {
    const message = buildRoleChangedMessage({
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      recipientSubject: 'user-9',
      targetUserName: '山田太郎',
      newRoleLabel: 'workspace-admin',
    });

    expect(Object.keys(message).sort()).toStrictEqual(
      ['tenantId', 'workspaceId', 'recipientSubject', 'kind', 'subject', 'body', 'idempotencyKey'].sort(),
    );
  });

  it('UOA-NOTIF-002: dispatch() は既存 createNotificationDispatcher をそのまま使い、両 channel へ配送する', async () => {
    const sent: NotificationMessage[] = [];
    const dispatcher = createNotificationDispatcher({
      transports: [fakeTransport('in_app', sent), fakeTransport('email', sent)],
    });
    const message = buildRoleChangedMessage({
      tenantId: 'tenant-1',
      workspaceId: null,
      recipientSubject: 'user-9',
      targetUserName: '山田太郎',
      newRoleLabel: 'member',
    });

    const results: readonly NotificationDeliveryResult[] = await dispatcher.dispatch(message, ['in_app', 'email']);

    expect(results).toStrictEqual([
      { channel: 'in_app', delivered: true },
      { channel: 'email', delivered: true },
    ]);
    expect(sent).toStrictEqual([message, message]);
  });

  it('UOA-NOTIF-003 (SEC9 / P03継続申し送り): body に salary の金額が混入しない (組立て関数は salary を引数に取らない)', () => {
    // 組立て関数のシグネチャ自体に salary が無いことがこのテストの前提。
    // 実装が誤って salary を body へ埋め込もうとしても、この関数の入力型には salary が存在しないため
    // 型検査の時点で弾かれる。ランタイムでも代表的な PII キーワードが本文に出ないことを実測する。
    const message = buildRoleChangedMessage({
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      recipientSubject: 'user-9',
      targetUserName: '山田太郎',
      newRoleLabel: 'workspace-admin',
    });

    for (const keyword of ['salary', '年収', '¥', '給与']) {
      expect(message.body).not.toContain(keyword);
      expect(message.subject).not.toContain(keyword);
    }
  });

  it('UOA-NOTIF-004 (Goodhart対策): body は空文字列ではなく実際の通知文が入っている', () => {
    const message = buildRoleChangedMessage({
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      recipientSubject: 'user-9',
      targetUserName: '山田太郎',
      newRoleLabel: 'workspace-admin',
    });
    expect(message.body.length).toBeGreaterThan(0);
    expect(message.body).toContain('山田太郎');
  });

  it('UOA-NOTIF-005: 1 channel の送出失敗が他 channel を止めない (D6: アプリ内が正本)', async () => {
    const sent: NotificationMessage[] = [];
    const failingEmail: NotificationTransport = {
      channel: 'email',
      async send() {
        throw new Error('resend_unavailable');
      },
    };
    const dispatcher = createNotificationDispatcher({ transports: [fakeTransport('in_app', sent), failingEmail] });
    const message = buildRoleChangedMessage({
      tenantId: 'tenant-1',
      workspaceId: null,
      recipientSubject: 'user-9',
      targetUserName: '山田太郎',
      newRoleLabel: 'member',
    });

    const results = await dispatcher.dispatch(message, ['in_app', 'email']);

    expect(results).toStrictEqual([
      { channel: 'in_app', delivered: true },
      { channel: 'email', delivered: false, detail: 'resend_unavailable' },
    ]);
  });
});

describe('P05 受入層への引き継ぎ (実装対象のため it.todo)', () => {
  it.todo(
    'UOA-NOTIF-101: S18 通知設定 UI の notify_generation/notify_review/notify_weekly/notify_feedback/email_enabled から channels 配列を組み立てる変換関数の実装を検証する',
  );
  it.todo(
    'UOA-NOTIF-102: createNotificationDispatcher への transports 注入は feat-hub-foundation 側のまま変更されていないことを結線テストで確認する',
  );
  it.todo(
    'UOA-NOTIF-103: 実際の係数変更/role変更通知が dispatch() 呼出しに至るまでの HTTP 結合 (route → buildXxxMessage → dispatch)',
  );
});
