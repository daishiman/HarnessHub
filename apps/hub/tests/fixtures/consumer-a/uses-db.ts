// 第 2 consumer 系統による @harness-hub/db の利用。public API 経由のみ。
// packages/db は境界と型だけを所有する (ADR §11.3-7) ため、ここで確かめるのは
// 「境界型と生成関数が consumer から参照可能であること」までで、スキーマ実体には触れない。
import {
  createRepositoryContext,
  DATABASE_DRIVERS,
  emptyPage,
  isDatabaseDriver,
  normalizePageRequest,
  type Page,
  type PageRequest,
  type RepositoryContext,
  type SortDirection,
} from '@harness-hub/db';

export const boundCreateRepositoryContext = createRepositoryContext;
export const boundNormalizePageRequest = normalizePageRequest;
export const boundDatabaseDrivers = DATABASE_DRIVERS;

/** 監査ログ側 (uses-audit) と共有するスコープ。境界型をそのまま使う */
export const sampleContext: RepositoryContext = createRepositoryContext({
  tenantId: 'tenant-a',
  workspaceId: 'workspace-1',
  actorId: 'user-1',
});

export const sampleSortDirection: SortDirection = 'asc';

export function normalizeSample(request?: PageRequest): PageRequest {
  return normalizePageRequest(request);
}

export function emptyResultPage(): Page<string> {
  return emptyPage<string>();
}

export function supportsDriver(name: string): boolean {
  return isDatabaseDriver(name);
}
