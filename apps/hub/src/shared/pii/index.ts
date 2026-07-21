// PII ガード。要保護属性の admin 限定表示・API 非公開・export マスクを単一実装で担保する (shared-layers §2 / SEC4)

/** 要保護属性の分類。可視条件がここだけで決まるようにする */
export type PiiSensitivity =
  /** admin role のみ閲覧可 */
  | 'admin_only'
  /** どの role にも API 経由では返さない (内部処理専用) */
  | 'never_exposed';

export interface PiiFieldPolicy {
  readonly field: string;
  readonly sensitivity: PiiSensitivity;
}

export interface PiiViewer {
  readonly roles: readonly string[];
}

/** admin 判定。テナント固有の role 語彙拡張は feat-auth-tenancy が上書きする */
export const ADMIN_ROLE = 'admin';

export const PII_MASK = '***';

export function isAdminViewer(viewer: PiiViewer): boolean {
  return viewer.roles.includes(ADMIN_ROLE);
}

export function canView(policy: PiiFieldPolicy, viewer: PiiViewer): boolean {
  switch (policy.sensitivity) {
    case 'admin_only':
      return isAdminViewer(viewer);
    case 'never_exposed':
      return false;
    default:
      // 未知の sensitivity は非公開側に倒す (fail-closed)
      return false;
  }
}

/**
 * policy に載っている field をマスクした複製を返す。元オブジェクトは変更しない。
 * policy に無い field はそのまま通す ＝ 「何が PII か」を policy 側の単一ソースで管理する。
 */
export function maskPii<T extends Record<string, unknown>>(
  record: T,
  policies: readonly PiiFieldPolicy[],
  viewer: PiiViewer,
): Record<string, unknown> {
  const masked: Record<string, unknown> = { ...record };
  for (const policy of policies) {
    if (!(policy.field in masked)) continue;
    if (canView(policy, viewer)) continue;
    masked[policy.field] = masked[policy.field] === null ? null : PII_MASK;
  }
  return masked;
}

/** export (CSV/JSON ダウンロード) 用。閲覧者に関わらず policy 対象を全てマスクする */
export function maskPiiForExport<T extends Record<string, unknown>>(
  record: T,
  policies: readonly PiiFieldPolicy[],
): Record<string, unknown> {
  return maskPii(record, policies, { roles: [] });
}
