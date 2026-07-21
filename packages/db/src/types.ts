// repository 層の共通型。テナントスコープ・ページング・並び順の語彙をここに一元化する。

import type { QueryFilter } from './drizzle';

/**
 * DB アクセスのスコープ。全 repository 操作の第 1 引数として必須にすることで、
 * テナント境界を渡し忘れる実装を型レベルで防ぐ (D4 row-level の実装リスク低減)。
 * 認可判定そのものは apps/hub の認可 middleware の責務であり、ここでは行わない。
 */
export interface RepositoryContext {
  readonly tenantId: string;
  readonly workspaceId?: string;
  /** 監査 event logger へ引き渡す操作主体。 */
  readonly actorId?: string;
}

export type SortDirection = 'asc' | 'desc';

/** 並び順の指定。field 名の妥当性は entity を持つ側が担保する。 */
export interface SortSpec {
  readonly field: string;
  readonly direction: SortDirection;
}

/** ページ要求 (cursor ベース)。 */
export interface PageRequest {
  readonly limit: number;
  readonly cursor?: string;
}

/** ページ応答。nextCursor が null なら以降のページは無い。 */
export interface Page<TItem> {
  readonly items: readonly TItem[];
  readonly nextCursor: string | null;
}

/** 検索条件。filter は drizzle の式をそのまま受ける。 */
export interface QueryCriteria {
  readonly filter?: QueryFilter;
  readonly sort?: readonly SortSpec[];
  readonly page?: PageRequest;
}
