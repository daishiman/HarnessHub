// 通知ディスパッチ。アプリ内通知とメール通知の送出先差をこの境界に閉じる (shared-layers §2 / B8)

export type NotificationChannel = 'in_app' | 'email';

export interface NotificationMessage {
  readonly tenantId: string;
  readonly workspaceId: string | null;
  readonly recipientSubject: string;
  /** 通知種別。文面テンプレートの選択は consumer feature の責務 */
  readonly kind: string;
  readonly subject: string;
  /** 平易な日本語 + 次の一手 (shared-layers §1 の通知表示フォーマットに合わせる) */
  readonly body: string;
  /** 同一通知の二重送信を防ぐ冪等キー */
  readonly idempotencyKey: string;
}

export interface NotificationDeliveryResult {
  readonly channel: NotificationChannel;
  readonly delivered: boolean;
  readonly detail?: string;
}

/** channel ごとの送出実装。メール SaaS などの外部依存はここから先に閉じる */
export interface NotificationTransport {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<void>;
}

export interface NotificationDispatcher {
  dispatch(
    message: NotificationMessage,
    channels: readonly NotificationChannel[],
  ): Promise<readonly NotificationDeliveryResult[]>;
}

export interface NotificationDispatcherOptions {
  readonly transports: readonly NotificationTransport[];
}

export function createNotificationDispatcher(options: NotificationDispatcherOptions): NotificationDispatcher {
  const byChannel = new Map(options.transports.map((t) => [t.channel, t]));

  return {
    async dispatch(message, channels) {
      const results: NotificationDeliveryResult[] = [];
      for (const channel of channels) {
        const transport = byChannel.get(channel);
        if (transport === undefined) {
          // 未登録 channel は「送れなかった」として記録する。黙って成功にしない
          results.push({ channel, delivered: false, detail: 'transport_not_registered' });
          continue;
        }
        try {
          await transport.send(message);
          results.push({ channel, delivered: true });
        } catch (error) {
          // 1 channel の失敗で他 channel の送出を止めない
          results.push({
            channel,
            delivered: false,
            detail: error instanceof Error ? error.message : 'unknown_error',
          });
        }
      }
      return results;
    },
  };
}
