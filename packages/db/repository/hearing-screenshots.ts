// hearing_screenshots の owner 実装。
//
// 暗号化・R2 格納・削除の機序は一切ここに持たない — 全て `TenantDataRepo` (kind='hearing_screenshot') に委譲する。
// この repository が持つのは「どの sheet のどの項目に紐づく画像か」という hearing 固有のメタデータだけ。
// 2 テーブルへの書き込みを 1 操作に見せる (upload は tenant_data_objects insert + hearing_screenshots insert)。

import { and, desc, eq } from 'drizzle-orm';
import { hearingScreenshots } from '../schema/hearing-intake/schema';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import type { TenantDataRepo } from './tenant-data';
import { serverNow } from './time';
import { newUlid } from './ulid';

export interface HearingScreenshotRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly sheetId: string;
  readonly tenantDataObjectId: string;
  readonly title: string;
  readonly linkedItem: string | null;
  readonly note: string | null;
  readonly contentType: string;
  readonly createdBy: string;
  readonly createdAt: number;
}

export interface HearingScreenshotUploadInput {
  readonly workspaceId: string;
  readonly sheetId: string;
  readonly title: string;
  readonly linkedItem?: string | null;
  readonly note?: string | null;
  readonly contentType: string;
  readonly plaintext: Uint8Array;
  readonly uploadedBy: string;
}

export interface HearingScreenshotsRepo {
  upload(context: RepositoryContext, input: HearingScreenshotUploadInput): Promise<HearingScreenshotRow>;
  listBySheetId(context: RepositoryContext, sheetId: string): Promise<readonly HearingScreenshotRow[]>;
  findById(context: RepositoryContext, id: string): Promise<HearingScreenshotRow | null>;
  getContent(context: RepositoryContext, id: string): Promise<Uint8Array>;
  deleteScreenshot(context: RepositoryContext, id: string): Promise<void>;
}

const MAX_TITLE_LENGTH = 200;

function clampMeta(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, MAX_TITLE_LENGTH);
}

export function createHearingScreenshotsRepo(
  adapter: CoreAdapter,
  tenantDataRepo: TenantDataRepo,
): HearingScreenshotsRepo {
  const scopeById = (context: RepositoryContext, id: string) =>
    and(eq(hearingScreenshots.tenantId, context.tenantId), eq(hearingScreenshots.id, id));

  async function requireRow(context: RepositoryContext, id: string): Promise<HearingScreenshotRow> {
    const rows = await adapter.client.select().from(hearingScreenshots).where(scopeById(context, id)).limit(1);
    const row = rows[0] as HearingScreenshotRow | undefined;
    if (row === undefined) throw new Error(`hearing_screenshots に見つかりません: ${id}`);
    return row;
  }

  return {
    async upload(context, input) {
      // R2 put + 暗号化は tenantDataRepo.upload に委譲する。ここで先に実体を作り、
      // 成功したときだけ hearing_screenshots のメタデータ行を insert する (孤児行を作らない順序)。
      const object = await tenantDataRepo.upload(context, {
        workspaceId: input.workspaceId,
        kind: 'hearing_screenshot',
        title: input.title,
        plaintext: input.plaintext,
        uploadedBy: input.uploadedBy,
      });

      const row: HearingScreenshotRow = {
        id: newUlid(),
        tenantId: context.tenantId,
        workspaceId: input.workspaceId,
        sheetId: input.sheetId,
        tenantDataObjectId: object.id,
        title: input.title,
        linkedItem: clampMeta(input.linkedItem),
        note: clampMeta(input.note),
        contentType: input.contentType,
        createdBy: input.uploadedBy,
        createdAt: serverNow(),
      };
      try {
        await guardedWrite(adapter, () => adapter.client.insert(hearingScreenshots).values(row));
      } catch (metadataError) {
        // tenant_data の作成後に hearing 固有 metadata の insert が失敗した場合、暗号化 blob と
        // tenant_data_objects 行を不可視のまま残さない。補償削除の監査まで失敗した場合も双方の
        // 原因を失わないよう AggregateError で返す。
        try {
          await tenantDataRepo.deleteTenantDataObject(context, object.id);
        } catch (compensationError) {
          throw new AggregateError(
            [metadataError, compensationError],
            'hearing screenshot metadata の保存と tenant_data 補償削除に失敗しました',
          );
        }
        throw metadataError;
      }
      return row;
    },

    async listBySheetId(context, sheetId) {
      const rows = await adapter.client
        .select()
        .from(hearingScreenshots)
        .where(and(eq(hearingScreenshots.tenantId, context.tenantId), eq(hearingScreenshots.sheetId, sheetId)))
        .orderBy(desc(hearingScreenshots.createdAt));
      return rows as HearingScreenshotRow[];
    },

    async findById(context, id) {
      const rows = await adapter.client.select().from(hearingScreenshots).where(scopeById(context, id)).limit(1);
      return (rows[0] as HearingScreenshotRow | undefined) ?? null;
    },

    async getContent(context, id) {
      const row = await requireRow(context, id);
      return tenantDataRepo.getContent(context, row.tenantDataObjectId);
    },

    async deleteScreenshot(context, id) {
      const row = await requireRow(context, id);
      // tenant_data の削除後、audit append だけが失敗する場合がある。また metadata delete が
      // 失敗した後の再試行では tenant_data は既に存在しない。この2状態でも metadata cleanup は
      // 必ず進める一方、実体がまだ残る失敗は安全側に倒して metadata を残す。
      let postDeleteError: unknown;
      try {
        await tenantDataRepo.deleteTenantDataObject(context, row.tenantDataObjectId);
      } catch (error) {
        const objectStillExists = await tenantDataRepo.findById(context, row.tenantDataObjectId);
        if (objectStillExists !== null) throw error;
        if (!(error instanceof EntityNotFoundError)) postDeleteError = error;
      }
      await guardedWrite(adapter, () => adapter.client.delete(hearingScreenshots).where(scopeById(context, id)));
      // audit failure はmetadata cleanup後も運用へ伝える。EntityNotFoundは「前回の削除が実体まで
      // 完了済み」という冪等再試行なので成功として畳む。
      if (postDeleteError !== undefined) throw postDeleteError;
    },
  };
}
