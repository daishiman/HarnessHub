/**
 * resolved 通知の production port (D6/B8/SEC9, ADR §6)。
 *
 * feedback-loop は NotificationDispatcher 共通層 (`shared/notification`) の最初の consumer。
 * 共通層自体の実装・transport 個別実装 (in_app 永続化・Resend 連携) は owner=feat-hub-foundation の
 * スコープであり、この feature が用意するのは「呼び出し契約」(channels 組み立てと dispatch 呼び出し) まで。
 * transport が未登録の channel は共通層が delivered=false として記録するため、
 * 実 transport が接続されるまでは通知が no-op のまま安全に fail-open する。
 */
import type { NotificationDispatcher } from '../../shared/notification/index.js';
import type { FeedbackNotificationPort } from './service.js';
import { resolveFeedbackNotificationChannels } from './service.js';

export function createFeedbackResolvedNotificationPort(dispatcher: NotificationDispatcher): FeedbackNotificationPort {
  return {
    async notifyResolved(input) {
      const channels = resolveFeedbackNotificationChannels(input.notifyEmailOptIn);
      const results = await dispatcher.dispatch(
        {
          tenantId: input.tenantId,
          workspaceId: input.workspaceId,
          recipientSubject: input.recipientUserId,
          kind: 'feedback.resolved',
          subject: `${input.feedbackCode} が対応済みになりました`,
          body: 'ご報告いただいた改善要望が対応済みになりました。',
          idempotencyKey: `feedback-resolved:${input.feedbackId}`,
        },
        channels,
      );
      const failed = results.filter((result) => !result.delivered);
      if (failed.length > 0) {
        // 通知は補助経路 (fire-and-forget)。主操作は失わせず、失敗はログにだけ残す。
        console.error('[feedback-loop] resolved 通知の一部送出に失敗しました', {
          feedbackId: input.feedbackId,
          failed,
        });
      }
    },
  };
}
