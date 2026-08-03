/**
 * `CatalogPort` の HTTP 実装 (ADR §2.1)。
 *
 * ここが**唯一 fetch を書く場所**。UI 部品に fetch を散らすと、テナントヘッダの付け忘れが
 * 1 箇所でも起きた時点でテナント分離が崩れる。付与を 1 関数に集約して機械的に守る。
 */

import type { CatalogListQuery } from '@harness-hub/schemas';
import type { ZodType } from 'zod';

import { classifyCatalogFailure } from './degradation.js';
import { parseRetryAfterSeconds } from './polling.js';
import type { CatalogFailure, CatalogPort, CatalogResult, CatalogScope } from './ports.js';

const TENANT_HEADER = 'x-harness-tenant-id';
const WORKSPACE_HEADER = 'x-harness-workspace-id';

/** 既定の API 基点。相対 path のまま same-origin へ出す。 */
const API_BASE = '/api/v1';

function failure(
  kind: CatalogFailure['kind'],
  status: number | null,
  message: string,
  retryAfterSeconds: number | null = null,
): CatalogResult<never> {
  return { ok: false, failure: { kind, status, message, retryAfterSeconds } };
}

/**
 * テナント境界の検証。
 *
 * **空を「全件」と解釈しない**。scope が欠けた状態で問い合わせると、
 * サーバ実装によってはテナント横断の結果が返り得る。client 側でも deny-by-default にする。
 */
function scopeHeaders(scope: CatalogScope): Record<string, string> | null {
  const tenantId = scope.tenantId.trim();
  const workspaceId = scope.workspaceId.trim();
  if (tenantId === '' || workspaceId === '') return null;
  return { [TENANT_HEADER]: tenantId, [WORKSPACE_HEADER]: workspaceId };
}

/**
 * fetch の引数。`RequestInit` をそのまま使わないのは `exactOptionalPropertyTypes: true` 下で
 * `signal?: AbortSignal | undefined` を `signal: AbortSignal | null` へ渡せないため。
 * undefined の項目は組み立て時に落とす。
 */
interface CatalogRequestInit {
  method: string;
  signal?: AbortSignal | undefined;
  headers?: Record<string, string> | undefined;
  body?: string | undefined;
}

/**
 * 応答検証スキーマは**動的 import で遅延させる** (G13 client JS 予算)。
 *
 * 実測 (2026-08-01): 静的 import では zod + 契約一式 18.3 KiB(gzip) が catalog 3 ルートすべての
 * **初回チャンク**に載り、`/catalog/[projectId]` が 139.6 KiB と予算 120.0 KiB を超えた。
 * 検証を外す選択は取らない — 契約違反の応答をそのまま描くと誤った導入情報を出しうる (§2.1)。
 * 初回描画に検証器は要らないので、必要になる瞬間まで読み込みを遅らせるだけにする。
 * import は fetch の**前**に開始して並走させるため、往復が増えることはない。
 */
type CatalogSchemas = typeof import('@harness-hub/schemas');
type SchemaSelector<T> = (schemas: CatalogSchemas) => ZodType<T>;

async function request<T>(
  path: string,
  scope: CatalogScope,
  selectSchema: SchemaSelector<T>,
  init: CatalogRequestInit,
): Promise<CatalogResult<T>> {
  const headers = scopeHeaders(scope);
  if (headers === null) {
    return failure('forbidden', null, 'Workspace が特定できないため表示できません。');
  }

  // scope 検証を通ってから読み込む。送らない要求のために chunk を取りに行かない。
  // 応答が失敗して検証まで到達しない経路でも未処理の拒否を残さないよう、ここで結果を包んでおく
  const schemasPromise = import('@harness-hub/schemas').then(
    (schemas) => schemas,
    () => null,
  );

  const requestInit: RequestInit = {
    method: init.method,
    credentials: 'same-origin',
    headers: { ...headers, ...init.headers },
  };
  if (init.signal !== undefined) requestInit.signal = init.signal;
  if (init.body !== undefined) requestInit.body = init.body;

  let response: Response;
  try {
    response = await fetch(path, requestInit);
  } catch {
    // ネットワーク到達不能。Hub 停止と同じ扱いにする (§6.1)
    return failure('degraded', null, 'Hub に接続できません。導入済みのツールはそのまま使えます。');
  }

  if (!response.ok) {
    const kind = classifyCatalogFailure(response.status);
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('retry-after'));
    return failure(kind, response.status, failureMessage(kind), retryAfterSeconds);
  }

  const schemas = await schemasPromise;
  if (schemas === null) {
    // 検証器そのものを取得できない = 実質オフライン。Hub 停止と同じ縮退へ寄せる (§6.1)
    return failure('degraded', response.status, 'Hub に接続できません。導入済みのツールはそのまま使えます。');
  }

  const parsed = selectSchema(schemas).safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    // 契約違反の応答を UI が推測で補完すると、誤った導入情報を表示しうる
    return failure('fatal', response.status, '表示できない形式のデータが返りました。');
  }
  return { ok: true, value: parsed.data };
}

function failureMessage(kind: CatalogFailure['kind']): string {
  switch (kind) {
    case 'degraded':
      return 'Hub が一時的に応答していません。導入済みのツールはそのまま使えます。';
    case 'unauthorized':
      return 'サインインが必要です。';
    case 'forbidden':
      return 'この操作を行う権限がありません。';
    case 'fatal':
      return '表示できませんでした。時間をおいて再度お試しください。';
  }
}

function toSearchParams(query: CatalogListQuery): string {
  const params = new URLSearchParams();
  if (query.target !== undefined) params.set('target', query.target);
  if (query.q !== undefined && query.q !== '') params.set('q', query.q);
  if (query.cursor !== undefined) params.set('cursor', query.cursor);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const serialized = params.toString();
  return serialized === '' ? '' : `?${serialized}`;
}

/** 実 API を叩く `CatalogPort`。 */
export const httpCatalogPort: CatalogPort = {
  listEntries: (scope, query, signal) =>
    request(`${API_BASE}/harnesses${toSearchParams(query)}`, scope, (s) => s.catalogListResponseSchema, {
      method: 'GET',
      signal,
    }),

  getDetail: (scope, projectId, signal) =>
    request(`${API_BASE}/harnesses/${encodeURIComponent(projectId)}`, scope, (s) => s.catalogDetailSchema, {
      method: 'GET',
      signal,
    }),

  listReleases: (scope, projectId, signal) =>
    request(
      `${API_BASE}/projects/${encodeURIComponent(projectId)}/releases`,
      scope,
      (s) => s.releaseListResponseSchema,
      {
        method: 'GET',
        signal,
      },
    ),

  getPublishRequest: (scope, publishId, signal) =>
    request(`${API_BASE}/publish/${encodeURIComponent(publishId)}`, scope, (s) => s.publishRequestSchema, {
      method: 'GET',
      signal,
    }),

  requestInstall: (scope, projectId, input, signal) =>
    request(`${API_BASE}/harnesses/${encodeURIComponent(projectId)}/install`, scope, (s) => s.installDescriptorSchema, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({ release_id: input.releaseId }),
    }),
};
