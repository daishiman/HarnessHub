/**
 * protected catalog の Core Web Vitals 計測だけに使う短命 credential。
 *
 * 通常の session / access token と共有しない署名鍵で、CI が利用者の資格情報を
 * 持たずに本番の `/catalog` を測定できるようにする。これは人や外部 client 用の
 * 認証方式ではなく、発行元・origin・tenant/workspace・読取り経路を固定した運用 credential。
 */

import type { AuthzPrincipal } from '../authz/types.js';
import { verifyJwt } from './jwt.js';
import { readCookie } from './session.js';

export const CWV_PROBE_COOKIE_NAME = '__Host-harness-hub.cwv-probe';
export const CWV_PROBE_AUDIENCE = 'harness-hub-cwv';
export const CWV_PROBE_TTL_SECONDS = 5 * 60;

export interface CwvProbeConfig {
  readonly secret: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly origin: string;
}

interface CwvProbeClaims {
  readonly typ: 'cwv_probe';
  readonly aud: typeof CWV_PROBE_AUDIENCE;
  readonly origin: string;
  readonly tenant_id: string;
  readonly workspace_id: string;
  readonly iat: number;
  readonly exp: number;
}

/**
 * CWV credential が有効にできる read 経路の厳密な allowlist。
 *
 * `/api/v1/harnesses*` は catalog UI が読む endpoint 群だけであり、install の POST、
 * publish、管理 API は method/path のいずれかで必ずここから漏れる。route 側の
 * `harnesses.read` 規則も合わせて通すため、path 一覧だけで権限を広げない。
 */
export function isCwvProbeRequestAllowed(method: string, pathname: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  return (
    pathname === '/catalog' ||
    pathname === '/marketplace.json' ||
    pathname === '/api/v1/harnesses' ||
    /^\/api\/v1\/harnesses\/[^/]+$/.test(pathname) ||
    /^\/api\/v1\/projects\/[^/]+\/releases$/.test(pathname)
  );
}

/**
 * Worker Secret 3 件を read-only probe の設定へ正規化する。
 *
 * 3 件すべてが無ければ feature 自体を無効のままにする。どれか 1 件でもある半端な
 * 設定は、誤って違う tenant を測るより安全な起動失敗にする。
 */
export function readCwvProbeConfig(
  source: Record<string, string | undefined>,
  canonicalOrigin: string,
): CwvProbeConfig | undefined {
  const rawValues = [source.CWV_PROBE_SECRET, source.CWV_PROBE_TENANT_ID, source.CWV_PROBE_WORKSPACE_ID];
  const secret = nonEmpty(source.CWV_PROBE_SECRET);
  const tenantId = nonEmpty(source.CWV_PROBE_TENANT_ID);
  const workspaceId = nonEmpty(source.CWV_PROBE_WORKSPACE_ID);
  if (rawValues.every((value) => value === undefined)) return undefined;
  if (secret === undefined || tenantId === undefined || workspaceId === undefined) {
    throw new Error('CWV_PROBE_SECRET / CWV_PROBE_TENANT_ID / CWV_PROBE_WORKSPACE_ID は同時に設定してください');
  }

  const parsed = new URL(canonicalOrigin);
  if (parsed.protocol !== 'https:') {
    throw new Error('CWV probe を有効にする AUTH_CANONICAL_ORIGIN は https origin である必要があります');
  }

  return { secret, tenantId, workspaceId, origin: parsed.origin };
}

/** cookie の ticket を検証して、認可層が理解できる最小 principal へ変換する。 */
export async function resolveCwvProbePrincipal(
  cookieHeader: string | null,
  config: CwvProbeConfig,
  nowSeconds: number,
): Promise<AuthzPrincipal | null> {
  const ticket = readCookie(cookieHeader, CWV_PROBE_COOKIE_NAME);
  if (ticket === null) return null;
  return resolveCwvProbeTicket(ticket, config, nowSeconds);
}

/** 同名 prefix を持つ別 cookie を credential と誤認しない完全一致の有無判定。 */
export function hasCwvProbeCookie(cookieHeader: string | null): boolean {
  return readCookie(cookieHeader, CWV_PROBE_COOKIE_NAME) !== null;
}

/** URL bootstrap で受け取った ticket と Cookie 内 ticket に共通の検証本体。 */
export async function resolveCwvProbeTicket(
  ticket: string,
  config: CwvProbeConfig,
  nowSeconds: number,
): Promise<AuthzPrincipal | null> {
  const verified = await verifyJwt(ticket, config.secret);
  if (!verified.ok) return null;
  const claims = parseClaims(verified.payload);
  if (claims === null) return null;

  // 未来発行・期限切れ・寿命の引き延ばしをすべて拒否する。runner と Worker の時計差は 30 秒だけ受容する。
  if (
    claims.exp <= nowSeconds ||
    claims.iat > nowSeconds + 30 ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > CWV_PROBE_TTL_SECONDS
  ) {
    return null;
  }
  if (
    claims.origin !== config.origin ||
    claims.tenant_id !== config.tenantId ||
    claims.workspace_id !== config.workspaceId
  ) {
    return null;
  }

  return {
    // synthetic な actor は通常ユーザーと混同しない。read 専用なので監査主体にも使わない。
    userId: 'cwv-probe',
    tenantId: claims.tenant_id,
    role: 'member',
    status: 'active',
    issuedAtSeconds: claims.iat,
    workspaceIds: [claims.workspace_id],
    scope: null,
    credential: 'cwv_probe',
    tokenId: null,
  };
}

function parseClaims(value: unknown): CwvProbeClaims | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.typ !== 'cwv_probe' ||
    candidate.aud !== CWV_PROBE_AUDIENCE ||
    typeof candidate.origin !== 'string' ||
    typeof candidate.tenant_id !== 'string' ||
    typeof candidate.workspace_id !== 'string' ||
    !isEpochSeconds(candidate.iat) ||
    !isEpochSeconds(candidate.exp)
  ) {
    return null;
  }
  return candidate as unknown as CwvProbeClaims;
}

function isEpochSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}
