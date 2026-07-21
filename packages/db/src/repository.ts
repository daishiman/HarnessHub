// repository interface (汎用 CRUD の口) と生成境界。実装本体は entity を持つ feature 側に置く。

import type { DatabaseAdapter } from './adapter';
import type { DrizzleSchema } from './drizzle';
import { RepositoryError } from './errors';
import type { Page, PageRequest, QueryCriteria, RepositoryContext } from './types';

/** ページサイズの既定値と上限。無制限取得による Worker 実行時間超過を境界で防ぐ。 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * ページ要求を正規化する。limit 未指定は既定値、上限超過は上限へ丸め、
 * 不正値 (0 以下・非整数) は拒否する。
 */
export function normalizePageRequest(request?: PageRequest): PageRequest {
  if (request === undefined) {
    return { limit: DEFAULT_PAGE_SIZE };
  }
  const { limit } = request;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RepositoryError('invalid-page-request', 'limit は 1 以上の整数である必要があります');
  }
  const clamped = Math.min(limit, MAX_PAGE_SIZE);
  return request.cursor === undefined ? { limit: clamped } : { limit: clamped, cursor: request.cursor };
}

/** 空ページ。 */
export function emptyPage<TItem>(): Page<TItem> {
  return { items: [], nextCursor: null };
}

/**
 * 汎用 CRUD の口。全メソッドが RepositoryContext を必須で取り、テナント境界を伴わない
 * DB アクセスを型レベルで作れないようにする。
 * 具体的な entity 型・実装は feat-domain-model-db 側で与える。
 */
export interface Repository<TEntity, TId = string, TInsert = TEntity, TUpdate = Partial<TInsert>> {
  findById(context: RepositoryContext, id: TId): Promise<TEntity | null>;
  findMany(context: RepositoryContext, criteria?: QueryCriteria): Promise<Page<TEntity>>;
  insert(context: RepositoryContext, values: TInsert): Promise<TEntity>;
  update(context: RepositoryContext, id: TId, values: TUpdate): Promise<TEntity>;
  delete(context: RepositoryContext, id: TId): Promise<void>;
}

/** 読み取り専用の口。集計 view など、書き込みを持たせたくない対象に使う。 */
export type ReadOnlyRepository<TEntity, TId = string> = Pick<Repository<TEntity, TId>, 'findById' | 'findMany'>;

/**
 * repository の生成境界。adapter を受け取って repository を返す関数として統一することで、
 * driver 差 (D2 ヘッジ) の吸収点を 1 箇所に固定する。
 */
export type RepositoryFactory<TRepository, TSchema extends DrizzleSchema = DrizzleSchema, TClient = unknown> = (
  adapter: DatabaseAdapter<TSchema, TClient>,
) => TRepository;

/**
 * factory を型推論つきで定義するための識別関数。
 * 実行時の振る舞いは持たない (境界の形を揃えるためだけの薄いヘルパ)。
 */
export function defineRepositoryFactory<TRepository, TSchema extends DrizzleSchema = DrizzleSchema, TClient = unknown>(
  factory: RepositoryFactory<TRepository, TSchema, TClient>,
): RepositoryFactory<TRepository, TSchema, TClient> {
  return factory;
}
