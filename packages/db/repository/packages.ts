// packages テーブル (R2 PackageRegistry への参照, C4) の DB 側リポジトリ。
// content-addressed 共有のため tenant 非スコープ (到達可能性は releases 経由の認可で制御)。
// R2 実体の put/get は registry/ (createPackageRegistry) の責務。

import { eq } from 'drizzle-orm';
import { packages } from '../schema/core/catalog';
import type { CoreAdapter } from './db';
import { serverNow } from './time';

export interface PackageRefRow {
  readonly contentHash: string;
  readonly r2Key: string;
  readonly sizeBytes: number;
  readonly kind: 'skills-package';
  readonly createdAt: number;
}

export interface PackagesRepo {
  /** 同一 content_hash の再登録は no-op (冪等・immutable)。 */
  record(input: {
    readonly contentHash: string;
    readonly r2Key: string;
    readonly sizeBytes: number;
    readonly kind: 'skills-package';
  }): Promise<PackageRefRow>;
  findByHash(contentHash: string): Promise<PackageRefRow | null>;
}

export function createPackagesRepo(adapter: CoreAdapter): PackagesRepo {
  return {
    async record(input) {
      await adapter.client
        .insert(packages)
        .values({ ...input, createdAt: serverNow() })
        .onConflictDoNothing();
      const rows = await adapter.client
        .select()
        .from(packages)
        .where(eq(packages.contentHash, input.contentHash))
        .limit(1);
      return rows[0] as PackageRefRow;
    },

    async findByHash(contentHash) {
      const rows = await adapter.client.select().from(packages).where(eq(packages.contentHash, contentHash)).limit(1);
      return (rows[0] as PackageRefRow | undefined) ?? null;
    },
  };
}
