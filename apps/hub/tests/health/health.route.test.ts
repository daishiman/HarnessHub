// HF-A3-HEALTH-001/002/003: /health の応答コード・契約適合・依存不通時の挙動を検証する

import { healthResponseSchema } from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type DependencyProbe, defaultProbes, runDependencyProbes } from '../../src/app/health/probes.js';
import { buildHealthHttpResponse, GET } from '../../src/app/health/route.js';

/** 全て疎通する依存 */
const healthyProbes: readonly DependencyProbe[] = [{ name: 'db', critical: true, check: async () => {} }];

/** critical な依存が落ちている状態 */
const downProbes: readonly DependencyProbe[] = [
  {
    name: 'db',
    critical: true,
    check: async () => {
      throw new Error('connection_refused');
    },
  },
];

/** 非 critical な依存だけが落ちている状態 (縮退運転) */
const degradedProbes: readonly DependencyProbe[] = [
  { name: 'db', critical: true, check: async () => {} },
  {
    name: 'notification-mail',
    critical: false,
    check: async () => {
      throw new Error('smtp_unreachable');
    },
  },
];

describe('GET /health', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    // Workers の binding をローカルで代替する。runtime-env は Workers 外では process.env を読む
    process.env.HUB_ENV = 'test';
    process.env.HUB_VERSION = 'test-revision';
    process.env.DB = 'stub-binding';
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  // HF-A3-HEALTH-001
  it('依存が健全なとき 200 を返す', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  // HF-A3-HEALTH-002
  it('応答が {status, version, checkedAt, dependencies[]} の契約を満たす', async () => {
    const response = await GET();
    const body: unknown = await response.json();

    // 契約の正本は @harness-hub/schemas。apps/hub 側で形を再定義しない
    const parsed = healthResponseSchema.safeParse(body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true);
    expect(['ok', 'degraded', 'down']).toContain(parsed.data?.status);
    expect(parsed.data?.version).toBe('test-revision');
    expect(Array.isArray(parsed.data?.dependencies)).toBe(true);
  });

  it('キャッシュされない (no-store)', async () => {
    const response = await GET();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  // HF-A3-HEALTH-003
  it('critical な依存が不通のとき status が down になり 503 を返す', async () => {
    const response = await buildHealthHttpResponse({ version: 'v', probes: downProbes });
    const body = healthResponseSchema.parse(await response.json());

    expect(body.status).not.toBe('ok');
    expect(body.status).toBe('down');
    expect(response.status).toBe(503);
    expect(body.dependencies.find((d) => d.name === 'db')?.status).toBe('down');
  });

  // HF-A3-HEALTH-003 (縮退側): 監視は body の status で判定するため HTTP は 200 のまま
  it('非 critical な依存が不通のとき status が degraded になり HTTP は 200', async () => {
    const response = await buildHealthHttpResponse({ version: 'v', probes: degradedProbes });
    const body = healthResponseSchema.parse(await response.json());

    expect(body.status).toBe('degraded');
    expect(response.status).toBe(200);
  });

  it('依存が健全なら status は ok', async () => {
    const response = await buildHealthHttpResponse({ version: 'v', probes: healthyProbes });
    const body = healthResponseSchema.parse(await response.json());
    expect(body.status).toBe('ok');
    expect(response.status).toBe(200);
  });

  // 「常に空 = 常に ok」で /health がゲートとして機能しなくなるのを防ぐ
  it('既定プローブは 1 件以上あり、DB binding 未設定を検出できる', async () => {
    const probes = defaultProbes({ HUB_ENV: 'test' });
    expect(probes.length).toBeGreaterThan(0);

    const dependencies = await runDependencyProbes(probes);
    expect(dependencies.find((d) => d.name === 'db')?.status).toBe('down');
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
