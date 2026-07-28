/**
 * 認証・認可の合成点 (`src/lib/authz/runtime.ts`)。
 *
 * ここは「実体をどこから取るか」だけを持つ層なので、検査するのは**結線と fail-closed** の 2 点。
 *   - 設定が欠けたら既定へ落とさず例外にするか (起動時点で止まるか)
 *   - isolate 内キャッシュが Secret 更新後に旧 runtime を使い続けないか
 *
 * DB 接続は張らない。`@harness-hub/db` の接続系 2 関数だけ差し替え、
 * `createRepositoryContext` は本物を残す (監査 sink が作る scope の検証を素通しにしないため)。
 */

import type { CoreRepositories } from '@harness-hub/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  authRuntime,
  createAuthRuntime,
  createDbAuditSink,
  createProductionAuthRuntime,
  readAuthRuntimeEnv,
} from '../../src/lib/authz/runtime.js';
import { createInMemoryAuditSink, type RecordedAuditEvent } from '../../src/shared/audit/index.js';
import { createTestPorts, TENANT_A, WORKSPACE_A1 } from './support/in-memory-ports.js';

const dbMocks = vi.hoisted(() => ({
  createTursoWebClient: vi.fn(),
  createCoreRepositories: vi.fn(),
}));

vi.mock('@harness-hub/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@harness-hub/db')>();
  return {
    ...actual,
    createTursoWebClient: dbMocks.createTursoWebClient,
    createCoreRepositories: dbMocks.createCoreRepositories,
  };
});

/** `createDbAuthPorts` / `createDbClientSecretResolver` が分解するキーだけ持つ差し替え。 */
function fakeRepositories(): CoreRepositories {
  return {
    tenants: {},
    users: {},
    userWorkspaces: {},
    idpConnections: {},
    sessionRevocations: {},
    deviceAuthorizations: {},
    publisherTokens: {},
    audit: { append: vi.fn() },
  } as unknown as CoreRepositories;
}

const REQUIRED_AUTH_KEYS = [
  'AUTH_SESSION_SECRET',
  'AUTH_ACCESS_TOKEN_SECRET',
  'AUTH_ALLOWED_ORIGINS',
  'AUTH_DEVICE_VERIFICATION_URI',
  'AUTH_CANONICAL_ORIGIN',
] as const;

const ALL_SOURCE_KEYS = [...REQUIRED_AUTH_KEYS, 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ENCRYPTION_KEK'] as const;

function envSource(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    AUTH_SESSION_SECRET: 'session-secret',
    AUTH_ACCESS_TOKEN_SECRET: 'access-secret',
    AUTH_ALLOWED_ORIGINS: 'https://hub.example.com, https://admin.example.com',
    AUTH_DEVICE_VERIFICATION_URI: 'https://hub.example.com/device',
    AUTH_CANONICAL_ORIGIN: 'https://hub.example.com',
    TURSO_DATABASE_URL: 'libsql://hub.turso.io',
    TURSO_AUTH_TOKEN: 'turso-token',
    ENCRYPTION_KEK: 'a'.repeat(44),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.createTursoWebClient.mockImplementation(() => ({ kind: 'fake-adapter' }));
  dbMocks.createCoreRepositories.mockImplementation(() => fakeRepositories());
});

describe('readAuthRuntimeEnv: 設定の読み取りと正規化', () => {
  it('全て揃っていれば正規化して返す (Origin は trim、canonicalOrigin は origin へ切り詰め)', () => {
    const env = readAuthRuntimeEnv(
      envSource({
        AUTH_ALLOWED_ORIGINS: ' https://hub.example.com ,, https://admin.example.com ,',
        AUTH_CANONICAL_ORIGIN: 'https://hub.example.com/app/?q=1',
      }),
    );

    expect(env).toEqual({
      sessionSecret: 'session-secret',
      accessTokenSecret: 'access-secret',
      allowedOrigins: ['https://hub.example.com', 'https://admin.example.com'],
      verificationUri: 'https://hub.example.com/device',
      // path や query を落とさないと callback URL がずれる
      canonicalOrigin: 'https://hub.example.com',
    });
  });

  it.each(REQUIRED_AUTH_KEYS)('%s が未設定なら例外 (既定へ落とさない)', (key) => {
    expect(() => readAuthRuntimeEnv(envSource({ [key]: undefined }))).toThrow(`環境変数 ${key} が未設定です`);
  });

  it.each(REQUIRED_AUTH_KEYS)('%s が空白のみでも未設定として扱う', (key) => {
    expect(() => readAuthRuntimeEnv(envSource({ [key]: '   ' }))).toThrow(`環境変数 ${key} が未設定です`);
  });

  it('AUTH_CANONICAL_ORIGIN が絶対 URL でなければ例外', () => {
    expect(() => readAuthRuntimeEnv(envSource({ AUTH_CANONICAL_ORIGIN: 'hub.example.com' }))).toThrow(
      '環境変数 AUTH_CANONICAL_ORIGIN は絶対 URL である必要があります (例: https://hub.example.com)',
    );
  });

  it('AUTH_CANONICAL_ORIGIN の origin が決まらない scheme は例外', () => {
    expect(() => readAuthRuntimeEnv(envSource({ AUTH_CANONICAL_ORIGIN: 'data:text/plain,hub' }))).toThrow(
      '環境変数 AUTH_CANONICAL_ORIGIN の origin を決定できません',
    );
  });

  it('引数を省略すると process.env から読む', () => {
    const saved = new Map(ALL_SOURCE_KEYS.map((key) => [key, process.env[key]]));
    try {
      for (const [key, value] of Object.entries(envSource())) {
        if (value !== undefined) process.env[key] = value;
      }
      expect(readAuthRuntimeEnv().canonicalOrigin).toBe('https://hub.example.com');
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

describe('createAuthRuntime: 依存の結線', () => {
  function runtimeWithFakes() {
    const ports = createTestPorts();
    const sink = createInMemoryAuditSink();
    const clientSecretFor = vi.fn(async () => 'client-secret');
    const runtime = createAuthRuntime({
      ports,
      auditSink: sink,
      clientSecretFor,
      env: readAuthRuntimeEnv(envSource()),
    });
    return { ports, sink, runtime };
  }

  it('ports をそのまま公開し、authz 側にも同じ ports を渡す', () => {
    const { ports, runtime } = runtimeWithFakes();
    expect(runtime.ports).toBe(ports);
    expect(runtime.authz.ports).toBe(ports);
  });

  it('env の secret と許可 Origin を authz deps へ写す', () => {
    const { runtime } = runtimeWithFakes();
    expect(runtime.authz.sessionSecret).toBe('session-secret');
    expect(runtime.authz.accessTokenSecret).toBe('access-secret');
    expect(runtime.authz.allowedOrigins).toEqual(['https://hub.example.com', 'https://admin.example.com']);
  });

  it('device flow と auth route の入口が生える', () => {
    const { runtime } = runtimeWithFakes();
    expect(typeof runtime.deviceFlow.requestCode).toBe('function');
    expect(typeof runtime.authRoute).toBe('function');
  });

  it('失効 checker は runtime 単位で 1 つ (要求ごとに作り直さない)', async () => {
    const { runtime } = runtimeWithFakes();
    await expect(runtime.authz.revocation.isRevoked(TENANT_A, 'user-a', 1_800_000_000)).resolves.toBe(false);
  });

  it('audit logger は注入した sink へ落ちる', async () => {
    const { sink, runtime } = runtimeWithFakes();
    await runtime.authz.audit.record({
      actorSubject: 'user-a',
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A1,
      action: 'token.revoke',
      resourceType: 'token',
      resourceId: 'token-1',
      metadata: {},
    });
    expect(sink.events()).toHaveLength(1);
  });
});

describe('createDbAuditSink: hub の event を audit_events 行へ翻訳する', () => {
  function recorded(overrides: Partial<RecordedAuditEvent> = {}): RecordedAuditEvent {
    return {
      id: 'audit-1',
      recordedAt: '2026-07-28T00:00:00.000Z',
      actorSubject: 'user-a',
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A1,
      action: 'token.revoke',
      resourceType: 'token',
      resourceId: 'token-1',
      metadata: { credential: 'session' },
      ...overrides,
    };
  }

  function sinkHarness() {
    const append = vi.fn<CoreRepositories['audit']['append']>();
    const sink = createDbAuditSink({ append } as unknown as CoreRepositories['audit']);
    return { append, sink };
  }

  it('scope は event の tenant / actor から作る (呼び出し側で書き写さない)', async () => {
    const { append, sink } = sinkHarness();
    await sink.append(recorded());
    expect(append.mock.calls[0]?.[0]).toEqual({ tenantId: TENANT_A, actorId: 'user-a' });
  });

  it('session 由来の actor は user', async () => {
    const { append, sink } = sinkHarness();
    await sink.append(recorded());
    expect(append.mock.calls[0]?.[1]).toMatchObject({ actorType: 'user' });
  });

  it('metadata.credential が access_token なら publisher_token', async () => {
    const { append, sink } = sinkHarness();
    await sink.append(recorded({ metadata: { credential: 'access_token' } }));
    expect(append.mock.calls[0]?.[1]).toMatchObject({ actorType: 'publisher_token' });
  });

  it('actorSubject が sentinel の system なら system', async () => {
    const { append, sink } = sinkHarness();
    await sink.append(recorded({ actorSubject: 'system', metadata: { credential: 'access_token' } }));
    expect(append.mock.calls[0]?.[1]).toMatchObject({ actorType: 'system' });
  });

  it('workspace 非スコープの event は workspaceId キー自体を置かない', async () => {
    const { append, sink } = sinkHarness();
    await sink.append(recorded({ workspaceId: null }));
    expect(append.mock.calls[0]?.[1]).not.toHaveProperty('workspaceId');
  });

  it('workspace スコープの event は workspaceId を載せる', async () => {
    const { append, sink } = sinkHarness();
    await sink.append(recorded());
    expect(append.mock.calls[0]?.[1]).toMatchObject({ workspaceId: WORKSPACE_A1 });
  });

  it('hub 側で発番した id と時刻は summary へ相関 id として残す', async () => {
    const { append, sink } = sinkHarness();
    await sink.append(recorded());
    expect(append.mock.calls[0]?.[1]).toMatchObject({
      action: 'token.revoke',
      entityType: 'token',
      entityId: 'token-1',
      summary: { credential: 'session', event_id: 'audit-1', recorded_at: '2026-07-28T00:00:00.000Z' },
    });
  });
});

describe('createProductionAuthRuntime: 本番結線と接続設定の fail-closed', () => {
  it('Workers 用 entry へ url と authToken を渡し、KEK は文字列のまま repositories へ委ねる', () => {
    const runtime = createProductionAuthRuntime(envSource());

    expect(dbMocks.createTursoWebClient).toHaveBeenCalledWith({
      url: 'libsql://hub.turso.io',
      authToken: 'turso-token',
    });
    expect(dbMocks.createCoreRepositories).toHaveBeenCalledWith({
      adapter: { kind: 'fake-adapter' },
      kekBase64: 'a'.repeat(44),
    });
    expect(runtime.authz.allowedOrigins).toEqual(['https://hub.example.com', 'https://admin.example.com']);
  });

  it.each(['libsql://hub.turso.io', 'https://hub.turso.io', 'WSS://hub.turso.io'])(
    'リモート接続 (%s) で TURSO_AUTH_TOKEN が無ければ起動時に例外',
    (url) => {
      expect(() =>
        createProductionAuthRuntime(envSource({ TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: undefined })),
      ).toThrow('環境変数 TURSO_AUTH_TOKEN が未設定です');
    },
  );

  it('TURSO_AUTH_TOKEN が空白のみでも未設定として扱う', () => {
    expect(() => createProductionAuthRuntime(envSource({ TURSO_AUTH_TOKEN: '   ' }))).toThrow(
      '環境変数 TURSO_AUTH_TOKEN が未設定です',
    );
  });

  it('リモート以外 (file:) は authToken を付けずに接続層へ委ねる', () => {
    createProductionAuthRuntime(envSource({ TURSO_DATABASE_URL: 'file:local.db', TURSO_AUTH_TOKEN: undefined }));
    expect(dbMocks.createTursoWebClient).toHaveBeenCalledWith({ url: 'file:local.db' });
  });

  it('TURSO_DATABASE_URL が無ければ例外', () => {
    expect(() => createProductionAuthRuntime(envSource({ TURSO_DATABASE_URL: undefined }))).toThrow(
      '環境変数 TURSO_DATABASE_URL が未設定です',
    );
  });

  it('ENCRYPTION_KEK が無ければ例外', () => {
    expect(() => createProductionAuthRuntime(envSource({ ENCRYPTION_KEK: undefined }))).toThrow(
      '環境変数 ENCRYPTION_KEK が未設定です',
    );
  });

  it('認証設定が欠けていれば DB へ接続する前に落ちる', () => {
    expect(() => createProductionAuthRuntime(envSource({ AUTH_SESSION_SECRET: undefined }))).toThrow(
      '環境変数 AUTH_SESSION_SECRET が未設定です',
    );
    expect(dbMocks.createTursoWebClient).not.toHaveBeenCalled();
  });
});

describe('authRuntime: isolate 内キャッシュ', () => {
  /**
   * `cachedRuntime` はモジュールスコープの可変状態で、テスト間で持ち越される。
   * モジュールを読み直す代わりに、テストごとに **異なる secret** を使って必ず初回を miss にする。
   * (`vi.resetModules()` は動的 import の分だけ coverage の書き出しを増やし、実行を不安定にする)
   */
  function uniqueSource(marker: string, overrides: Record<string, string | undefined> = {}) {
    return envSource({ AUTH_SESSION_SECRET: `secret-${marker}`, ...overrides });
  }

  it('設定値が同じなら runtime を作り直さない (DB 接続と TTL キャッシュを保つ)', () => {
    const first = authRuntime(uniqueSource('cache-hit'));
    const second = authRuntime(uniqueSource('cache-hit'));

    expect(second).toBe(first);
    expect(dbMocks.createCoreRepositories).toHaveBeenCalledTimes(1);
  });

  it('鍵が 1 つでも変われば作り直す (Secret 更新後に旧値を使い続けない)', () => {
    const first = authRuntime(uniqueSource('rotate-before'));
    const second = authRuntime(uniqueSource('rotate-after'));

    expect(second).not.toBe(first);
    expect(dbMocks.createCoreRepositories).toHaveBeenCalledTimes(2);
  });

  it('接続先が変われば作り直す', () => {
    const first = authRuntime(uniqueSource('conn'));
    const second = authRuntime(uniqueSource('conn', { TURSO_DATABASE_URL: 'libsql://hub-2.turso.io' }));

    expect(second).not.toBe(first);
    expect(dbMocks.createCoreRepositories).toHaveBeenCalledTimes(2);
  });

  it('引数を省略すると process.env を見る', () => {
    const saved = new Map(ALL_SOURCE_KEYS.map((key) => [key, process.env[key]]));
    try {
      for (const [key, value] of Object.entries(uniqueSource('from-process-env'))) {
        if (value !== undefined) process.env[key] = value;
      }
      expect(authRuntime()).toBe(authRuntime());
      expect(dbMocks.createCoreRepositories).toHaveBeenCalledTimes(1);
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
