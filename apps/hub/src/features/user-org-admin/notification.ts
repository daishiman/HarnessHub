/**
 * user-org-admin の通知 consumer。配送機構は shared/notification に委譲し、
 * ここでは通知種別・宛先・PII を含めない文面だけを決める。
 */
import type {
  NotificationChannel,
  NotificationDispatcher,
  NotificationMessage,
} from '../../shared/notification/index.js';

/**
 * account 管理通知には個別の種別トグルが無いため、アプリ内通知を既定とし、
 * メールは利用者自身の `email_enabled` のみで opt-in させる。
 */
export function resolveUserOrgAdminNotificationChannels(emailEnabled: boolean): readonly NotificationChannel[] {
  return emailEnabled ? ['in_app', 'email'] : ['in_app'];
}

function roleChangedMessage(input: {
  readonly tenantId: string;
  readonly recipientUserId: string;
  readonly auditEventId: string;
}): NotificationMessage {
  return {
    tenantId: input.tenantId,
    workspaceId: null,
    recipientSubject: input.recipientUserId,
    kind: 'user.role_changed',
    subject: 'アカウントの権限が変更されました',
    body: 'あなたのアカウント権限が変更されました。必要に応じて管理者へお問い合わせください。',
    idempotencyKey: `user.role_changed:${input.auditEventId}`,
  };
}

function coefficientsChangedMessage(input: {
  readonly tenantId: string;
  readonly recipientUserId: string;
  readonly auditEventId: string;
}): NotificationMessage {
  return {
    tenantId: input.tenantId,
    workspaceId: null,
    recipientSubject: input.recipientUserId,
    kind: 'tenant.coefficients_changed',
    subject: '見積係数を更新しました',
    body: '見積係数を更新しました。変更内容は設定画面で確認できます。',
    idempotencyKey: `tenant.coefficients_changed:${input.auditEventId}`,
  };
}

async function dispatch(
  dispatcher: NotificationDispatcher,
  message: NotificationMessage,
  emailEnabled: boolean,
): Promise<void> {
  try {
    const failed = (await dispatcher.dispatch(message, resolveUserOrgAdminNotificationChannels(emailEnabled))).filter(
      (result) => !result.delivered,
    );
    if (failed.length > 0) console.error('[user-org-admin] 通知の一部送出に失敗しました', { failed });
  } catch (error) {
    // 通知は補助経路であるため、更新済みの業務データと監査記録をロールバックしない。
    console.error('[user-org-admin] 通知の送出に失敗しました', { error });
  }
}

export async function notifyRoleChanged(
  dispatcher: NotificationDispatcher,
  input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly emailEnabled: boolean;
    readonly auditEventId: string;
  },
): Promise<void> {
  await dispatch(dispatcher, roleChangedMessage(input), input.emailEnabled);
}

export async function notifyCoefficientsChanged(
  dispatcher: NotificationDispatcher,
  input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly emailEnabled: boolean;
    readonly auditEventId: string;
  },
): Promise<void> {
  await dispatch(dispatcher, coefficientsChangedMessage(input), input.emailEnabled);
}
