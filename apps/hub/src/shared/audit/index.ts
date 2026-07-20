// 監査 event logger。全変更操作を append-only で記録する共通境界 (shared-layers §2 / I8)
import type { RepositoryContext } from '@harness-hub/db';

/** 監査イベント。記録後の書換・削除は境界として提供しない (append-only) */
export interface AuditEvent {
  readonly actorSubject: string;
  readonly tenantId: string;
  readonly workspaceId: string | null;
  /** 例: 'publish_request.create'。語彙は consumer feature が定義する */
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  /** 追加情報。PII を入れてはならない (src/shared/pii の maskPii を通してから渡す) */
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
}

export interface RecordedAuditEvent extends AuditEvent {
  readonly id: string;
  /** サーバ時刻の ISO8601。クライアント申告時刻は採用しない */
  readonly recordedAt: string;
}

/** 永続化先の境界。実体 (packages/db の repository) は consumer feature が注入する */
export interface AuditSink {
  append(event: RecordedAuditEvent): Promise<void>;
}

export interface AuditLogger {
  record(event: AuditEvent): Promise<RecordedAuditEvent>;
}

export interface AuditLoggerOptions {
  readonly sink: AuditSink;
  readonly now?: () => Date;
  readonly newId?: () => string;
}

export function createAuditLogger(options: AuditLoggerOptions): AuditLogger {
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? (() => crypto.randomUUID());

  return {
    async record(event) {
      const recorded: RecordedAuditEvent = {
        ...event,
        id: newId(),
        recordedAt: now().toISOString(),
      };
      await options.sink.append(recorded);
      return recorded;
    },
  };
}

/** 監査イベントのうち、repository 操作スコープから決まらない部分 */
export type AuditEventDetail = Omit<AuditEvent, 'actorSubject' | 'tenantId' | 'workspaceId'>;

/**
 * repository 操作のスコープ (@harness-hub/db の RepositoryContext) から監査イベントを組み立てる。
 * tenantId / actor を呼び出し側で書き写さないことで、DB アクセス境界と監査記録のズレを防ぐ。
 */
export function auditEventFromContext(
  context: RepositoryContext,
  detail: AuditEventDetail,
): AuditEvent {
  return {
    ...detail,
    // actorId 未設定のスコープ (バッチ等) は 'system' として記録し、空文字で記録しない
    actorSubject: context.actorId ?? 'system',
    tenantId: context.tenantId,
    workspaceId: context.workspaceId ?? null,
  };
}

/** テスト・ローカル用の in-memory sink。読み出しは複製を返し、外部から履歴を書き換えられないようにする */
export function createInMemoryAuditSink(): AuditSink & { readonly events: () => readonly RecordedAuditEvent[] } {
  const events: RecordedAuditEvent[] = [];
  return {
    async append(event) {
      events.push(event);
    },
    events: () => [...events],
  };
}
