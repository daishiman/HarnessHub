// production smoke の使い捨て fixture を安全に回収するための lease 台帳。
//
// tenant の表示名や slug は利用者データであり、文字列 marker を埋めても署名された削除権限には
// ならない。物理削除を許可する唯一の根拠をこの専用テーブルへ分離し、fixture 作成 transaction の
// 中で tenant と同時に登録する。migration は CREATE TABLE / CREATE INDEX だけの expand-only。

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const smokeFixtureLeases = sqliteTable(
  'smoke_fixture_leases',
  {
    /** 1 tenant に lease は 1 件だけ。これが cleanup の削除 authority になる。 */
    tenantId: text('tenant_id').primaryKey(),
    /** GitHub Actions run + attempt、またはローカル実行を一意にする識別子。 */
    runId: text('run_id').notNull(),
    /** どの production smoke が作った fixture か。全 runner の lifecycle 参加確認にも使う。 */
    kind: text('kind', { enum: ['database', 'hearing', 'coverage', 'publish'] }).notNull(),
    /** この時刻以降、独立 sweeper が別 run の fixture を回収してよい (epoch milliseconds)。 */
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('smoke_fixture_leases_expires_idx').on(t.expiresAt), index('smoke_fixture_leases_run_idx').on(t.runId)],
);
