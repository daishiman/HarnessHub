// Studio extension: feat-notion-integration (設定画面の Notion 連携)。
// workspace 単位で 1 件だけ連携情報を持つ (mode 切替は既存行の update)。
// api_key 方式の秘密は `api_key_enc` にのみ持ち、平文は DB に一切保存しない
// (`packages/db/repository/crypto.ts` の `ColumnCipher` / purpose='tenant_data' を再利用する)。

import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const NOTION_INTEGRATION_MODES = ['url', 'api_key'] as const;

export const notionIntegrations = sqliteTable(
  'notion_integrations',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    workspaceId: text('workspace_id').notNull(),
    mode: text('mode', { enum: NOTION_INTEGRATION_MODES }).notNull(),
    // url 方式では必須、api_key 方式では任意 (登録しておくと「Notion で開く」導線に使える)。
    // 必須/任意の判定はアプリ層 (contracts.ts の superRefine) が持ち、列レベルでは NULL 許容にする。
    pageUrl: text('page_url'),
    // api_key 方式のときだけ非 null。保存形式は `{key_version}:{iv}:{ct}:{tag}` (ColumnCipher.encryptColumn の戻り値そのまま)。
    apiKeyEnc: text('api_key_enc'),
    encKeyVersion: integer('enc_key_version'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    // 1 workspace につき連携は 1 つ。mode の切替は既存行の update で表現し、行を増やさない。
    uniqueIndex('notion_integrations_tenant_workspace_uq').on(t.tenantId, t.workspaceId),
  ],
);
