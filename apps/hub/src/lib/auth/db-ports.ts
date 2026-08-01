/**
 * `AuthPorts` の本番実装 — `packages/db` の repository へ結線する adapter (HarnessHub-b7ng)。
 *
 * ここが担うのは **翻訳だけ**で、認可判定・TTL 判定・rotation の可否は一切持たない。
 * それらは `device-flow/service.ts` と `authz/` の責務であり、port の実装差で挙動が変わってはならない
 * (in-memory テストダブルと本番でテストの意味がズレるのを防ぐ)。
 *
 * 翻訳する差は 4 つある。
 *   1. **時刻の単位**: `packages/db` の時刻列は epoch **ミリ秒**、port は JWT の `iat`/`exp` に合わせた
 *      epoch **秒**。換算は下の `toSeconds` / `toMillis` だけが行う (散らすと単位事故になる)。
 *   2. **scope の表現**: DB は `scopes_json` (TEXT)、port は `PublisherTokenScope[]`。
 *      読み出し時に 1 要素ずつ検証する — 壊れた行の未知の権限名を認可へ流さないため (fail-closed)。
 *   3. **列名**: DB `device_name` ↔ port `deviceLabel`、DB `user_id` ↔ port `approvedByUserId`。
 *   4. **Workspace 所属**: port の `DirectoryUser.workspaceIds` は `users` にはなく `user_workspaces` にある。
 *
 * このファイルは `adapter/` の**外**に置く。`adapter/` は Auth.js (`@auth/core`) を閉じ込める境界であり
 * (`scripts/check-auth-adapter-boundary.mjs`)、DB 結線は別の関心事。同じ袋に入れると
 * 「Auth.js を差し替える」と「DB driver を差し替える」が一緒に動く形になる。
 */

import {
  type CoreRepositories,
  createRepositoryContext,
  type DeviceAuthorizationRow,
  type IdpConnectionRow,
  type PublisherTokenRow,
  type UserRow,
} from '@harness-hub/db';
import { type PublisherTokenScope, publisherTokenScopeSchema, workspaceDomainSchema } from '@harness-hub/schemas';
import type {
  AuthClock,
  AuthPorts,
  DeviceAuthorizationRecord,
  DirectoryUser,
  PublisherTokenRecord,
  TenantOidcConnection,
} from './ports.js';
import { systemAuthClock } from './ports.js';
import { createOidcCredentialResolver, type SharedGoogleCredentials } from './shared-credentials.js';

/**
 * 永続化された行が port の型を満たさないときの故障。
 *
 * 「読めなかった」ではなく「読めたが信用できない」を表す。呼び出し側で握り潰さないこと —
 * scope が読めない token を「scope 無し」で通すと、権限判定が静かに緩む側へ倒れる可能性がある。
 */
export class AuthPortDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthPortDataError';
  }
}

/** epoch ミリ秒 → epoch 秒。切り捨てる (切り上げると TTL が 1 秒延びる方向へブレる)。 */
const toSeconds = (millis: number): number => Math.floor(millis / 1000);

/** epoch 秒 → epoch ミリ秒。 */
const toMillis = (seconds: number): number => seconds * 1000;

const toSecondsOrNull = (millis: number | null): number | null => (millis === null ? null : toSeconds(millis));

const toMillisOrNull = (seconds: number | null): number | null => (seconds === null ? null : toMillis(seconds));

/**
 * `scopes_json` を検証しながら復元する。
 * 未知の値が 1 つでもあれば例外にする — 黙って捨てると「その scope は無かった」ことになり、
 * 逆に素通しすると認可判定へ知らない権限名が入る。どちらも故障の隠蔽なので止める。
 */
function parseScopes(scopesJson: string, label: string): readonly PublisherTokenScope[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(scopesJson);
  } catch {
    throw new AuthPortDataError(`${label}: scopes_json が JSON として読めません`);
  }
  if (!Array.isArray(parsed)) {
    throw new AuthPortDataError(`${label}: scopes_json が配列ではありません`);
  }
  return parsed.map((entry) => {
    const result = publisherTokenScopeSchema.safeParse(entry);
    if (!result.success) throw new AuthPortDataError(`${label}: 未知の scope 値が保存されています`);
    return result.data;
  });
}

const serializeScopes = (scope: readonly PublisherTokenScope[]): string => JSON.stringify([...scope]);

/**
 * `allowed_workspace_domains` (JSON 配列 TEXT / NULL) を復元する。
 *
 * `parseScopes` と同じ姿勢: **壊れた値を空配列へ黙って倒さない**。
 * ここで空配列に落とすと、共有方式の接続では「許可ドメイン未設定」と区別が付かなくなり、
 * `resolveTenantOidcConfig` が接続を閉じてしまう。実際は列が壊れているだけなのに
 * 「設定漏れ」に見えるので、運用が誤った方向 (再設定) へ誘導される。
 * 逆に顧客方式では空配列 = `hd` 検査なしなので、壊れた値を空配列に倒すと**検査が消える**。
 * どちらの方向にも黙って倒れないよう、故障は故障として上げる。
 */
function parseAllowedWorkspaceDomains(json: string | null, label: string): readonly string[] {
  if (json === null || json.length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AuthPortDataError(`${label}: allowed_workspace_domains が JSON として読めません`);
  }
  if (!Array.isArray(parsed)) {
    throw new AuthPortDataError(`${label}: allowed_workspace_domains が配列ではありません`);
  }
  return parsed.map((entry) => {
    const result = workspaceDomainSchema.safeParse(entry);
    if (!result.success) throw new AuthPortDataError(`${label}: 不正な Workspace ドメインが保存されています`);
    // 比較は検証側でも小文字化するが、保存値の揺れをここで吸収しておく
    return result.data.toLowerCase();
  });
}

/**
 * 1 テナントに `idp_connections` が複数ある場合の選択規則。
 * `list()` は順序を保証しないので、最古 (created_at 昇順、同時刻は id 昇順) の 1 件へ決定論的に寄せる。
 * 1 テナント複数 IdP の選択 UI は本 issue の範囲外 — 範囲を広げず、順序の揺れだけを潰す。
 *
 * **この関数を通さない選択を増やさないこと。** issuer/client_id を決める経路 (`findByTenantSlug`) と
 * client_secret を復号する経路 (`createDbClientSecretResolver`) が別の規則で選ぶと、
 * 片方だけ別の接続を掴み「secret が合わない」だけの障害になる。規則が 1 つなら構造的に起きない。
 */
function pickPrimaryConnection(connections: readonly IdpConnectionRow[]): IdpConnectionRow | null {
  const sorted = [...connections].sort((left, right) =>
    left.createdAt === right.createdAt ? left.id.localeCompare(right.id) : left.createdAt - right.createdAt,
  );
  return sorted[0] ?? null;
}

function toDeviceRecord(row: DeviceAuthorizationRow): DeviceAuthorizationRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    deviceCodeHash: row.deviceCodeHash,
    userCode: row.userCode,
    scope: parseScopes(row.scopesJson, `device_authorizations(${row.id})`),
    deviceLabel: row.deviceName,
    status: row.status,
    attempts: row.attempts,
    expiresAtSeconds: toSeconds(row.expiresAt),
    lastPolledAtSeconds: toSecondsOrNull(row.lastPolledAt),
    intervalSeconds: row.intervalSec,
    approvedByUserId: row.userId,
    workspaceId: row.workspaceId,
  };
}

function toTokenRecord(row: PublisherTokenRow): PublisherTokenRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    userId: row.userId,
    familyId: row.familyId,
    refreshTokenHash: row.refreshTokenHash,
    scope: parseScopes(row.scopesJson, `publisher_tokens(${row.id})`),
    deviceLabel: row.deviceName,
    createdAtSeconds: toSeconds(row.createdAt),
    lastUsedAtSeconds: toSecondsOrNull(row.lastUsedAt),
    expiresAtSeconds: toSeconds(row.expiresAt),
    revokedAtSeconds: toSecondsOrNull(row.revokedAt),
  };
}

export interface DbAuthPortsDeps {
  /**
   * `createCoreRepositories()` が返す repository 一式。
   * adapter と KEK ではなくこれを受け取るのは、cipher の生成を `packages/db` 側に閉じ込めるため
   * (認証層が暗号鍵を組み立てる経路を持たない)。
   */
  readonly repositories: CoreRepositories;
  /** 省略時はシステム時計。テストは進められる時計を注入して TTL 境界を検査する。 */
  readonly clock?: AuthClock;
  /**
   * 環境単位の共有 Google OAuth credential (issue-auth-tenancy-shared-google-oidc-20260729)。
   *
   * 省略・null は「共有方式を運用していない環境」。その場合 `credential_mode='shared_google'` の
   * 行は**解決されない** (認証できない) — 共有 client_id が無いまま認可要求を組み立てさせない。
   * 顧客持ち込み方式のテナントはこの値に依存しないので、未設定でも従来どおり動く (受入条件 5)。
   */
  readonly sharedGoogle?: SharedGoogleCredentials | null;
}

/**
 * `AuthjsConfigDeps.clientSecretFor` の本番実装。
 *
 * `AuthPorts` に入れていないのは、client_secret が **port 越しに流れてよい値ではない**ため。
 * port の戻り値に平文 secret を載せると、port を受け取る全ての層 (device flow・認可判定) が
 * 触れる位置に置かれる。必要なのは Auth.js 設定の組立時だけなので、そこへ直接渡す。
 *
 * 引数が `tenantId` ではなく解決済み接続なのは、共有方式を足したときに
 * 「どちらの出所から取るか」を接続の `credentialMode` で決めるため。tenantId だけを渡すと
 * 呼び出し側が mode を見て分岐することになり、分岐が Auth.js 設定組立の外へ漏れる。
 * 実際の分岐は `shared-credentials.ts` の 1 箇所に閉じてある。
 *
 * 見つからないときは例外ではなく null。`resolveAuthjsConfigForTenant` が null を
 * 「このテナントでは認証できない」として 404 に倒す (既定 provider へ落とさない / AD-5)。
 */
export function createDbClientSecretResolver(
  deps: DbAuthPortsDeps,
): (connection: TenantOidcConnection) => Promise<string | null> {
  const idpConnectionsRepo = deps.repositories.idpConnections;

  return createOidcCredentialResolver({
    sharedGoogle: deps.sharedGoogle ?? null,
    customerClientSecretFor: async (tenantId) => {
      const context = createRepositoryContext({ tenantId });
      const connection = pickPrimaryConnection(await idpConnectionsRepo.list(context));
      if (connection === null) return null;
      return idpConnectionsRepo.decryptClientSecret(context, connection.id);
    },
  });
}

/**
 * 本番 `AuthPorts` を組み立てる。
 *
 * 全メソッドが `createRepositoryContext({ tenantId })` を作ってから repository を呼ぶ。
 * tenantId を受け取らない問い合わせをここに 1 つでも作ると row-level scope (D4) の穴になるので、
 * context の生成をメソッド内に閉じ込め、モジュールスコープに使い回しの context を置かない。
 */
export function createDbAuthPorts(deps: DbAuthPortsDeps): AuthPorts {
  const {
    tenants: tenantsRepo,
    idpConnections: idpConnectionsRepo,
    users: usersRepo,
    userWorkspaces: userWorkspacesRepo,
    sessionRevocations: sessionRevocationsRepo,
    deviceAuthorizations: deviceAuthorizationsRepo,
    publisherTokens: publisherTokensRepo,
  } = deps.repositories;

  const scopeOf = (tenantId: string) => createRepositoryContext({ tenantId });
  const sharedGoogle = deps.sharedGoogle ?? null;

  /**
   * DB 行の client_id を「認可要求で使う client_id」へ翻訳する。
   *
   * 共有方式の行は client_id 列が空 (secret も置かない / 受入条件 4)。実際に使う値は
   * 環境単位の共有 client_id なので、**ここで 1 回だけ**差し込む。
   * 共有 credential 未設定なら null を返し、接続そのものを解決させない —
   * 空文字の client_id で provider を組むと `aud` 検証が空文字と比較する経路になり、
   * 検証の意味が消える。
   */
  const resolveClientId = (row: IdpConnectionRow): string | null => {
    switch (row.credentialMode) {
      case 'shared_google':
        return sharedGoogle?.clientId ?? null;
      case 'customer_google':
        return row.clientId.length > 0 ? row.clientId : null;
      default:
        // 未知の mode を既定へ落とさない (oidc.ts の isCredentialModeUsable と同じ姿勢)
        return null;
    }
  };

  /** `users` 1 行 + 所属一覧から `DirectoryUser` を組む。所属は必ず引く (既定を「所属なし」にしない)。 */
  const toDirectoryUser = async (row: UserRow): Promise<DirectoryUser> => {
    const workspaceIds = await userWorkspacesRepo.listWorkspaceIdsForUser(scopeOf(row.tenantId), row.id);
    return {
      id: row.id,
      tenantId: row.tenantId,
      idpSubject: row.idpSubject,
      role: row.role,
      status: row.status,
      workspaceIds,
    };
  };

  return {
    clock: deps.clock ?? systemAuthClock,

    oidcConnections: {
      async findByTenantSlug(tenantSlug): Promise<TenantOidcConnection | null> {
        const tenant = await tenantsRepo.findBySlug(tenantSlug);
        if (tenant === null) return null;
        const connection = pickPrimaryConnection(await idpConnectionsRepo.list(scopeOf(tenant.id)));
        if (connection === null) return null;

        const clientId = resolveClientId(connection);
        if (clientId === null) return null;

        return {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          issuer: connection.issuerUrl,
          clientId,
          displayName: tenant.name,
          // 停止中テナントは接続を解決させない。認証の入口で閉じる方が、
          // 後段の認可でテナント状態を見落とす経路より安全側。
          enabled: tenant.status === 'active',
          credentialMode: connection.credentialMode,
          allowedWorkspaceDomains: parseAllowedWorkspaceDomains(
            connection.allowedWorkspaceDomains,
            `idp_connections(${connection.id})`,
          ),
        };
      },
    },

    users: {
      async findByIdpSubject(tenantId, idpSubject) {
        const row = await usersRepo.findByIdpSubject(scopeOf(tenantId), idpSubject);
        return row === null ? null : toDirectoryUser(row);
      },

      async findById(tenantId, userId) {
        const row = await usersRepo.findById(scopeOf(tenantId), userId);
        return row === null ? null : toDirectoryUser(row);
      },

      /**
       * JIT provisioning。**role は常に `member`、status は常に `active`** で作る。
       * IdP の claims から role を導く経路をここに作らないこと (IdP 側の属性改変が権限昇格になる)。
       *
       * `users.email` / `users.name` は NOT NULL。IdP が email を返さない構成があるため、
       * 欠測は空文字で表す。`sub@example.invalid` のような合成アドレスにすると
       * 「配信できるアドレスらしきもの」が DB に混ざり、通知や名寄せが誤作動する。
       * 空文字は「未取得」と一目で分かり、後からプロフィール更新で埋められる。
       */
      async createFromOidc(input) {
        const context = scopeOf(input.tenantId);
        try {
          const created = await usersRepo.insert(context, {
            idpSubject: input.idpSubject,
            email: input.email ?? '',
            name: '',
            role: 'member',
            status: 'active',
          });
          return toDirectoryUser(created);
        } catch (error) {
          // 別要求が同じ (tenant_id, idp_subject) を先に JIT 作成した場合は、
          // UNIQUE 違反を 500 にせず、その要求が作った同一利用者へ収束させる。
          // ロック障害など別原因なら行は見つからないため、元の例外をそのまま返す。
          const concurrent = await usersRepo.findByIdpSubject(context, input.idpSubject);
          if (concurrent !== null) return toDirectoryUser(concurrent);
          throw error;
        }
      },
    },

    sessionRevocations: {
      /**
       * `session_revocations` は **テナント単位**の一括失効 (security-spec §2.1) で、
       * 利用者単位の失効列を持たない。そのため `userId` は意図的に使わない。
       * port が userId を取るのは、将来利用者単位へ細分化したときに呼び出し側を変えずに済ませるため。
       */
      async findRevokedAtSeconds(tenantId, _userId) {
        const row = await sessionRevocationsRepo.get(scopeOf(tenantId));
        return row === null ? null : toSeconds(row.revokedAt);
      },
    },

    deviceAuthorizations: {
      async create(record) {
        await deviceAuthorizationsRepo.create(scopeOf(record.tenantId), {
          id: record.id,
          deviceCodeHash: record.deviceCodeHash,
          userCode: record.userCode,
          userId: record.approvedByUserId,
          workspaceId: record.workspaceId,
          scopesJson: serializeScopes(record.scope),
          deviceName: record.deviceLabel,
          status: record.status,
          attempts: record.attempts,
          intervalSec: record.intervalSeconds,
          lastPolledAt: toMillisOrNull(record.lastPolledAtSeconds),
          expiresAt: toMillis(record.expiresAtSeconds),
        });
      },

      async findByDeviceCodeHash(tenantId, deviceCodeHash) {
        const row = await deviceAuthorizationsRepo.findByDeviceCodeHash(scopeOf(tenantId), deviceCodeHash);
        return row === null ? null : toDeviceRecord(row);
      },

      async findByUserCode(tenantId, userCode) {
        const row = await deviceAuthorizationsRepo.findByUserCode(scopeOf(tenantId), userCode);
        return row === null ? null : toDeviceRecord(row);
      },

      async savePollProgress(progress) {
        await deviceAuthorizationsRepo.updateProgress(scopeOf(progress.tenantId), progress.id, {
          intervalSec: progress.intervalSeconds,
          lastPolledAt: toMillis(progress.lastPolledAtSeconds),
        });
      },

      /**
       * CAS は repository の `UPDATE ... WHERE status = ? RETURNING` がそのまま担う。
       * ここで status を読み直して比較してはいけない (読みと書きの間が競合の窓になる)。
       */
      async compareAndSwapStatus({ expectedStatus, expectedAttempts, next }) {
        return deviceAuthorizationsRepo.transitionStatus(scopeOf(next.tenantId), {
          id: next.id,
          expectedStatus,
          expectedAttempts,
          next: {
            status: next.status,
            userId: next.approvedByUserId,
            workspaceId: next.workspaceId,
            attempts: next.attempts,
            intervalSec: next.intervalSeconds,
            lastPolledAt: toMillisOrNull(next.lastPolledAtSeconds),
          },
        });
      },
    },

    publisherTokens: {
      async create(record) {
        await publisherTokensRepo.create(scopeOf(record.tenantId), {
          id: record.id,
          workspaceId: record.workspaceId,
          userId: record.userId,
          deviceName: record.deviceLabel,
          refreshTokenHash: record.refreshTokenHash,
          scopesJson: serializeScopes(record.scope),
          familyId: record.familyId,
          lastUsedAt: toMillisOrNull(record.lastUsedAtSeconds),
          expiresAt: toMillis(record.expiresAtSeconds),
          revokedAt: toMillisOrNull(record.revokedAtSeconds),
          // TTL を決めた時計と created_at を揃える (expiresAt - createdAt が TTL と一致する)
          createdAt: toMillis(record.createdAtSeconds),
        });
      },

      async findByRefreshTokenHash(tenantId, refreshTokenHash) {
        const row = await publisherTokensRepo.findByRefreshTokenHash(scopeOf(tenantId), refreshTokenHash);
        return row === null ? null : toTokenRecord(row);
      },

      async findById(tenantId, id) {
        const row = await publisherTokensRepo.findById(scopeOf(tenantId), id);
        return row === null ? null : toTokenRecord(row);
      },

      async listByFamilyId(tenantId, familyId) {
        const rows = await publisherTokensRepo.listByFamilyId(scopeOf(tenantId), familyId);
        return rows.map(toTokenRecord);
      },

      async listByUserId(tenantId, userId) {
        const rows = await publisherTokensRepo.listByUserId(scopeOf(tenantId), userId);
        return rows.map(toTokenRecord);
      },

      async listByWorkspaceId(tenantId, workspaceId) {
        const rows = await publisherTokensRepo.listByWorkspaceId(scopeOf(tenantId), workspaceId);
        return rows.map(toTokenRecord);
      },

      async revokeIfActive({ tenantId, id, revokedAtSeconds, lastUsedAtSeconds }) {
        return publisherTokensRepo.revokeIfActive(scopeOf(tenantId), {
          id,
          revokedAt: toMillis(revokedAtSeconds),
          // exactOptionalPropertyTypes の下では `lastUsedAt: undefined` を渡せない。
          // 「キーを置かない」= 既存値を保つ、を条件付きスプレッドで表す。
          ...(lastUsedAtSeconds === undefined ? {} : { lastUsedAt: toMillis(lastUsedAtSeconds) }),
        });
      },

      async revokeFamily({ tenantId, familyId, revokedAtSeconds }) {
        return publisherTokensRepo.revokeFamily(scopeOf(tenantId), {
          familyId,
          revokedAt: toMillis(revokedAtSeconds),
        });
      },
    },
  };
}
