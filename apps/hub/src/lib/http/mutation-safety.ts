const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENTITY_NAMESPACE = /^[a-z][a-z0-9-]{0,31}$/;

export class MutationRequestError extends Error {
  readonly status: 400 | 422 | 428;

  constructor(status: 400 | 422 | 428, message: string) {
    super(message);
    this.name = 'MutationRequestError';
    this.status = status;
  }
}

export function parseIdempotencyKey(value: string | null): string {
  if (value === null || !UUID_V4.test(value)) {
    throw new MutationRequestError(400, 'Idempotency-Key に UUID v4 を指定してください');
  }
  return value.toLowerCase();
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new MutationRequestError(400, 'リクエスト本文を JSON として正規化できません');
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

export async function canonicalPayloadHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function assertNamespace(namespace: string): void {
  if (!ENTITY_NAMESPACE.test(namespace)) throw new Error(`invalid entity ETag namespace: ${namespace}`);
}

export function entityEtag(namespace: 'docs' | 'sheets', revision: number): string {
  assertNamespace(namespace);
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('entity revision must be a positive integer');
  return `"${namespace}-${revision}"`;
}

export function parseEntityIfMatch(value: string | null, namespace: 'docs' | 'sheets'): number {
  assertNamespace(namespace);
  if (value === null) {
    throw new MutationRequestError(428, `If-Match に ${namespace} entity ETag を指定してください`);
  }
  const matched = value?.match(new RegExp(`^"${namespace}-([1-9][0-9]*)"$`));
  if (matched === undefined || matched === null) {
    throw new MutationRequestError(400, `If-Match に ${namespace} entity ETag を指定してください`);
  }
  const revision = Number(matched[1]);
  if (!Number.isSafeInteger(revision)) {
    throw new MutationRequestError(400, `If-Match に ${namespace} entity ETag を指定してください`);
  }
  return revision;
}

export function mutationErrorResponse(error: MutationRequestError): Response {
  return Response.json(
    {
      type: 'about:blank',
      title: error.status === 422 ? '冪等キーの再利用を受理できません' : 'リクエストの事前条件が不正です',
      status: error.status,
      detail: error.message,
    },
    {
      status: error.status,
      headers: { 'cache-control': 'no-store', 'content-type': 'application/problem+json' },
    },
  );
}

export function entityJsonResponse(
  body: unknown,
  input: {
    readonly namespace: 'docs' | 'sheets';
    readonly revision: number;
    readonly status?: number;
    readonly idempotencyExpiresAt?: number;
    readonly idempotencyReplayed?: boolean;
  },
): Response {
  const headers = new Headers({
    'cache-control': 'no-store',
    etag: entityEtag(input.namespace, input.revision),
  });
  if (input.idempotencyExpiresAt !== undefined) {
    headers.set('idempotency-key-expires-at', String(input.idempotencyExpiresAt));
  }
  if (input.idempotencyReplayed !== undefined) {
    headers.set('idempotency-replayed', String(input.idempotencyReplayed));
  }
  return Response.json(body, { status: input.status ?? 200, headers });
}

export function buildEntityCreateWireResponse(
  body: unknown,
  input: {
    readonly namespace: 'docs' | 'sheets';
    readonly revision: number;
    readonly expiresAt: number;
  },
) {
  return {
    status: 201,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json',
      etag: entityEtag(input.namespace, input.revision),
      'idempotency-key-expires-at': String(input.expiresAt),
    },
    body: JSON.stringify(body),
  } as const;
}

export function mutationWireResponse(
  wire: {
    readonly status: number;
    readonly headers: Readonly<Record<string, string>>;
    readonly body: string;
  },
  replayed: boolean,
): Response {
  const headers = new Headers(wire.headers);
  headers.set('idempotency-replayed', String(replayed));
  return new Response(wire.body, { status: wire.status, headers });
}

export function revisionConflictResponse(
  current: unknown,
  input: { readonly namespace: 'docs' | 'sheets'; readonly revision: number },
): Response {
  return entityJsonResponse(
    {
      error: 'revision_conflict',
      message: '表示後にデータが更新されました。現在値を確認して再実行してください。',
      current,
    },
    { ...input, status: 412 },
  );
}
