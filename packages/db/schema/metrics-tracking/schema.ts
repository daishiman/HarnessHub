/**
 * Studio 拡張: feat-metrics-tracking の永続層 (`metrics_events` / `metrics_rollups`)。
 *
 * `system-spec/00-requirements-definition.md` I10 / `docs/backend-spec.md` §6.2 が定める
 * 「実行ログ ingest (B2) → 週次 rollup (B3) → S09/S16 ダッシュボード」の DB 側を担当する。
 *
 * 本 file が守る不変条件は 3 つ。
 *
 *   1. **重複計上しない (SEC5)** — ingest は `Idempotency-Key` で冪等（べきとう＝何回実行しても
 *      結果が同じになる性質）にする。アプリ側の分岐だけに頼らず、
 *      `(tenant_id, workspace_id, idempotency_key)` の一意制約で DB 側でも二重 INSERT を不可能にする。
 *      key は 24 時間だけ有効で、期限後は旧行の key を null にして履歴を残したまま再利用できる。
 *   2. **クライアント申告時刻を保存しない (qa-032 / SEC5)** — `occurred_at` はサーバが
 *      `serverNow()` で発行した受信時刻だけを持つ。クライアントが送る「いつ実行したか」は
 *      受理しない (受理すると過去/未来へ付け替えて集計を歪められる)。受理するのは `run_count` のみ。
 *   3. **金額換算はサーバ側の結果だけを持つ** — `saved_amount` は cron が
 *      `packages/estimation` の純関数と `tenant_coefficients` から算出した値であり、
 *      クライアントが計算した金額を書く列ではない。
 *
 * 時刻列の単位は **epoch ミリ秒** で、`repository/time.ts` の `serverNow()` と本 package の
 * 既存全テーブル (builds / documents / feedbacks 等) に揃えてある。秒とミリ秒を混在させると
 * 期間境界の比較が黙って 1000 倍ずれるため、この package 内では単位を 1 つに固定する。
 */
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** rollup の粒度。cron は日次で事前集計し、週次で確定させる (B3)。 */
export const METRICS_ROLLUP_PERIODS = ['daily', 'weekly'] as const;

/**
 * rollup の集計軸。`dimension_key` の意味はこの値で決まる。
 * - `tenant`: `dimension_key` = tenant_id (テナント全体の KPI/推移)
 * - `harness`: `dimension_key` = harness_id (S16 ハーネス別・ランキング)
 * - `department`: `dimension_key` = department_id (S09 部門別)
 * - `user`: `dimension_key` = user_id (S17 個別集計。読取は admin 限定だが、その判定は route 層)
 */
export const METRICS_ROLLUP_DIMENSIONS = ['tenant', 'harness', 'department', 'user'] as const;

export const metricsEvents = sqliteTable(
  'metrics_events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    harnessId: text('harness_id').notNull(),
    /** 認証済み principal からサーバ側で付与した実行主体。 */
    actorUserId: text('actor_user_id').notNull(),
    /** 信頼できるサーバ側解決経路が無い場合は null。client body の値は保存しない。 */
    departmentId: text('department_id'),
    /** ingest が受理する唯一の実測値 (B2: 回数のみ)。分/金額はサーバ側で換算する。 */
    runCount: integer('run_count').notNull(),
    /**
     * サーバが受信した時刻 (epoch ms)。**クライアント申告時刻は保存しない** (SEC5)。
     * repository が `serverNow()` で発行し、引数からは上書きできない。
     */
    occurredAt: integer('occurred_at').notNull(),
    /** 有効期間中の `Idempotency-Key`。期限後は null にして同じ key の再利用を許す。 */
    idempotencyKey: text('idempotency_key'),
    /** client request (`harnessId` / `runCount`) の決定論的 SHA-256 digest。 */
    requestDigest: text('request_digest').notNull(),
    /** 冪等 key の有効期限 (epoch ms)。受理時刻から 24 時間。 */
    idempotencyExpiresAt: integer('idempotency_expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    // SEC5: 同一 tenant + workspace 内で同じ有効な冪等キーの行を 2 本作らせない。
    // SQLite の UNIQUE は null 同士を競合させないので、期限切れ行を null 化すれば履歴を保持できる。
    uniqueIndex('metrics_events_scope_idem_uq').on(t.tenantId, t.workspaceId, t.idempotencyKey),
    // cron の集計入力 (期間で切って全件走査) 用。
    index('metrics_events_tenant_workspace_occurred_idx').on(t.tenantId, t.workspaceId, t.occurredAt),
    // ハーネス別集計 (S16) 用。
    index('metrics_events_tenant_harness_occurred_idx').on(t.tenantId, t.harnessId, t.occurredAt),
  ],
);

export const metricsRollups = sqliteTable(
  'metrics_rollups',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    period: text('period', { enum: METRICS_ROLLUP_PERIODS }).notNull(),
    dimension: text('dimension', { enum: METRICS_ROLLUP_DIMENSIONS }).notNull(),
    /** 集計軸の値。`dimension` ごとの意味は METRICS_ROLLUP_DIMENSIONS の docblock を参照。 */
    dimensionKey: text('dimension_key').notNull(),
    /** 集計期間 [periodStart, periodEnd) (epoch ms)。半開区間で隣接期間と重複させない。 */
    periodStart: integer('period_start').notNull(),
    periodEnd: integer('period_end').notNull(),
    runCount: integer('run_count').notNull(),
    /** 削減分 (分)。`packages/estimation` の純関数がサーバ側で算出した値。 */
    savedMinutes: integer('saved_minutes').notNull(),
    /**
     * 削減金額。**最小通貨単位の整数**で持つ (JPY なら円)。
     * 浮動小数 (REAL) にしないのは、時給換算を何期間ぶんも足し合わせると誤差が累積し、
     * 「日次 rollup の総和 ≠ 週次 rollup」という再現しない不一致が生まれるため。
     * また **サーバ側換算の結果のみ**を書く (クライアント申告の金額は受理しない / SEC5)。
     */
    savedAmount: integer('saved_amount').notNull(),
    /** cron がこの行を算出した時刻 (epoch ms)。再集計で更新される。 */
    computedAt: integer('computed_at').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    // cron の再実行を冪等にする。同じ (スコープ, 期間, 軸) は常に 1 行で、再集計は UPDATE になる。
    uniqueIndex('metrics_rollups_scope_uq').on(
      t.tenantId,
      t.workspaceId,
      t.period,
      t.dimension,
      t.dimensionKey,
      t.periodStart,
    ),
    // S09/S16 の読取 (期間レンジ × 軸) 用。
    index('metrics_rollups_tenant_workspace_read_idx').on(
      t.tenantId,
      t.workspaceId,
      t.period,
      t.dimension,
      t.periodStart,
    ),
  ],
);
