// tenant_data の削除 tombstone を、古い control-plane snapshot の復元時にも適用するための
// 決定論的 manifest。R2 実体は削除時に既に物理削除されるため、ここは DB 参照の再出現を防ぐ。

import { and, eq } from 'drizzle-orm';
import type { CoreAdapter, CoreDb } from '../repository/db';
import { hearingScreenshots } from '../schema/hearing-intake/schema';
import { tenantDataObjects } from '../schema/tenant-data/schema';
import { tenantDataTombstones } from '../schema/tenant-data/tombstones';
import { isTransactionalAdapter } from '../src/adapter';
import type { ParsedArtifact } from './export';

export const TENANT_DATA_TOMBSTONE_MANIFEST_FORMAT = 'harness-hub-tenant-data-tombstone-manifest';
export const TENANT_DATA_TOMBSTONE_MANIFEST_VERSION = 1;

export interface TenantDataTombstone {
  readonly id: string;
  readonly tenantId: string;
  readonly objectId: string;
  readonly r2Key: string;
  readonly deletedAt: number;
}

export interface TenantDataTombstoneManifest {
  readonly type: typeof TENANT_DATA_TOMBSTONE_MANIFEST_FORMAT;
  readonly formatVersion: typeof TENANT_DATA_TOMBSTONE_MANIFEST_VERSION;
  /** manifest を抽出した日次 export の時刻。復元対象より古い manifest を拒否するために使う。 */
  readonly sourceExportedAt: number;
  readonly tombstones: readonly TenantDataTombstone[];
}

function compareTombstones(a: TenantDataTombstone, b: TenantDataTombstone): number {
  return (
    a.tenantId.localeCompare(b.tenantId) ||
    a.objectId.localeCompare(b.objectId) ||
    a.deletedAt - b.deletedAt ||
    a.id.localeCompare(b.id)
  );
}

function isTombstone(value: unknown): value is TenantDataTombstone {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.tenantId === 'string' &&
    typeof row.objectId === 'string' &&
    typeof row.r2Key === 'string' &&
    Number.isSafeInteger(row.deletedAt) &&
    (row.deletedAt as number) >= 0
  );
}

function normalizeManifest(manifest: TenantDataTombstoneManifest): TenantDataTombstoneManifest {
  if (!Number.isSafeInteger(manifest.sourceExportedAt) || manifest.sourceExportedAt < 0) {
    throw new Error('tombstone manifest の sourceExportedAt が不正です');
  }
  const byId = new Map<string, TenantDataTombstone>();
  for (const tombstone of manifest.tombstones) {
    const existing = byId.get(tombstone.id);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(tombstone)) {
      throw new Error(`tombstone manifest の id が競合しています: ${tombstone.id}`);
    }
    byId.set(tombstone.id, tombstone);
  }
  return {
    type: TENANT_DATA_TOMBSTONE_MANIFEST_FORMAT,
    formatVersion: TENANT_DATA_TOMBSTONE_MANIFEST_VERSION,
    sourceExportedAt: manifest.sourceExportedAt,
    tombstones: [...byId.values()].sort(compareTombstones),
  };
}

/** 日次 export artifact から tombstone manifest を抽出する。 */
export function tenantDataTombstoneManifestFromArtifact(parsed: ParsedArtifact): TenantDataTombstoneManifest {
  const rows = parsed.rowsByTable.get('tenant_data_tombstones') ?? [];
  const tombstones = rows.map((row) => {
    if (!isTombstone(row)) throw new Error('tenant_data_tombstones の行が不正です');
    return row;
  });
  return normalizeManifest({
    type: TENANT_DATA_TOMBSTONE_MANIFEST_FORMAT,
    formatVersion: TENANT_DATA_TOMBSTONE_MANIFEST_VERSION,
    sourceExportedAt: parsed.header.exported_at,
    tombstones,
  });
}

/** JSON の manifest を厳密に検証して読む。 */
export function parseTenantDataTombstoneManifest(serialized: string): TenantDataTombstoneManifest {
  const parsed = JSON.parse(serialized) as Record<string, unknown>;
  if (
    parsed.type !== TENANT_DATA_TOMBSTONE_MANIFEST_FORMAT ||
    parsed.formatVersion !== TENANT_DATA_TOMBSTONE_MANIFEST_VERSION ||
    !Number.isSafeInteger(parsed.sourceExportedAt) ||
    (parsed.sourceExportedAt as number) < 0 ||
    !Array.isArray(parsed.tombstones) ||
    !parsed.tombstones.every(isTombstone)
  ) {
    throw new Error('tenant_data tombstone manifest が不正です');
  }
  return normalizeManifest({
    type: TENANT_DATA_TOMBSTONE_MANIFEST_FORMAT,
    formatVersion: TENANT_DATA_TOMBSTONE_MANIFEST_VERSION,
    sourceExportedAt: parsed.sourceExportedAt as number,
    tombstones: parsed.tombstones,
  });
}

/** 複数の世代の manifest を重複なく統合する。 */
export function mergeTenantDataTombstoneManifests(
  manifests: readonly TenantDataTombstoneManifest[],
): TenantDataTombstoneManifest {
  if (manifests.length === 0) throw new Error('統合する tombstone manifest がありません');
  return normalizeManifest({
    type: TENANT_DATA_TOMBSTONE_MANIFEST_FORMAT,
    formatVersion: TENANT_DATA_TOMBSTONE_MANIFEST_VERSION,
    sourceExportedAt: Math.max(...manifests.map((manifest) => manifest.sourceExportedAt)),
    tombstones: manifests.flatMap((manifest) => manifest.tombstones),
  });
}

/**
 * restore 後に tombstone を再登録し、削除済み object の DB 参照を消す。
 * manifest は新しい日次 export から渡すため、古い snapshot より後の削除も漏らさない。
 */
export async function applyTenantDataTombstoneManifest(
  target: CoreAdapter,
  manifest: TenantDataTombstoneManifest,
): Promise<number> {
  const normalized = normalizeManifest(manifest);
  for (const tombstone of normalized.tombstones) {
    const applyOne = async (db: CoreDb): Promise<void> => {
      await db.insert(tenantDataTombstones).values(tombstone).onConflictDoNothing();
      // 古い snapshot に screenshot metadata があっても、対応する暗号化 object が tombstone 済みなら
      // dangling metadata を残さない。同一objectIdでも別tenantの行は消さない。
      await db
        .delete(hearingScreenshots)
        .where(
          and(
            eq(hearingScreenshots.tenantDataObjectId, tombstone.objectId),
            eq(hearingScreenshots.tenantId, tombstone.tenantId),
          ),
        );
      await db
        .delete(tenantDataObjects)
        .where(and(eq(tenantDataObjects.id, tombstone.objectId), eq(tenantDataObjects.tenantId, tombstone.tenantId)));
    };
    if (isTransactionalAdapter(target)) {
      await target.transaction((tx) => applyOne(tx.client));
    } else {
      await applyOne(target.client);
    }
  }
  return normalized.tombstones.length;
}
