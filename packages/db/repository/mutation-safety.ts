import { and, asc, eq, lte, or, type SQL } from 'drizzle-orm';

import { type MUTATION_IDEMPOTENCY_RESOURCES, mutationCreateIdempotency } from '../schema/mutation-safety/schema';
import { RepositoryError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import type { CoreDb } from './db';
import { serverNow } from './time';

export const MUTATION_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;
export const MUTATION_IDEMPOTENCY_CLEANUP_LIMIT = 50;

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i;

export interface MutationIdempotencyInput {
  readonly key: string;
  readonly payloadHash: string;
  /** 決定論的な TTL 境界テスト用。本番呼出しは省略する。 */
  readonly now?: number;
}

export interface MutationWireResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  /** UTF-8 JSON response の正確な文字列。replay で mapper を再実行しない。 */
  readonly body: string;
}

export type MutationWireResponseBuilder<TEntity> = (entity: TEntity, expiresAt: number) => MutationWireResponse;

export interface PreparedMutationIdempotency {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly resource: (typeof MUTATION_IDEMPOTENCY_RESOURCES)[number];
  readonly operation: 'create';
  readonly key: string;
  readonly payloadHash: string;
  readonly now: number;
  readonly expiresAt: number;
}

export type IdempotentCreateResult<TEntity, TProperty extends string> =
  | ({
      readonly outcome: 'created';
      readonly expiresAt: number;
      readonly wireResponse: MutationWireResponse;
    } & Readonly<Record<TProperty, TEntity>>)
  | {
      readonly outcome: 'replayed';
      readonly expiresAt: number;
      readonly wireResponse: MutationWireResponse;
    }
  | { readonly outcome: 'conflict'; readonly expiresAt: number };

function validEpoch(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function prepareMutationIdempotency(
  context: RepositoryContext,
  resource: PreparedMutationIdempotency['resource'],
  input: MutationIdempotencyInput,
): PreparedMutationIdempotency {
  if (!UUID_V4_PATTERN.test(input.key)) {
    throw new RepositoryError('invalid-context', 'mutation idempotency key は UUID v4 である必要があります');
  }
  if (!SHA256_HEX_PATTERN.test(input.payloadHash)) {
    throw new RepositoryError('invalid-context', 'mutation payloadHash は SHA-256 hex である必要があります');
  }
  if (context.workspaceId === undefined || context.workspaceId.trim().length === 0) {
    throw new RepositoryError('invalid-context', 'mutation idempotency scope には workspaceId が必要です');
  }
  const now = input.now ?? serverNow();
  if (!validEpoch(now) || !Number.isSafeInteger(now + MUTATION_IDEMPOTENCY_TTL_MS)) {
    throw new RepositoryError('invalid-context', 'mutation idempotency now は有効な非負 epoch ms である必要があります');
  }
  return {
    tenantId: context.tenantId,
    workspaceId: context.workspaceId,
    resource,
    operation: 'create',
    key: input.key.toLowerCase(),
    payloadHash: input.payloadHash.toLowerCase(),
    now,
    expiresAt: now + MUTATION_IDEMPOTENCY_TTL_MS,
  };
}

export function mutationIdempotencyScope(input: PreparedMutationIdempotency): SQL {
  return and(
    eq(mutationCreateIdempotency.tenantId, input.tenantId),
    eq(mutationCreateIdempotency.workspaceId, input.workspaceId),
    eq(mutationCreateIdempotency.resource, input.resource),
    eq(mutationCreateIdempotency.operation, input.operation),
    eq(mutationCreateIdempotency.key, input.key),
  ) as SQL;
}

function assertHeaders(value: unknown, code: 'invalid-context' | 'conflict'): Readonly<Record<string, string>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RepositoryError(code, 'mutation response headers は文字列 record である必要があります');
  }
  const headers: Record<string, string> = {};
  for (const [name, headerValue] of Object.entries(value)) {
    if (name.trim().length === 0 || typeof headerValue !== 'string') {
      throw new RepositoryError(code, 'mutation response headers は空でない名前と文字列値が必要です');
    }
    headers[name] = headerValue;
  }
  return headers;
}

export function buildMutationWireResponse<TEntity>(
  builder: MutationWireResponseBuilder<TEntity>,
  entity: TEntity,
  expiresAt: number,
): MutationWireResponse {
  const built = builder(entity, expiresAt);
  if (built.status !== 201) {
    throw new RepositoryError('invalid-context', '冪等 create response status は 201 である必要があります');
  }
  if (typeof built.body !== 'string') {
    throw new RepositoryError('invalid-context', '冪等 create response body は UTF-8 JSON 文字列である必要があります');
  }
  try {
    JSON.parse(built.body);
  } catch (error) {
    throw new RepositoryError('invalid-context', '冪等 create response body は JSON である必要があります', {
      cause: error,
    });
  }
  return { status: built.status, headers: assertHeaders(built.headers, 'invalid-context'), body: built.body };
}

export function parseMutationWireResponse(input: {
  readonly responseStatus: number | null;
  readonly responseHeadersJson: string | null;
  readonly responseBody: string | null;
}): MutationWireResponse {
  if (input.responseStatus === null || input.responseHeadersJson === null || input.responseBody === null) {
    throw new RepositoryError('conflict', '冪等作成 claim に wire response が保存されていません');
  }
  try {
    return {
      status: input.responseStatus,
      headers: assertHeaders(JSON.parse(input.responseHeadersJson), 'conflict'),
      body: input.responseBody,
    };
  } catch (error) {
    if (error instanceof RepositoryError) throw error;
    throw new RepositoryError('conflict', '冪等作成 claim の wire response を読み込めません', { cause: error });
  }
}

/** expires_at index から古い順に最大 limit 件だけ消す。create transaction の作業量を一定に保つ。 */
export async function cleanupExpiredMutationIdempotency(
  db: CoreDb,
  now: number,
  deleteWhere: (where: SQL) => Promise<unknown>,
  limit = MUTATION_IDEMPOTENCY_CLEANUP_LIMIT,
): Promise<number> {
  if (!validEpoch(now) || !Number.isSafeInteger(limit) || limit < 1 || limit > MUTATION_IDEMPOTENCY_CLEANUP_LIMIT) {
    throw new RepositoryError('invalid-context', 'mutation idempotency cleanup の now/limit が不正です');
  }
  const expired = await db
    .select({
      tenantId: mutationCreateIdempotency.tenantId,
      workspaceId: mutationCreateIdempotency.workspaceId,
      resource: mutationCreateIdempotency.resource,
      operation: mutationCreateIdempotency.operation,
      key: mutationCreateIdempotency.key,
    })
    .from(mutationCreateIdempotency)
    .where(lte(mutationCreateIdempotency.expiresAt, now))
    .orderBy(asc(mutationCreateIdempotency.expiresAt))
    .limit(limit);
  if (expired.length === 0) return 0;
  await deleteWhere(
    or(
      ...expired.map((row) =>
        and(
          eq(mutationCreateIdempotency.tenantId, row.tenantId),
          eq(mutationCreateIdempotency.workspaceId, row.workspaceId),
          eq(mutationCreateIdempotency.resource, row.resource),
          eq(mutationCreateIdempotency.operation, row.operation),
          eq(mutationCreateIdempotency.key, row.key),
        ),
      ),
    ) as SQL,
  );
  return expired.length;
}
