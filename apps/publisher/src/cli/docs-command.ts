import {
  type ExternalDocumentSyncResponse,
  externalDocumentSourceSchema,
  externalDocumentSyncResponseSchema,
} from '@harness-hub/schemas';

import { scopesForCommand } from '../auth/index.js';
import type { DocsHubApiClient, HubApiClientConfig, HubApiResponse } from './http-client.js';
import { obtainAccessToken, type SessionDeps } from './session.js';

export interface DocsCommandOptions {
  readonly tenantSlug: string;
  readonly source: string;
  readonly repositoryId: string;
  readonly relativePath: string;
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly hubBaseUrl: string;
  readonly origin: string;
  readonly force: boolean;
}

export interface DocsCommandDeps extends SessionDeps {
  readonly createHubApiClient: (config: HubApiClientConfig) => DocsHubApiClient;
}

export interface DocsCommandResult {
  readonly response: ExternalDocumentSyncResponse;
  readonly externalDocumentId: string;
}

function toHex(bytes: Uint8Array): string {
  let value = '';
  for (const byte of bytes) value += byte.toString(16).padStart(2, '0');
  return value;
}

export async function deriveExternalDocumentId(repositoryId: string, relativePath: string): Promise<string> {
  const normalizedRepository = repositoryId.trim();
  const normalizedPath = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (normalizedRepository.length === 0) throw new Error('--repository-id が空です');
  if (normalizedPath.length === 0 || normalizedPath.startsWith('/') || normalizedPath.split('/').includes('..')) {
    throw new Error('同期対象はrepository root配下の相対pathで指定してください');
  }
  const bytes = new TextEncoder().encode(`${normalizedRepository}\u0000${normalizedPath}`);
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

function requireSuccess<T>(response: HubApiResponse<T>, expected: readonly number[], operation: string): T {
  if (!expected.includes(response.status)) {
    throw new Error(`${operation}に失敗しました (status=${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function runDocsCommand(options: DocsCommandOptions, deps: DocsCommandDeps): Promise<DocsCommandResult> {
  const source = externalDocumentSourceSchema.parse(options.source);
  const externalDocumentId = await deriveExternalDocumentId(options.repositoryId, options.relativePath);
  const scope = scopesForCommand('docs');
  const { accessToken, tenantId, workspaceId } = await obtainAccessToken(deps, options.tenantSlug, scope);
  const client = deps.createHubApiClient({
    baseUrl: options.hubBaseUrl,
    tenantId,
    workspaceId,
    accessToken,
    origin: options.origin,
  });
  const path = `/api/v1/docs/imports/${encodeURIComponent(source)}/${externalDocumentId}`;
  const current = await client.getJsonResponse<unknown>(path);
  let ifMatch: string | undefined;
  if (current.status === 200) {
    const parsedCurrent = externalDocumentSyncResponseSchema.parse(current.body);
    if (parsedCurrent.sync_state === 'modified' && !options.force) {
      throw new Error('Harness Hub側で編集されています。確認後に --force true を指定してください');
    }
    if (parsedCurrent.document.status === 'published' && options.force) {
      deps.log('公開済み文書を外部版で置き換え、確認用の下書きへ戻します');
    }
    if (current.etag === null) throw new Error('Hub APIがETagを返しませんでした');
    ifMatch = current.etag;
  } else if (current.status !== 404) {
    requireSuccess(current, [200, 404], '同期状態の取得');
  }

  const synced = await client.putJsonResponse<unknown>(
    path,
    { title: options.title, body_markdown: options.bodyMarkdown },
    ifMatch === undefined ? {} : { ifMatch },
  );
  const body = requireSuccess(synced, [200, 201], 'ドキュメント同期');
  return { response: externalDocumentSyncResponseSchema.parse(body), externalDocumentId };
}
