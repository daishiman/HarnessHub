// 第 2 consumer 系統による通知 dispatch (apps/hub/src/shared/notification) の利用。
// 文面テンプレートは consumer feature の責務なので、ここでは送出境界だけを使う。
import {
  createNotificationDispatcher,
  type NotificationDeliveryResult,
  type NotificationMessage,
  type NotificationTransport,
} from '../../../src/shared/notification/index.js';

export const boundCreateNotificationDispatcher = createNotificationDispatcher;

export const sampleMessage: NotificationMessage = {
  tenantId: 'tenant-a',
  workspaceId: 'workspace-1',
  recipientSubject: 'user-1',
  kind: 'publish_request.approved',
  subject: '公開申請が承認されました',
  body: '公開申請が承認されました。次はカタログの表示を確認してください。',
  idempotencyKey: 'notify-1',
};

export function inAppTransport(sent: NotificationMessage[]): NotificationTransport {
  return {
    channel: 'in_app',
    send: async (message) => void sent.push(message),
  };
}

export function failingEmailTransport(): NotificationTransport {
  return {
    channel: 'email',
    send: async () => {
      throw new Error('resend_unavailable');
    },
  };
}

/** アプリ内が正本・メールは補助 (D6)。メール失敗がアプリ内送出を巻き込まないことを consumer 側から見る */
export async function dispatchBothChannels(
  sent: NotificationMessage[],
): Promise<readonly NotificationDeliveryResult[]> {
  const dispatcher = createNotificationDispatcher({
    transports: [inAppTransport(sent), failingEmailTransport()],
  });
  return dispatcher.dispatch(sampleMessage, ['in_app', 'email']);
}
