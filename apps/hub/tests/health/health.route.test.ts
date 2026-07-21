// HF-A3-HEALTH-001/002/003: /health の応答コード・契約適合・依存不通時の挙動を検証する
//
// スタブは **実環境に存在しうるものだけ** を置く (P10 指摘 F-01)。
// Turso は @libsql/client (HTTP) 接続で native な DB binding を持たない (infrastructure-spec §4) ため、
// `env.DB` のような存在しない binding をスタブして緑にしてはならない。

import { healthResponseSchema } from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type DependencyProbe, defaultProbes, runDependencyProbes } from '../../src/app/health/probes.js';
import { buildHealthHttpResponse, GET } from '../../src/app/health/route.js';
import type { R2HeadCapable, RuntimeEnv } from '../../src/app/health/runtime-env.js';

/** R2 binding の代替。Workers 上では head を持つオブジェクトが注入される */
function stubBucket(head: (key: string) => Promise<unknown> = async () => null): R2HeadCapable {
  return { head };
}

/** Turso `/v2/pipeline` の正常応答 */
function okPipelineFetch(record?: { url?: string; init?: RequestInit }): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    if (record) {
      record.url = String(input);
      if (init !== undefined) record.init = init;
    }
    return new Response(JSON.stringify({ results: [{ type: 'ok' }, { type: 'ok' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

/** infrastructure-spec §2 の台帳に実在する secret / binding だけで組んだ健全な実行環境 */
function healthyEnv(overrides: Partial<RuntimeEnv> = {}): RuntimeEnv {
  return {
    HUB_ENV: 'production',
    HUB_VERSION: 'test-revision',
    TURSO_DATABASE_URL: 'libsql://harness-hub-prod.turso.io',
    TURSO_AUTH_TOKEN: 'turso-token-for-test',
    PACKAGES_BUCKET: stubBucket(),
    BACKUPS_BUCKET: stubBucket(),
    ...overrides,
  };
}

async function respond(env: RuntimeEnv, fetchImpl: typeof fetch = okPipelineFetch()): Promise<Response> {
  return buildHealthHttpResponse({
    version: 'test-revision',
    probes: defaultProbes(env, { fetchImpl }),
  });
}

describe('GET /health', () => {
  // HF-A3-HEALTH-001
  it('依存が健全なとき 200 を返し status が ok になる', async () => {
    const response = await respond(healthyEnv());
    const body = healthResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  // HF-A3-HEALTH-002
  it('応答が {status, version, checkedAt, dependencies[]} の契約を満たす', async () => {
    const response = await respond(healthyEnv());
    const body: unknown = await response.json();

    // 契約の正本は @harness-hub/schemas。apps/hub 側で形を再定義しない
    const parsed = healthResponseSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true);
    expect(['ok', 'degraded', 'down']).toContain(parsed.data?.status);
    expect(parsed.data?.version).toBe('test-revision');
    expect(parsed.data?.dependencies.map((dependency) => dependency.name)).toStrictEqual([
      'runtime-config',
      'db',
      'r2',
    ]);
  });

  it('キャッシュされない (no-store)', async () => {
    const response = await respond(healthyEnv());
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('db プローブが Turso へ SELECT 1 を実際に投げている', async () => {
    const record: { url?: string; init?: RequestInit } = {};
    await respond(healthyEnv(), okPipelineFetch(record));

    // libsql:// は HTTP 上のプロトコルなので https へ読み替えて叩く
    expect(record.url).toBe('https://harness-hub-prod.turso.io/v2/pipeline');
    expect(String(record.init?.body)).toContain('SELECT 1');
  });
});

describe('HF-A3-HEALTH-003: 依存不通時の挙動', () => {
  it('Turso の secret が未投入なら down になり 503 を返す', async () => {
    // 未プロビジョニング状態。200 を返すと外形監視が可用性ありと誤計測するため down にする。
    // 「未設定」は値 undefined ではなく **key が無い** 状態なので、上書きではなく env を組み直す
    const withoutCredentials: RuntimeEnv = {
      HUB_ENV: 'production',
      HUB_VERSION: 'test-revision',
      PACKAGES_BUCKET: stubBucket(),
      BACKUPS_BUCKET: stubBucket(),
    };
    const response = await respond(withoutCredentials);
    const body = healthResponseSchema.parse(await response.json());

    expect(body.status).toBe('down');
    expect(response.status).toBe(503);
    expect(body.dependencies.find((dependency) => dependency.name === 'db')?.detail).toBe('turso_credentials_missing');
  });

  it('Turso が HTTP エラーを返すと down になり 503 を返す', async () => {
    const failing = (async () => new Response('{}', { status: 503 })) as typeof fetch;
    const response = await respond(healthyEnv(), failing);
    const body = healthResponseSchema.parse(await response.json());

    expect(body.status).toBe('down');
    expect(response.status).toBe(503);
    expect(body.dependencies.find((dependency) => dependency.name === 'db')?.detail).toBe('turso_http_503');
  });

  it('Turso の応答が失敗結果なら down になる', async () => {
    const errorPipeline = (async () =>
      new Response(JSON.stringify({ results: [{ type: 'error' }] }), { status: 200 })) as typeof fetch;
    const body = healthResponseSchema.parse(await (await respond(healthyEnv(), errorPipeline)).json());

    expect(body.dependencies.find((dependency) => dependency.name === 'db')?.status).toBe('down');
  });

  it('失敗 detail に auth token を載せない', async () => {
    const failing = (async () => new Response('{}', { status: 401 })) as typeof fetch;
    const raw = await (await respond(healthyEnv(), failing)).text();

    expect(raw).not.toContain('turso-token-for-test');
  });

  it('R2 binding が無いと degraded になるが HTTP は 200 のまま', async () => {
    // R2 停止時も catalog 閲覧は継続する (infrastructure-spec §10) ため 503 にしない
    const withoutPackagesBucket: RuntimeEnv = {
      HUB_ENV: 'production',
      HUB_VERSION: 'test-revision',
      TURSO_DATABASE_URL: 'libsql://harness-hub-prod.turso.io',
      TURSO_AUTH_TOKEN: 'turso-token-for-test',
      BACKUPS_BUCKET: stubBucket(),
    };
    const response = await respond(withoutPackagesBucket);
    const body = healthResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.status).toBe('degraded');
    expect(body.dependencies.find((dependency) => dependency.name === 'r2')?.detail).toBe(
      'PACKAGES_BUCKET_binding_missing',
    );
  });

  it('R2 head が失敗すると degraded になる', async () => {
    const env = healthyEnv({
      BACKUPS_BUCKET: stubBucket(async () => {
        throw new Error('r2_unreachable');
      }),
    });
    const body = healthResponseSchema.parse(await (await respond(env)).json());

    expect(body.status).toBe('degraded');
    expect(body.dependencies.find((dependency) => dependency.name === 'r2')?.status).toBe('degraded');
  });

  it('HUB_ENV が未設定なら down になる', async () => {
    const body = healthResponseSchema.parse(await (await respond(healthyEnv({ HUB_ENV: '' }))).json());
    expect(body.status).toBe('down');
  });
});

describe('既定プローブ集合', () => {
  // 「常に空 = 常に ok」で /health がゲートとして機能しなくなるのを防ぐ
  it('runtime-config / db / r2 の 3 件を検査し、存在しない binding を対象にしない', () => {
    const probes = defaultProbes(healthyEnv());

    expect(probes.map((probe) => probe.name)).toStrictEqual(['runtime-config', 'db', 'r2']);
    // Turso は HTTP 接続で native binding を持たない (infrastructure-spec §4)。
    // env.DB のような実在しない binding を条件にすると本番で恒常 503 になる
    expect(probes.some((probe) => probe.name.toLowerCase().includes('binding'))).toBe(false);
  });

  it('critical の割当が縮退マトリクスと一致する (db=critical / r2=非critical)', () => {
    const probes = defaultProbes(healthyEnv());
    const byName = new Map(probes.map((probe) => [probe.name, probe.critical]));

    expect(byName.get('runtime-config')).toBe(true);
    expect(byName.get('db')).toBe(true);
    expect(byName.get('r2')).toBe(false);
  });

  it('プローブが時間内に返らない場合も応答を返す', async () => {
    const hangingProbe: DependencyProbe = {
      name: 'slow',
      critical: false,
      check: () => new Promise(() => {}),
    };
    const dependencies = await runDependencyProbes([hangingProbe], 10);
    expect(dependencies[0]?.status).toBe('degraded');
    expect(dependencies[0]?.detail).toBe('timeout');
  });
});

describe('route handler (実行環境の読み取り込み)', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    // Workers 外では runtime-env が process.env を読む。secret 名は infrastructure-spec §2 の台帳どおり
    process.env.HUB_ENV = 'test';
    process.env.HUB_VERSION = 'test-revision';
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('secret も binding も無い素の Node 環境では down (503) を返す', async () => {
    // 実行環境が整っていないことを 200 で隠さないことの確認。
    // ここを 200 にするスタブを置くと F-01 の「本番だけ 503」を再発させる
    const response = await GET();
    const body = healthResponseSchema.parse(await response.json());

    expect(response.status).toBe(503);
    expect(body.status).toBe('down');
    expect(body.version).toBe('test-revision');
  });
});
