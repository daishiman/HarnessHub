/**
 * 本 feature が「必要とする問い合わせの形」を宣言する consumer-driven contract (ADR AD-1)。
 *
 * ここに宣言するのは **port (要求する形)** であって、テーブル定義ではない。
 * `users` / `session_revocations` / `device_authorizations` / `publisher_tokens` / `idp_connections` の
 * スキーマ owner は feat-domain-model-db であり、本 feature は `packages/db/schema/` を一切変更しない。
 *
 * 全メソッドが第 1 引数にテナントスコープを要求する。
 * テナントを受け取らない問い合わせを 1 つでも作ると、そこが row-level-scope (D4) の穴になる。
 */

import type { PublisherTokenScope, SessionRole, UserStatus } from '@harness-hub/schemas';

/** 時刻の注入口。TTL・rotation・失効の時間依存を決定論的に検査できるようにする。 */
export interface AuthClock {
  /** UNIX epoch 秒。ミリ秒と混ぜない (JWT の iat/exp は秒)。 */
  nowSeconds(): number;
}

/** 既定の時計。テスト以外はこれを使う。 */
export const systemAuthClock: AuthClock = {
  nowSeconds: () => Math.floor(Date.now() / 1000),
};

// ---------------------------------------------------------------------------
// テナント別 OIDC 接続
// ---------------------------------------------------------------------------

/** `idp_connections` 1 行のうち、認証で参照する部分。client_secret は port の外へ出さない。 */
export interface TenantOidcConnection {
  readonly tenantId: string;
  readonly tenantSlug: string;
  /** discovery document の `issuer` と厳密一致すべき値。 */
  readonly issuer: string;
  readonly clientId: string;
  /** 表示名 (「〇〇でログイン」のボタン文言)。 */
  readonly displayName: string;
  /** 無効化された接続は解決対象から外す。 */
  readonly enabled: boolean;
}

export interface TenantOidcConnectionPort {
  /** slug からテナントの OIDC 接続を引く。無い / 無効なら null (推測で補完しない)。 */
  findByTenantSlug(tenantSlug: string): Promise<TenantOidcConnection | null>;
}

// ---------------------------------------------------------------------------
// 利用者ディレクトリ
// ---------------------------------------------------------------------------

export interface DirectoryUser {
  readonly id: string;
  readonly tenantId: string;
  /** IdP 側の sub。`(tenantId, idpSubject)` で一意 (別テナントの同値 sub と混線しない)。 */
  readonly idpSubject: string;
  readonly role: SessionRole;
  readonly status: UserStatus;
  readonly workspaceIds: readonly string[];
}

export interface UserDirectoryPort {
  findByIdpSubject(tenantId: string, idpSubject: string): Promise<DirectoryUser | null>;
  findById(tenantId: string, userId: string): Promise<DirectoryUser | null>;
  /**
   * JIT provisioning。初回ログインの利用者を作る。
   * role は呼び出し側が決めるのではなく **常に member 固定**で作られる契約 (実装側で強制する)。
   */
  createFromOidc(input: { tenantId: string; idpSubject: string; email: string | null }): Promise<DirectoryUser>;
}

// ---------------------------------------------------------------------------
// session 緊急失効
// ---------------------------------------------------------------------------

export interface SessionRevocationPort {
  /**
   * テナントの最終失効時刻 (epoch 秒)。失効指示が無ければ null。
   * 例外を投げた場合、呼び出し側は **fail-closed** (拒否側へ倒す) で扱う。
   */
  findRevokedAtSeconds(tenantId: string, userId: string): Promise<number | null>;
}

// ---------------------------------------------------------------------------
// Device Authorization Flow
// ---------------------------------------------------------------------------

export type DeviceAuthorizationStatus = 'pending' | 'approved' | 'denied' | 'consumed';

export interface DeviceAuthorizationRecord {
  readonly id: string;
  readonly tenantId: string;
  /** device_code は SHA-256 ハッシュのみ保存する。平文は発行時の応答にしか存在しない。 */
  readonly deviceCodeHash: string;
  /** user_code は人が読み上げる照合キーなので平文で持つ。照合後は即失効させる。 */
  readonly userCode: string;
  readonly scope: readonly PublisherTokenScope[];
  readonly deviceLabel: string | null;
  readonly status: DeviceAuthorizationStatus;
  /** user_code の照合失敗回数。上限超過で `denied` へ落とす。 */
  readonly attempts: number;
  readonly expiresAtSeconds: number;
  /** 直近の polling 時刻。`slow_down` 判定に使う。 */
  readonly lastPolledAtSeconds: number | null;
  /** この認可に適用中の polling 間隔。`slow_down` のたびに増える。 */
  readonly intervalSeconds: number;
  readonly approvedByUserId: string | null;
  readonly workspaceId: string | null;
}

export interface DeviceAuthorizationPort {
  create(record: DeviceAuthorizationRecord): Promise<void>;
  findByDeviceCodeHash(tenantId: string, deviceCodeHash: string): Promise<DeviceAuthorizationRecord | null>;
  findByUserCode(tenantId: string, userCode: string): Promise<DeviceAuthorizationRecord | null>;
  /** 全体差し替え。部分更新にすると「どの列を書き忘れたか」が呼び出し側に散る。 */
  save(record: DeviceAuthorizationRecord): Promise<void>;
}

// ---------------------------------------------------------------------------
// Publisher token (access/refresh)
// ---------------------------------------------------------------------------

export interface PublisherTokenRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly userId: string;
  /**
   * rotation の系列を束ねる ID。
   * 再利用が検知されたとき、この単位でまとめて失効させる (窃取された枝だけ潰しても意味がない)。
   */
  readonly familyId: string;
  readonly refreshTokenHash: string;
  readonly scope: readonly PublisherTokenScope[];
  readonly deviceLabel: string | null;
  readonly createdAtSeconds: number;
  readonly lastUsedAtSeconds: number | null;
  readonly expiresAtSeconds: number;
  readonly revokedAtSeconds: number | null;
}

export interface PublisherTokenPort {
  create(record: PublisherTokenRecord): Promise<void>;
  findByRefreshTokenHash(tenantId: string, refreshTokenHash: string): Promise<PublisherTokenRecord | null>;
  findById(tenantId: string, id: string): Promise<PublisherTokenRecord | null>;
  /** family 単位の取得。再利用検知時の一括失効に使う。 */
  listByFamilyId(tenantId: string, familyId: string): Promise<readonly PublisherTokenRecord[]>;
  /** 利用者の token 一覧。workspaceId を渡すと Workspace で絞る (管理者の一覧用)。 */
  listByUserId(tenantId: string, userId: string): Promise<readonly PublisherTokenRecord[]>;
  listByWorkspaceId(tenantId: string, workspaceId: string): Promise<readonly PublisherTokenRecord[]>;
  save(record: PublisherTokenRecord): Promise<void>;
}

/** 本 feature が要求する port 一式。実装 (本番 / in-memory) はこの形で注入する。 */
export interface AuthPorts {
  readonly clock: AuthClock;
  readonly oidcConnections: TenantOidcConnectionPort;
  readonly users: UserDirectoryPort;
  readonly sessionRevocations: SessionRevocationPort;
  readonly deviceAuthorizations: DeviceAuthorizationPort;
  readonly publisherTokens: PublisherTokenPort;
}
