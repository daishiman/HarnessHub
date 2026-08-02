/**
 * Hub API 用 fetch ラッパー (AD-1 cli/)。
 *
 * state-changing endpoint が要求する契約をここに集約する:
 * - `Authorization: Bearer <token>`
 * - `x-harness-tenant-id` / `x-harness-workspace-id` (テナント/ワークスペースの id。slug ではない —
 *   apps/hub/src/middleware/scope.ts の TENANT_HEADER/WORKSPACE_HEADER は claims.tenant_id 由来の
 *   実体 id と突き合わせるため、slug を渡すと tenant_mismatch で全リクエストが 404 になる)
 * - `Origin` (POST/PUT/PATCH/DELETE で必須。欠落は無条件で untrusted_origin 拒否)
 * - `idempotency-key` (POST/PUT で必須。8〜255 文字)
 */
export interface HubApiClientConfig {
  readonly baseUrl: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly accessToken: string;
  readonly origin: string;
}

export interface HubApiClient {
  getJson<T>(path: string): Promise<T>;
  postJson<T>(path: string, body: unknown): Promise<T>;
  putBytes<T>(path: string, body: Uint8Array): Promise<T>;
}

function createIdempotencyKey(): string {
  return `publisher-${crypto.randomUUID()}`;
}

async function readErrorDetail(response: Response): Promise<string> {
  const text = await response.text();
  return text.length > 0 ? text : response.statusText;
}

export function createHubApiClient(config: HubApiClientConfig): HubApiClient {
  const baseHeaders: Record<string, string> = {
    authorization: `Bearer ${config.accessToken}`,
    'x-harness-tenant-id': config.tenantId,
    'x-harness-workspace-id': config.workspaceId,
  };

  async function request<T>(method: string, path: string, init: RequestInit): Promise<T> {
    const response = await fetch(new URL(path, config.baseUrl), {
      ...init,
      method,
      headers: { ...baseHeaders, ...init.headers },
    });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new Error(`Hub API 呼出しに失敗しました (${method} ${path}, status=${response.status}): ${detail}`);
    }
    return (await response.json()) as T;
  }

  return {
    getJson<T>(path: string): Promise<T> {
      return request<T>('GET', path, {});
    },
    postJson<T>(path: string, body: unknown): Promise<T> {
      return request<T>('POST', path, {
        headers: {
          'content-type': 'application/json',
          origin: config.origin,
          'idempotency-key': createIdempotencyKey(),
        },
        body: JSON.stringify(body),
      });
    },
    putBytes<T>(path: string, body: Uint8Array): Promise<T> {
      return request<T>('PUT', path, {
        headers: {
          'content-type': 'application/octet-stream',
          origin: config.origin,
          'idempotency-key': createIdempotencyKey(),
        },
        body,
      });
    },
  };
}
