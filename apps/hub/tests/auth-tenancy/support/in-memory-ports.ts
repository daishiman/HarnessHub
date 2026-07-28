/**
 * feat-auth-tenancy のテスト用テストダブル (test-design.md §3)。
 *
 * 方針:
 *   - repository port は **in-memory 実装**。feat-domain-model-db が未 land でも
 *     consumer-driven contract (port) の充足は検査できる。
 *   - 時刻は注入。TTL・rotation・失効の境界を決定論 (毎回同じ結果) で検査するため。
 *   - **ハッシュと JWT 署名は本物を使う** (`crypto.subtle`)。ここをモックすると
 *     「検証が通ること」の意味が消える。
 */

import type {
  AuthClock,
  AuthPorts,
  DeviceAuthorizationPort,
  DeviceAuthorizationRecord,
  DirectoryUser,
  PublisherTokenPort,
  PublisherTokenRecord,
  SessionRevocationPort,
  TenantOidcConnection,
  TenantOidcConnectionPort,
  UserDirectoryPort,
} from '../../../src/lib/auth/index.js';

/** 進められる時計。`advance()` で TTL 境界をまたぐ。 */
export interface MutableClock extends AuthClock {
  advance(seconds: number): void;
  set(seconds: number): void;
}

export function createMutableClock(startSeconds = 1_800_000_000): MutableClock {
  let current = startSeconds;
  return {
    nowSeconds: () => current,
    advance: (seconds) => {
      current += seconds;
    },
    set: (seconds) => {
      current = seconds;
    },
  };
}

/** 決定論的な乱数源。値そのものではなく**形**を検査するテストのために連番バイトを返す。 */
export function createSequentialRandomBytes(seed = 0): (byteLength: number) => Uint8Array {
  let counter = seed;
  return (byteLength) => {
    const bytes = new Uint8Array(byteLength);
    for (let index = 0; index < byteLength; index += 1) {
      counter = (counter + 7) % 256;
      bytes[index] = counter;
    }
    return bytes;
  };
}

/** 決定論的な ID 生成。`crypto.randomUUID()` の代わり。 */
export function createSequentialIds(prefix = 'id'): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

// ---------------------------------------------------------------------------
// OIDC 接続
// ---------------------------------------------------------------------------

export interface InMemoryOidcConnections extends TenantOidcConnectionPort {
  put(connection: TenantOidcConnection): void;
}

export function createInMemoryOidcConnections(seed: readonly TenantOidcConnection[] = []): InMemoryOidcConnections {
  const bySlug = new Map<string, TenantOidcConnection>(seed.map((entry) => [entry.tenantSlug, entry]));
  return {
    put(connection) {
      bySlug.set(connection.tenantSlug, connection);
    },
    async findByTenantSlug(tenantSlug) {
      return bySlug.get(tenantSlug) ?? null;
    },
  };
}

// ---------------------------------------------------------------------------
// 利用者ディレクトリ
// ---------------------------------------------------------------------------

export interface InMemoryUsers extends UserDirectoryPort {
  put(user: DirectoryUser): void;
  all(): readonly DirectoryUser[];
}

/**
 * `createFromOidc` は **常に role='member' / status='active'** で作る。
 * 呼び出し側が role を渡せる形にすると、IdP claims 由来の昇格経路がここから生まれる。
 */
export function createInMemoryUsers(seed: readonly DirectoryUser[] = [], newId = createSequentialIds('user')) {
  const users: DirectoryUser[] = [...seed];

  const port: InMemoryUsers = {
    put(user) {
      const index = users.findIndex((entry) => entry.tenantId === user.tenantId && entry.id === user.id);
      if (index >= 0) users[index] = user;
      else users.push(user);
    },
    all: () => [...users],
    async findByIdpSubject(tenantId, idpSubject) {
      return users.find((user) => user.tenantId === tenantId && user.idpSubject === idpSubject) ?? null;
    },
    async findById(tenantId, userId) {
      return users.find((user) => user.tenantId === tenantId && user.id === userId) ?? null;
    },
    async createFromOidc(input) {
      const created: DirectoryUser = {
        id: newId(),
        tenantId: input.tenantId,
        idpSubject: input.idpSubject,
        role: 'member',
        status: 'active',
        workspaceIds: [],
      };
      users.push(created);
      return created;
    },
  };
  return port;
}

// ---------------------------------------------------------------------------
// session 緊急失効
// ---------------------------------------------------------------------------

export interface InMemorySessionRevocations extends SessionRevocationPort {
  revoke(tenantId: string, userId: string, atSeconds: number): void;
  /** 以後の問い合わせを例外にする (fail-closed の検査用)。 */
  failWith(error: Error | null): void;
  callCount(): number;
}

export function createInMemorySessionRevocations(): InMemorySessionRevocations {
  const revocations = new Map<string, number>();
  let failure: Error | null = null;
  let calls = 0;

  return {
    revoke(tenantId, userId, atSeconds) {
      revocations.set(`${tenantId} ${userId}`, atSeconds);
    },
    failWith(error) {
      failure = error;
    },
    callCount: () => calls,
    async findRevokedAtSeconds(tenantId, userId) {
      calls += 1;
      if (failure !== null) throw failure;
      return revocations.get(`${tenantId} ${userId}`) ?? null;
    },
  };
}

// ---------------------------------------------------------------------------
// Device Authorization
// ---------------------------------------------------------------------------

export interface InMemoryDeviceAuthorizations extends DeviceAuthorizationPort {
  all(): readonly DeviceAuthorizationRecord[];
  /** テナントを問わず ID で引く。**分離テストで「隣のテナントに漏れていないか」を確かめる**ために使う。 */
  rawById(id: string): DeviceAuthorizationRecord | null;
}

export function createInMemoryDeviceAuthorizations(): InMemoryDeviceAuthorizations {
  const records: DeviceAuthorizationRecord[] = [];

  /**
   * tenantId まで一致させる。id だけで引くと隣テナントの行を書き換えられる穴になる。
   * index ではなく行そのものを返すのは、`noUncheckedIndexedAccess` の下で
   * 「見つかった」ことを型に伝えるため (index を返すと後段が毎回 undefined 検査になる)。
   */
  const locate = (tenantId: string, id: string): { index: number; record: DeviceAuthorizationRecord } | null => {
    const index = records.findIndex((r) => r.tenantId === tenantId && r.id === id);
    const record = records[index];
    return index < 0 || record === undefined ? null : { index, record };
  };

  return {
    all: () => [...records],
    rawById: (id) => records.find((record) => record.id === id) ?? null,
    async create(record) {
      records.push(record);
    },
    async findByDeviceCodeHash(tenantId, deviceCodeHash) {
      return records.find((r) => r.tenantId === tenantId && r.deviceCodeHash === deviceCodeHash) ?? null;
    },
    async findByUserCode(tenantId, userCode) {
      return records.find((r) => r.tenantId === tenantId && r.userCode === userCode) ?? null;
    },
    async savePollProgress(progress) {
      const found = locate(progress.tenantId, progress.id);
      if (found === null) throw new Error(`unknown device authorization: ${progress.id}`);
      records[found.index] = {
        ...found.record,
        lastPolledAtSeconds: progress.lastPolledAtSeconds,
        intervalSeconds: progress.intervalSeconds,
      };
    },
    /**
     * 本番 (SQLite の `UPDATE ... WHERE status = ?`) と同じ判定をここでも行う。
     * 「保存済みの status を読み直して比較する」ことが CAS の意味なので、
     * 引数の `next.status` ではなく **記録側の現在値**と `expectedStatus` を比べる。
     */
    async compareAndSwapStatus({ expectedStatus, expectedAttempts, next }) {
      const found = locate(next.tenantId, next.id);
      if (found === null) return false;
      if (found.record.status !== expectedStatus) return false;
      if (found.record.attempts !== expectedAttempts) return false;
      records[found.index] = next;
      return true;
    },
  };
}

// ---------------------------------------------------------------------------
// Publisher token
// ---------------------------------------------------------------------------

export interface InMemoryPublisherTokens extends PublisherTokenPort {
  all(): readonly PublisherTokenRecord[];
}

export function createInMemoryPublisherTokens(): InMemoryPublisherTokens {
  const records: PublisherTokenRecord[] = [];

  return {
    all: () => [...records],
    async create(record) {
      records.push(record);
    },
    async findByRefreshTokenHash(tenantId, refreshTokenHash) {
      return records.find((r) => r.tenantId === tenantId && r.refreshTokenHash === refreshTokenHash) ?? null;
    },
    async findById(tenantId, id) {
      return records.find((r) => r.tenantId === tenantId && r.id === id) ?? null;
    },
    async listByFamilyId(tenantId, familyId) {
      return records.filter((r) => r.tenantId === tenantId && r.familyId === familyId);
    },
    async listByUserId(tenantId, userId) {
      return records.filter((r) => r.tenantId === tenantId && r.userId === userId);
    },
    async listByWorkspaceId(tenantId, workspaceId) {
      return records.filter((r) => r.tenantId === tenantId && r.workspaceId === workspaceId);
    },
    /** 本番の `UPDATE ... WHERE revoked_at IS NULL` と同じ判定。未失効の 1 本だけが true を得る。 */
    async revokeIfActive({ tenantId, id, revokedAtSeconds, lastUsedAtSeconds }) {
      const index = records.findIndex((r) => r.tenantId === tenantId && r.id === id);
      const current = records[index];
      if (current === undefined) return false;
      if (current.revokedAtSeconds !== null) return false;
      records[index] = {
        ...current,
        revokedAtSeconds,
        lastUsedAtSeconds: lastUsedAtSeconds ?? current.lastUsedAtSeconds,
      };
      return true;
    },
    async revokeFamily({ tenantId, familyId, revokedAtSeconds }) {
      let revoked = 0;
      for (const [index, record] of records.entries()) {
        if (record.tenantId !== tenantId || record.familyId !== familyId) continue;
        if (record.revokedAtSeconds !== null) continue;
        records[index] = { ...record, revokedAtSeconds };
        revoked += 1;
      }
      return revoked;
    },
  };
}

// ---------------------------------------------------------------------------
// 一式
// ---------------------------------------------------------------------------

export interface TestPorts extends AuthPorts {
  readonly clock: MutableClock;
  readonly oidcConnections: InMemoryOidcConnections;
  readonly users: InMemoryUsers;
  readonly sessionRevocations: InMemorySessionRevocations;
  readonly deviceAuthorizations: InMemoryDeviceAuthorizations;
  readonly publisherTokens: InMemoryPublisherTokens;
}

export function createTestPorts(
  options: {
    readonly clock?: MutableClock;
    readonly users?: readonly DirectoryUser[];
    readonly oidcConnections?: readonly TenantOidcConnection[];
  } = {},
): TestPorts {
  return {
    clock: options.clock ?? createMutableClock(),
    oidcConnections: createInMemoryOidcConnections(options.oidcConnections ?? []),
    users: createInMemoryUsers(options.users ?? []),
    sessionRevocations: createInMemorySessionRevocations(),
    deviceAuthorizations: createInMemoryDeviceAuthorizations(),
    publisherTokens: createInMemoryPublisherTokens(),
  };
}

/** テストで使うテナント/利用者の素材。分離テストが 2 テナントを同時に扱う前提で 2 組ぶん用意する。 */
export const TENANT_A = 'tenant-a';
export const TENANT_B = 'tenant-b';
export const WORKSPACE_A1 = 'ws-a1';
export const WORKSPACE_A2 = 'ws-a2';
export const WORKSPACE_B1 = 'ws-b1';

export function directoryUser(
  overrides: Partial<DirectoryUser> & Pick<DirectoryUser, 'id' | 'tenantId'>,
): DirectoryUser {
  return {
    idpSubject: `idp-${overrides.id}`,
    role: 'member',
    status: 'active',
    workspaceIds: [],
    ...overrides,
  };
}
