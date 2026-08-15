export type EntityRevisionNamespace = 'docs' | 'sheets';

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function entityIfMatch(namespace: EntityRevisionNamespace, revision: number): string {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('entity revision must be a positive integer');
  return `"${namespace}-${revision}"`;
}

export interface RevisionConflict<TCurrent> {
  readonly current: TCurrent;
  readonly message: string;
}

export async function readRevisionConflict<TCurrent>(response: Response): Promise<RevisionConflict<TCurrent> | null> {
  if (response.status !== 412) return null;
  try {
    const body = (await response.json()) as {
      readonly error?: unknown;
      readonly message?: unknown;
      readonly current?: unknown;
    };
    if (body.error !== 'revision_conflict' || body.current === null || typeof body.current !== 'object') return null;
    return {
      current: body.current as TCurrent,
      message:
        typeof body.message === 'string'
          ? body.message
          : '表示後にデータが更新されました。現在値を確認して再実行してください。',
    };
  } catch {
    return null;
  }
}
