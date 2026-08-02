/**
 * 認証・認可の合成点 (composition root)。
 *
 * ここだけが「実装の実体をどこから取るか」を知る。route も判定層も port 型しか見ない。
 *
 * 本番の実体は 3 つ:
 *   - `createDbAuthPorts` — `packages/db` の repository へ結線した `AuthPorts`
 *   - `createDbAuditSink` — `audit_events` (append-only + hash chain) へ落とす sink
 *   - `createAuthjsHandler` — `@auth/core` を閉じ込めた adapter が返す route handler
 *
 * **in-memory 実装を本番経路へ差さない**。差すと認証が通ってしまい、未結線が 200 応答で隠れる
 * (ADR AD-8 と同じ理由)。設定が足りないときは例外にして起動時点で止める。
 */

import {
  type CoreRepositories,
  createCoreRepositories,
  createRepositoryContext,
  createTursoWebClient,
} from '@harness-hub/db';
import {
  type AuditLogger,
  type AuditSink,
  createAuditLogger,
  type RecordedAuditEvent,
} from '../../shared/audit/index.js';
import { type AuthRouteHandler, createAuthjsHandler } from '../auth/adapter/index.js';
import { readCwvProbeConfig } from '../auth/cwv-probe.js';
import { createDbAuthPorts, createDbClientSecretResolver } from '../auth/db-ports.js';
import { createDeviceFlowService, type DeviceFlowService } from '../auth/device-flow/index.js';
import {
  createGoogleOidcConnectionTester,
  createOidcAdminService,
  createUnavailableOidcAdminService,
  type OidcAdminService,
} from '../auth/oidc-admin/index.js';
import type { AuthPorts, TenantOidcConnection } from '../auth/ports.js';
import { readSharedGoogleCredentials } from '../auth/shared-credentials.js';
import { createRevocationChecker } from './revocation.js';
import type { AuthzRuntimeDeps } from './with-authz.js';

export interface AuthRuntimeEnv {
  readonly sessionSecret: string;
  readonly accessTokenSecret: string;
  /** state-changing 要求で許可する Origin。 */
  readonly allowedOrigins: readonly string[];
  /** device flow の照合画面 URL。 */
  readonly verificationUri: string;
  /**
   * この Hub の正規 origin (`https://hub.example.com`)。
   * OIDC の callback URL はここから組む。Host ヘッダから組むと Host 偽装で callback を差し替えられる。
   */
  readonly canonicalOrigin: string;
  /** 設定済みのときだけ protected CWV 計測を許可する最小権限 credential。 */
  readonly cwvProbe?: ReturnType<typeof readCwvProbeConfig>;
}

export interface AuthRuntime {
  readonly ports: AuthPorts;
  readonly authz: AuthzRuntimeDeps;
  readonly deviceFlow: DeviceFlowService;
  /** `/api/auth/{tenant_slug}/{action}` の実処理。Auth.js 由来の型は出て来ない。 */
  readonly authRoute: AuthRouteHandler;
  /** provider-admin 向け OIDC 接続管理 (issue-auth-tenancy-customer-managed-google-oidc-20260729)。 */
  readonly oidcAdmin: OidcAdminService;
}

export interface AuthRuntimeInput {
  readonly ports: AuthPorts;
  readonly auditSink: AuditSink;
  readonly env: AuthRuntimeEnv;
  /**
   * 解決済み接続の OIDC client_secret を取る関数。
   * `AuthPorts` に含めないのは、平文 secret を port の戻り値に載せると
   * port を受け取る全ての層 (device flow・認可判定) が触れる位置に置かれるため。
   *
   * 引数が接続そのものなのは、secret の出所 (テナント行の暗号化列 / 環境単位の共有 Secret) を
   * `credentialMode` で選ぶため。分岐の実体は `lib/auth/shared-credentials.ts` に閉じている。
   */
  readonly clientSecretFor: (connection: TenantOidcConnection) => Promise<string | null>;
  /**
   * OIDC 接続の管理サービスを作る関数。**省略可**にしてあるのは、認証・device flow だけを
   * 検査する既存テストに repository 一式を用意させないため。省略時は全操作が例外になる実体が入る
   * (`createUnavailableOidcAdminService`) — 未結線が「何も起きない成功」で隠れない。
   *
   * 実体ではなく関数で受けるのは、監査 logger を runtime 内の 1 個に揃えるため。
   * 外で別の logger を作って渡すと、runtime 単位の監査という前提が静かに崩れる。
   */
  readonly oidcAdmin?: (audit: AuditLogger) => OidcAdminService;
}

export function createAuthRuntime(input: AuthRuntimeInput): AuthRuntime {
  const audit = createAuditLogger({ sink: input.auditSink });

  return {
    oidcAdmin: input.oidcAdmin?.(audit) ?? createUnavailableOidcAdminService(),
    ports: input.ports,
    authz: {
      ports: input.ports,
      audit,
      // checker は runtime 単位で 1 つ。要求ごとに作ると TTL キャッシュが毎回空になる
      revocation: createRevocationChecker(input.ports.sessionRevocations, input.ports.clock),
      sessionSecret: input.env.sessionSecret,
      accessTokenSecret: input.env.accessTokenSecret,
      cwvProbe: input.env.cwvProbe,
      allowedOrigins: input.env.allowedOrigins,
    },
    deviceFlow: createDeviceFlowService({
      ports: input.ports,
      audit,
      accessTokenSecret: input.env.accessTokenSecret,
      verificationUri: input.env.verificationUri,
    }),
    authRoute: createAuthjsHandler({
      config: { oidcConnections: input.ports.oidcConnections, clientSecretFor: input.clientSecretFor },
      users: input.ports.users,
      // session の検証時刻は port の時計に合わせる。別の時計を使うと
      // 「middleware では期限内・handler では期限切れ」のような食い違いが生まれる
      clock: input.ports.clock,
      sessionSecret: input.env.sessionSecret,
      canonicalOrigin: input.env.canonicalOrigin,
    }),
  };
}

/**
 * hub の `AuditEvent` は actor 種別の列を持たない (`actorSubject` 1 本) が、
 * `audit_events.actor_type` は 3 値 enum を要求する。その差をここで埋める。
 *
 * 「不明」に落とさないのは、actor 種別が消えると監査上
 * 「CLI の publisher token でやられた操作」と「本人がブラウザでやった操作」が区別できなくなるため。
 * `metadata.credential` は `withAuthz` が `principal.credential` をそのまま入れている値。
 */
function actorTypeOf(event: RecordedAuditEvent): 'user' | 'publisher_token' | 'system' {
  // 'system' は auditEventFromContext が actorId 未設定スコープへ入れる sentinel
  if (event.actorSubject === 'system') return 'system';
  return event.metadata.credential === 'access_token' ? 'publisher_token' : 'user';
}

/**
 * `audit_events` へ書く本番 sink。
 *
 * `seq` / `prev_hash` / `created_at` は **repository が決める** (hash chain の連結は
 * テナント単位の直列化と一体で、呼び出し側から渡せる値ではない)。そのため hub 側で発番した
 * `RecordedAuditEvent.id` / `recordedAt` は行の主キー・時刻にはならず、
 * 突き合わせ用の相関 id として summary へ残す。捨てるとアプリログと監査行が繋がらなくなる。
 */
export function createDbAuditSink(auditRepo: CoreRepositories['audit']): AuditSink {
  return {
    async append(event) {
      await auditRepo.append(createRepositoryContext({ tenantId: event.tenantId, actorId: event.actorSubject }), {
        // workspace 非スコープの event は null ではなく「キーを置かない」で表す
        ...(event.workspaceId === null ? {} : { workspaceId: event.workspaceId }),
        actorType: actorTypeOf(event),
        actorId: event.actorSubject,
        action: event.action,
        entityType: event.resourceType,
        entityId: event.resourceId,
        summary: { ...event.metadata, event_id: event.id, recorded_at: event.recordedAt },
      });
    },
  };
}

/** 環境変数から設定を読む。欠けている値は既定へ落とさず例外にする (fail-closed)。 */
export function readAuthRuntimeEnv(source: Record<string, string | undefined> = process.env): AuthRuntimeEnv {
  const canonicalOrigin = requiredOrigin(source, 'AUTH_CANONICAL_ORIGIN');
  const cwvProbe = readCwvProbeConfig(source, canonicalOrigin);
  return {
    sessionSecret: required(source, 'AUTH_SESSION_SECRET'),
    accessTokenSecret: required(source, 'AUTH_ACCESS_TOKEN_SECRET'),
    allowedOrigins: required(source, 'AUTH_ALLOWED_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    verificationUri: required(source, 'AUTH_DEVICE_VERIFICATION_URI'),
    canonicalOrigin,
    ...(cwvProbe === undefined ? {} : { cwvProbe }),
  };
}

const AUTH_RUNTIME_SOURCE_KEYS = [
  'AUTH_SESSION_SECRET',
  'AUTH_ACCESS_TOKEN_SECRET',
  'AUTH_ALLOWED_ORIGINS',
  'AUTH_DEVICE_VERIFICATION_URI',
  'AUTH_CANONICAL_ORIGIN',
  'CWV_PROBE_SECRET',
  'CWV_PROBE_TENANT_ID',
  'CWV_PROBE_WORKSPACE_ID',
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'ENCRYPTION_KEK',
] as const;

interface CachedAuthRuntime {
  readonly sourceValues: readonly (string | undefined)[];
  readonly runtime: AuthRuntime;
}

let cachedRuntime: CachedAuthRuntime | null = null;

function runtimeSourceValues(source: Record<string, string | undefined>): readonly (string | undefined)[] {
  return AUTH_RUNTIME_SOURCE_KEYS.map((key) => source[key]);
}

function sameRuntimeSource(left: readonly (string | undefined)[], right: readonly (string | undefined)[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * 本番経路の runtime。
 *
 * DB 接続と失効チェックの TTL キャッシュを isolate 内で再利用する。ただし Cloudflare は
 * binding/Secret だけを更新したとき既存 isolate を再利用しうるため、認証・DB 設定の値を要求ごとに比較し、
 * 1 つでも変わっていれば runtime を作り直す。これにより鍵や接続先の更新後に旧値を使い続けない。
 *
 * 比較値はログや例外へ出さない。Secret の内容はキャッシュ判定だけに使う。
 */
export function authRuntime(source: Record<string, string | undefined> = process.env): AuthRuntime {
  const sourceValues = runtimeSourceValues(source);
  if (cachedRuntime === null || !sameRuntimeSource(cachedRuntime.sourceValues, sourceValues)) {
    cachedRuntime = { sourceValues, runtime: createProductionAuthRuntime(source) };
  }
  return cachedRuntime.runtime;
}

/**
 * 環境変数から本番 runtime を組み立てる (キャッシュしない)。
 * `authRuntime()` が設定変更時に呼ぶ。分けてあるのは結線を単体で検査できるようにするため。
 */
export function createProductionAuthRuntime(source: Record<string, string | undefined> = process.env): AuthRuntime {
  const env = readAuthRuntimeEnv(source);
  // KEK は文字列のまま渡し、cipher の生成は packages/db 側に任せる (鍵を扱う層を増やさない)
  const repositories = createCoreRepositories({
    // Workers 用 entry を名指しする。native binding 版 (createTursoClient) は workerd で動かない
    adapter: createTursoWebClient(readTursoEnv(source)),
    kekBase64: required(source, 'ENCRYPTION_KEK'),
  });

  // 共有 Google OAuth client は環境単位で 1 組。未設定なら共有方式のテナントが解決されないだけで、
  // 顧客持ち込み方式のテナントは従来どおり動く (issue-auth-tenancy-shared-google-oidc-20260729)
  const sharedGoogle = readSharedGoogleCredentials(source);

  return createAuthRuntime({
    // ports と resolver へ同じ値を渡す。片方だけに渡すと
    // 「client_id は解決できるが secret が無い」テナントが生まれる
    ports: createDbAuthPorts({ repositories, sharedGoogle }),
    auditSink: createDbAuditSink(repositories.audit),
    clientSecretFor: createDbClientSecretResolver({ repositories, sharedGoogle }),
    // 接続テストは global fetch。Workers 側でも同じ実体なので差し替えない
    oidcAdmin: (audit) =>
      createOidcAdminService({
        repositories,
        audit,
        canonicalOrigin: env.canonicalOrigin,
        testConnection: createGoogleOidcConnectionTester(),
      }),
    env,
  });
}

/**
 * libSQL 接続設定。
 * `libsql://` / `https://` (= リモート) では authToken を必須にする。
 * リモートを無認証で叩ける設定を「省略可」にしておくと、token を入れ忘れた構成が
 * 起動には成功してしまう。
 *
 * リモート以外 (`file:` 等) はここでは弾かず `createTursoWebClient` 側が拒否する。
 * 「どの driver で何が開けるか」は接続層の知識で、合成点に写すと二重定義になる。
 */
function readTursoEnv(source: Record<string, string | undefined>): { url: string; authToken?: string } {
  const url = required(source, 'TURSO_DATABASE_URL');
  const remote = /^(?:libsql|https|wss):/i.test(url);
  const authToken = source.TURSO_AUTH_TOKEN?.trim();

  if (!remote) return { url };
  if (authToken === undefined || authToken.length === 0) {
    throw new Error(`環境変数 TURSO_AUTH_TOKEN が未設定です (TURSO_DATABASE_URL=${url} はリモート接続)`);
  }
  return { url, authToken };
}

function required(source: Record<string, string | undefined>, key: string): string {
  const value = source[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`環境変数 ${key} が未設定です`);
  }
  return value;
}

/**
 * 絶対 URL を受け取り origin だけへ正規化する。
 * path や末尾スラッシュを落とすのは、設定に `https://hub.example.com/app` のような値が入ったときに
 * callback URL がずれるのを防ぐため (値を信じてそのまま連結すると気付けない)。
 */
function requiredOrigin(source: Record<string, string | undefined>, key: string): string {
  const raw = required(source, key);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`環境変数 ${key} は絶対 URL である必要があります (例: https://hub.example.com)`);
  }
  if (parsed.origin === 'null') {
    throw new Error(`環境変数 ${key} の origin を決定できません (指定値: ${raw})`);
  }
  return parsed.origin;
}
