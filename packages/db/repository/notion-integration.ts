// notion_integrations の owner 実装 (feat-notion-integration)。
// 1 workspace 1 件の upsert のみを提供する (mode 切替は既存行の update)。
// api_key の暗号化・復号は tenant-data.ts の upload/getContent と同じ手順
// (ColumnCipher の 'tenant_data' purpose を再利用、AAD は table/column/rowId)。

import { and, eq } from 'drizzle-orm';
import { notionIntegrations } from '../schema/notion-integration/schema';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { ColumnCipher } from './crypto';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

export type NotionIntegrationMode = 'url' | 'api_key';

export interface NotionIntegrationRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly mode: NotionIntegrationMode;
  readonly pageUrl: string | null;
  readonly apiKeyEnc: string | null;
  readonly encKeyVersion: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface UpsertNotionIntegrationInput {
  readonly workspaceId: string;
  readonly mode: NotionIntegrationMode;
  readonly pageUrl: string | null;
  /** 平文 API キー。undefined なら既存の暗号化値を変えない (画面が空欄のまま保存した場合)。null なら削除する。 */
  readonly apiKey?: string | null;
}

export interface NotionIntegrationRepo {
  get(context: RepositoryContext, workspaceId: string): Promise<NotionIntegrationRow | null>;
  /** 平文 API キーを復号して返す。現在は表示マスクの生成専用で、呼び出し側はログへ出さないこと。 */
  decryptApiKey(context: RepositoryContext, row: NotionIntegrationRow): Promise<string>;
  upsert(context: RepositoryContext, input: UpsertNotionIntegrationInput): Promise<NotionIntegrationRow>;
  deleteIntegration(context: RepositoryContext, workspaceId: string): Promise<void>;
}

export function createNotionIntegrationRepo(adapter: CoreAdapter, cipher: ColumnCipher): NotionIntegrationRepo {
  async function findRow(context: RepositoryContext, workspaceId: string): Promise<NotionIntegrationRow | null> {
    const rows = await adapter.client
      .select()
      .from(notionIntegrations)
      .where(and(eq(notionIntegrations.tenantId, context.tenantId), eq(notionIntegrations.workspaceId, workspaceId)))
      .limit(1);
    return (rows[0] as NotionIntegrationRow | undefined) ?? null;
  }

  async function requireRow(context: RepositoryContext, workspaceId: string): Promise<NotionIntegrationRow> {
    const row = await findRow(context, workspaceId);
    if (row === null) throw new EntityNotFoundError('notion_integrations', workspaceId);
    return row;
  }

  return {
    async get(context, workspaceId) {
      return findRow(context, workspaceId);
    },

    async decryptApiKey(context, row) {
      if (row.apiKeyEnc === null) {
        throw new EntityNotFoundError('notion_integrations.api_key_enc', row.id);
      }
      return cipher.decryptColumn(
        'tenant_data',
        row.apiKeyEnc,
        { table: 'notion_integrations', column: 'api_key_enc', rowId: row.id },
        context.tenantId,
      );
    },

    async upsert(context, input) {
      const existing = await findRow(context, input.workspaceId);
      const id = existing?.id ?? newUlid();
      const now = serverNow();

      // api_key が渡らなかった (undefined) 場合は既存の暗号化値を維持する。
      // null は「明示的に削除 (url 方式へ切替 等)」を表す。
      let apiKeyEnc = existing?.apiKeyEnc ?? null;
      let encKeyVersion = existing?.encKeyVersion ?? null;
      if (input.apiKey === null) {
        apiKeyEnc = null;
        encKeyVersion = null;
      } else if (input.apiKey !== undefined) {
        encKeyVersion = await cipher.ensureActiveDek('tenant_data', context.tenantId);
        apiKeyEnc = await cipher.encryptColumn(
          'tenant_data',
          input.apiKey,
          { table: 'notion_integrations', column: 'api_key_enc', rowId: id },
          context.tenantId,
        );
      }

      const row: NotionIntegrationRow = {
        id,
        tenantId: context.tenantId,
        workspaceId: input.workspaceId,
        mode: input.mode,
        pageUrl: input.pageUrl,
        apiKeyEnc,
        encKeyVersion,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await guardedWrite(adapter, () =>
        adapter.client
          .insert(notionIntegrations)
          .values(row)
          .onConflictDoUpdate({
            target: [notionIntegrations.tenantId, notionIntegrations.workspaceId],
            set: {
              // concurrent first upsert では両方の caller が別々の id を生成し得る。
              // apiKeyEnc の AAD に使った id と DB に残る id を同じ文で更新し、
              // 「暗号文だけが敗者の id で書き換わる」状態を作らない。
              id: row.id,
              mode: row.mode,
              pageUrl: row.pageUrl,
              apiKeyEnc: row.apiKeyEnc,
              encKeyVersion: row.encKeyVersion,
              updatedAt: row.updatedAt,
            },
          }),
      );
      return row;
    },

    async deleteIntegration(context, workspaceId) {
      await requireRow(context, workspaceId);
      await guardedWrite(adapter, () =>
        adapter.client
          .delete(notionIntegrations)
          .where(
            and(eq(notionIntegrations.tenantId, context.tenantId), eq(notionIntegrations.workspaceId, workspaceId)),
          ),
      );
    },
  };
}
