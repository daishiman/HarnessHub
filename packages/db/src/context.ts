// RepositoryContext の生成境界。空スコープでの DB アクセスを入口で止める。

import { RepositoryError } from './errors';
import type { RepositoryContext } from './types';

/**
 * 生成時の入力。apps/hub 側の tsconfig 設定に依存せず渡せるよう、
 * 省略可能項目は明示的に `| undefined` を許容する。
 */
export interface RepositoryContextInput {
  readonly tenantId: string;
  readonly workspaceId?: string | undefined;
  readonly actorId?: string | undefined;
}

/** 空文字・空白のみの識別子を弾く (スコープが実質無効化されるのを防ぐ)。 */
function assertIdentifier(field: string, value: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RepositoryError('invalid-context', `${field} は空にできません`);
  }
  return value;
}

/**
 * RepositoryContext を生成する。
 * tenantId は必須で空を許さない。認可判定そのものは行わない (apps/hub の認可 middleware の責務)。
 */
export function createRepositoryContext(input: RepositoryContextInput): RepositoryContext {
  const context: {
    tenantId: string;
    workspaceId?: string;
    actorId?: string;
  } = { tenantId: assertIdentifier('tenantId', input.tenantId) };

  if (input.workspaceId !== undefined) {
    context.workspaceId = assertIdentifier('workspaceId', input.workspaceId);
  }
  if (input.actorId !== undefined) {
    context.actorId = assertIdentifier('actorId', input.actorId);
  }

  return Object.freeze(context);
}
