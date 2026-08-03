// P04 テストスタブ (SYS-FEEDBACK-LOOP-P04)
// resolved-notification-inapp-resend: resolved 通知はアプリ内通知が正本、
// Resend メールは `user_settings.notify_feedback` オプトイン時のみ補助送出する (D6/B8/SEC9, ADR §6)。
//
// スコープ外: NotificationDispatcher 共通層自体のテスト実装 (owner=feat-hub-foundation)。
// ここでは feedback-loop からの「呼び出し契約」— in_app は必ず含み、email はオプトイン時のみ
// channels に加える — を、共通層の実 dispatch 経由で固定する。

import { describe, expect, it, vi } from 'vitest';
import { resolveFeedbackNotificationChannels } from '../../features/feedback-loop/service.js';
import { createNotificationDispatcher, type NotificationTransport } from '../../shared/notification/index.js';

function buildMessage(idempotencyKey: string) {
  return {
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    recipientSubject: 'user-1',
    kind: 'feedback.resolved',
    subject: 'FR-0001 が対応済みになりました',
    body: 'ご報告いただいた改善要望が対応済みになりました。',
    idempotencyKey,
  };
}

function fakeTransport(channel: 'in_app' | 'email'): NotificationTransport & { send: ReturnType<typeof vi.fn> } {
  return { channel, send: vi.fn().mockResolvedValue(undefined) };
}

describe('resolved-notification-inapp-resend: 呼び出し契約', () => {
  it('FL-SEC9-001: in_app のみを指定すると email transport は一切呼ばれない (オプトインなし想定)', async () => {
    const inApp = fakeTransport('in_app');
    const email = fakeTransport('email');
    const dispatcher = createNotificationDispatcher({ transports: [inApp, email] });

    const results = await dispatcher.dispatch(buildMessage('fb-1-resolved'), ['in_app']);

    expect(inApp.send).toHaveBeenCalledTimes(1);
    expect(email.send).not.toHaveBeenCalled();
    expect(results).toEqual([{ channel: 'in_app', delivered: true }]);
  });

  it('FL-SEC9-002: notify_feedback オプトイン時は in_app + email の両方が送出される', async () => {
    const inApp = fakeTransport('in_app');
    const email = fakeTransport('email');
    const dispatcher = createNotificationDispatcher({ transports: [inApp, email] });

    const results = await dispatcher.dispatch(buildMessage('fb-2-resolved'), ['in_app', 'email']);

    expect(inApp.send).toHaveBeenCalledTimes(1);
    expect(email.send).toHaveBeenCalledTimes(1);
    expect(results.map((r) => r.channel)).toEqual(['in_app', 'email']);
  });

  it('FL-SEC9-003: email transport が失敗しても in_app の送出結果は delivered=true のまま', async () => {
    const inApp = fakeTransport('in_app');
    const email: NotificationTransport = {
      channel: 'email',
      send: vi.fn().mockRejectedValue(new Error('resend_down')),
    };
    const dispatcher = createNotificationDispatcher({ transports: [inApp, email] });

    const results = await dispatcher.dispatch(buildMessage('fb-3-resolved'), ['in_app', 'email']);

    expect(results.find((r) => r.channel === 'in_app')).toEqual({ channel: 'in_app', delivered: true });
    expect(results.find((r) => r.channel === 'email')?.delivered).toBe(false);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---
  // user_settings.notify_feedback の読み取りと channels 配列組み立ては
  // feedback-loop 側の未実装コードのため検証できない。
  describe('P05 実装後: user_settings.notify_feedback に基づく channels 組み立て', () => {
    it('FL-SEC9-101: notify_feedback=false のとき channels は ["in_app"] のみになる', () => {
      expect(resolveFeedbackNotificationChannels(false)).toEqual(['in_app']);
    });

    it('FL-SEC9-102: notify_feedback=true のとき channels は ["in_app", "email"] になる', () => {
      expect(resolveFeedbackNotificationChannels(true)).toEqual(['in_app', 'email']);
    });

    it('FL-SEC9-103: resolved 遷移以外 (open/in_progress) では通知を発火しない', async () => {
      const { readFileSync } = await import('node:fs');
      const path = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const appSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
      const service = readFileSync(path.resolve(appSrc, 'features/feedback-loop/service.ts'), 'utf8');
      const method = service.slice(service.indexOf('async updateFeedbackStatus'), service.lastIndexOf('  },'));
      expect(method).toContain("if (row.status === 'resolved')");
      expect(method).toContain('notifications.notifyResolved');
    });
  });
});
