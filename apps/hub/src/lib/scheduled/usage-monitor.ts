// Turso / R2 使用量監視 (feat-tenant-data-retention AD-5 / infrastructure-spec §4,§5)。
// 既存日次 cron の「② Turso 使用量監視」を実装するジョブ。R2 (業務データ・PackageRegistry) の
// ストレージ使用量もここへ統合する (AD-5: 新規 cron を増やさず既存ステップへ追加する)。
//
// 通知の永続化・一覧表示は別途通知基盤 feature のスコープ (2026-08-03 ユーザー確認)。
// ここでは NotificationDispatcher の in_app channel を Workers の構造化ログ出力として最小実装する。
// DB へ保存し admin 画面へ一覧表示する実装は、通知基盤 feature が transport を差し替えるだけで足りるよう
// NotificationTransport の境界のみを使う。

import {
  createNotificationDispatcher,
  type NotificationMessage,
  type NotificationTransport,
} from '../../shared/notification/index.js';
import type { CronJob, CronJobContext } from '../../worker/cron.js';

/** R2Bucket の list() だけを使う構造型 (health probes.ts の R2HeadCapable と同じ考え方) */
export interface R2ListCapable {
  list(options?: { readonly cursor?: string }): Promise<{
    readonly objects: readonly { readonly size: number }[];
    readonly truncated: boolean;
    readonly cursor?: string;
  }>;
}

export interface UsageMonitorEnv {
  /** Turso Platform API token (DB 接続用の TURSO_AUTH_TOKEN とは別物)。未投入なら Turso 監視をスキップする */
  readonly TURSO_API_TOKEN?: string;
  readonly TURSO_ORG_SLUG?: string;
  readonly TURSO_DATABASE_NAME?: string;
  readonly TENANT_DATA_BUCKET?: unknown;
  readonly PACKAGES_BUCKET?: unknown;
  readonly [key: string]: unknown;
}

/** infrastructure-spec §4: Turso 無料枠 (2026-07-17 公式確認) */
export const TURSO_FREE_LIMITS = {
  storageBytes: 5 * 1024 ** 3,
  rowsReadPerMonth: 500_000_000,
  rowsWrittenPerMonth: 10_000_000,
} as const;

/** infrastructure-spec §3 / AD-5: R2 無料枠。Class A/B ops 数はこの binding からは測定不能 (P05 実装ノート) */
export const R2_FREE_LIMITS = { storageBytes: 10 * 1024 ** 3 } as const;

const WARNING_RATIO = 0.7;
const CRITICAL_RATIO = 0.9;

export type UsageSeverity = 'ok' | 'warning' | 'critical';

/** AD-5: 70% で admin 通知・90% で R4-reopen 起票を促す (Turso 監視と同一閾値を R2 にも踏襲) */
export function evaluateUsageRatio(current: number, limit: number): UsageSeverity {
  if (limit <= 0) return 'ok';
  const ratio = current / limit;
  if (ratio >= CRITICAL_RATIO) return 'critical';
  if (ratio >= WARNING_RATIO) return 'warning';
  return 'ok';
}

export interface TursoUsageTotals {
  readonly rowsRead: number;
  readonly rowsWritten: number;
  readonly storageBytes: number;
}

export interface FetchTursoUsageDeps {
  readonly fetchImpl?: typeof fetch;
  /** テストで固定するための現在時刻。既定は Date.now() */
  readonly now?: Date;
}

/**
 * Turso Platform API の database usage を取得する。
 * https://docs.turso.tech/api-reference/databases/usage
 * (GET /v1/organizations/{organizationSlug}/databases/{databaseName}/usage?from=&to=)
 *
 * 必要な secret (TURSO_API_TOKEN 等) が未投入の環境では `null` を返し、監視をスキップする。
 * DB 接続そのもの (TURSO_DATABASE_URL/TURSO_AUTH_TOKEN) が必須なのに対し、
 * Platform API token は使用量監視だけの追加権限のため、未投入を実行時エラーにしない。
 */
export async function fetchTursoUsage(
  env: UsageMonitorEnv,
  deps: FetchTursoUsageDeps = {},
): Promise<TursoUsageTotals | null> {
  const token = nonEmpty(env.TURSO_API_TOKEN);
  const orgSlug = nonEmpty(env.TURSO_ORG_SLUG);
  const databaseName = nonEmpty(env.TURSO_DATABASE_NAME);
  if (token === null || orgSlug === null || databaseName === null) return null;

  const now = deps.now ?? new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const url = `https://api.turso.tech/v1/organizations/${orgSlug}/databases/${databaseName}/usage?from=${from.toISOString()}&to=${now.toISOString()}`;

  const doFetch = deps.fetchImpl ?? globalThis.fetch;
  const response = await doFetch(url, { headers: { authorization: `Bearer ${token}` } });
  // 応答本文には組織固有の識別子が混ざりうるので、外に出すのは HTTP status だけにする
  if (!response.ok) throw new Error(`turso_usage_http_${response.status}`);

  const payload = (await response.json()) as {
    readonly database?: {
      readonly total?: {
        readonly rows_read?: number;
        readonly rows_written?: number;
        readonly storage_bytes?: number;
      };
    };
  };
  const total = payload.database?.total;
  if (total === undefined) throw new Error('turso_usage_response_malformed');

  return {
    rowsRead: total.rows_read ?? 0,
    rowsWritten: total.rows_written ?? 0,
    storageBytes: total.storage_bytes ?? 0,
  };
}

/** R2 bucket.list() をページングしてオブジェクトサイズを積算する (集計 API が無いための唯一の手段) */
export async function measureR2StorageBytes(bucket: R2ListCapable): Promise<number> {
  let total = 0;
  let cursor: string | undefined;
  do {
    const page = await bucket.list(cursor === undefined ? undefined : { cursor });
    for (const object of page.objects) total += object.size;
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor !== undefined);
  return total;
}

function isR2ListCapable(value: unknown): value is R2ListCapable {
  return typeof value === 'object' && value !== null && typeof (value as R2ListCapable).list === 'function';
}

function nonEmpty(value: string | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

interface UsageFinding {
  readonly metric: string;
  readonly label: string;
  readonly current: number;
  readonly limit: number;
  readonly severity: UsageSeverity;
}

function findExceeded(findings: readonly UsageFinding[]): readonly UsageFinding[] {
  return findings.filter((f) => f.severity !== 'ok');
}

/**
 * NotificationDispatcher の in_app channel を Workers 構造化ログとして最小実装する transport。
 * DB 保存・admin 画面での一覧表示は別途通知基盤 feature のスコープ (2026-08-03 ユーザー確認)。
 */
export function createLogInAppTransport(): NotificationTransport {
  return {
    channel: 'in_app',
    send: async (message) => {
      console.log(JSON.stringify({ event: 'usage_monitor.notification', ...message }));
    },
  };
}

function buildMessage(context: CronJobContext, finding: UsageFinding): NotificationMessage {
  const percent = Math.round((finding.current / finding.limit) * 100);
  return {
    // 運用通知はテナント横断 (provider-admin 向け) で、特定テナントに属さない。
    // NotificationMessage.tenantId は必須項目のため 'platform' を宛先の意味を持たない sentinel として使う。
    tenantId: 'platform',
    workspaceId: null,
    recipientSubject: 'provider-admin',
    kind: `usage.${finding.metric}_threshold`,
    subject: `${finding.label}の使用量が${percent}%に到達しました (${finding.severity})`,
    body:
      finding.severity === 'critical'
        ? `${finding.label}が無料枠の90%を超えました。保持期間導入 (R4) の検討を起票してください。`
        : `${finding.label}が無料枠の70%を超えました。今後の推移を確認してください。`,
    idempotencyKey: `${context.runKey}:${finding.metric}`,
  };
}

export interface UsageMonitorDeps {
  readonly fetchImpl?: typeof fetch;
  readonly transport?: NotificationTransport;
}

export function createUsageMonitorJob(deps: UsageMonitorDeps = {}): CronJob {
  const dispatcher = createNotificationDispatcher({
    transports: [deps.transport ?? createLogInAppTransport()],
  });

  return {
    id: 'turso-usage-monitor',
    async run(context: CronJobContext) {
      const env = context.env as UsageMonitorEnv;
      const findings: UsageFinding[] = [];

      const tursoUsage = await fetchTursoUsage(env, deps.fetchImpl === undefined ? {} : { fetchImpl: deps.fetchImpl });
      if (tursoUsage !== null) {
        findings.push(
          {
            metric: 'turso_storage',
            label: 'Turso ストレージ',
            current: tursoUsage.storageBytes,
            limit: TURSO_FREE_LIMITS.storageBytes,
            severity: evaluateUsageRatio(tursoUsage.storageBytes, TURSO_FREE_LIMITS.storageBytes),
          },
          {
            metric: 'turso_rows_read',
            label: 'Turso 読取行数 (月次)',
            current: tursoUsage.rowsRead,
            limit: TURSO_FREE_LIMITS.rowsReadPerMonth,
            severity: evaluateUsageRatio(tursoUsage.rowsRead, TURSO_FREE_LIMITS.rowsReadPerMonth),
          },
          {
            metric: 'turso_rows_written',
            label: 'Turso 書込行数 (月次)',
            current: tursoUsage.rowsWritten,
            limit: TURSO_FREE_LIMITS.rowsWrittenPerMonth,
            severity: evaluateUsageRatio(tursoUsage.rowsWritten, TURSO_FREE_LIMITS.rowsWrittenPerMonth),
          },
        );
      }

      const buckets: readonly (readonly [string, string, unknown])[] = [
        ['r2_tenant_data', 'R2 業務データバケット', env.TENANT_DATA_BUCKET],
        ['r2_packages', 'R2 PackageRegistry バケット', env.PACKAGES_BUCKET],
      ];
      for (const [metric, label, bucket] of buckets) {
        if (!isR2ListCapable(bucket)) continue;
        const storageBytes = await measureR2StorageBytes(bucket);
        findings.push({
          metric,
          label,
          current: storageBytes,
          limit: R2_FREE_LIMITS.storageBytes,
          severity: evaluateUsageRatio(storageBytes, R2_FREE_LIMITS.storageBytes),
        });
      }

      for (const finding of findExceeded(findings)) {
        await dispatcher.dispatch(buildMessage(context, finding), ['in_app']);
      }
    },
  };
}
