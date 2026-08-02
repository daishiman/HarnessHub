/**
 * DC-MKT-01..09: marketplace 文書生成と配布経路未確定の表明 (qa-003 / I6 / I9)。
 *
 * 中心は「**0 件** と **経路未確定** を同じ緑にしない」こと (P03 指摘 R5)。
 * 両者が区別できないと、Stage 0 gate H7 が未成立のまま配布が始まったことに誰も気づけない。
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { CatalogEntry } from '@harness-hub/schemas';
import { isoDateTimeSchema, marketplaceDocumentSchema } from '@harness-hub/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthRuntime } from '../../lib/authz/runtime.js';

/**
 * 認可判定は本物を通し、runtime (鍵・DB port) だけをテスト用に差し替える。
 * 既存 `tests/publish-pipeline/routes-auth.cases.ts` と同じ形にしてある。
 */
const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 runtime が未設定です');
      return runtimeHolder.current;
    },
  };
});

import { TENANT_A, WORKSPACE_A1 } from '../../../tests/auth-tenancy/support/in-memory-ports.js';
import {
  adminUser,
  createTokenRouteHarness,
  sessionCookieFor,
} from '../../../tests/auth-tenancy/support/token-route-runtime.js';
import { GET as marketplaceRoute } from '../../app/marketplace.json/route.js';
import { buildMarketplaceDocument, resolveAdoptedSourceResolver } from '../../lib/catalog/marketplace.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware/index.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../../..');

const BUILD_OPTIONS = {
  name: 'harness-hub-workspace',
  description: 'テスト用カタログ',
  version: '0.1.0',
  ownerName: 'Harness Hub',
};

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    project_id: 'proj-1',
    name: 'sample-skill',
    summary: '請求書の下書きを作る',
    target: 'skill',
    visibility: 'workspace',
    stable_version: 'v1',
    release_status: 'available',
    download_count: 3,
    // 日時は brand 型。schema を通して作り、契約に載る形だけを fixture に使う
    updated_at: isoDateTimeSchema.parse('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('DC-MKT / 文書の形と純粋性', () => {
  it('DC-MKT-01: .claude-plugin/marketplace.json と同一キーで出力する', async () => {
    const existing = JSON.parse(
      await readFile(path.join(REPO_ROOT, '.claude-plugin/marketplace.json'), 'utf8'),
    ) as Record<string, unknown> & { plugins: Record<string, unknown>[] };

    const document = buildMarketplaceDocument([entry()], { ...BUILD_OPTIONS, source: () => 'github:example/repo' });

    // 既存形式に無いキーを勝手に足さない。足すのは Hub 固有の source_status だけで、
    // それも「未確定を観測可能にする」ためという明示された理由がある
    const extraKeys = Object.keys(document).filter((key) => !Object.hasOwn(existing, key));
    expect(extraKeys).toEqual(['source_status']);
    for (const key of ['name', 'description', 'version', 'owner', 'plugins']) {
      expect(Object.hasOwn(document, key)).toBe(true);
    }

    const existingPluginKeys = Object.keys(existing.plugins[0] ?? {}).sort();
    expect(Object.keys(document.plugins[0] ?? {}).sort()).toEqual(existingPluginKeys);
  });

  it('DC-MKT-02: zod スキーマ検証に通る', () => {
    const document = buildMarketplaceDocument([entry()], { ...BUILD_OPTIONS, source: () => 'github:example/repo' });
    expect(marketplaceDocumentSchema.safeParse(document).success).toBe(true);
  });

  it('DC-MKT-03: 同一入力で同一出力 (時刻・乱数に依存しない)', () => {
    const entries = [entry(), entry({ project_id: 'proj-2', name: 'sample-web', target: 'web_app' })];
    const options = { ...BUILD_OPTIONS, source: (item: CatalogEntry) => `github:example/${item.project_id}` };
    expect(buildMarketplaceDocument(entries, options)).toEqual(buildMarketplaceDocument(entries, options));
  });

  it('配布してよい entry だけを載せる (private / 未公開 / 停止版を除く)', () => {
    const entries = [
      entry({ project_id: 'ok' }),
      entry({ project_id: 'private', visibility: 'private' }),
      entry({ project_id: 'unpublished', stable_version: null, release_status: null }),
      entry({ project_id: 'suspended', release_status: 'suspended' }),
    ];
    const document = buildMarketplaceDocument(entries, {
      ...BUILD_OPTIONS,
      source: (item) => `github:example/${item.project_id}`,
    });
    expect(document.plugins.map((plugin) => plugin.source)).toEqual(['github:example/ok']);
  });
});

describe('DC-MKT / 0 件と経路未確定の区別', () => {
  it('DC-MKT-04: entry 0 件は plugins: [] かつ source_status: ready', () => {
    const document = buildMarketplaceDocument([], { ...BUILD_OPTIONS, source: () => 'github:example/repo' });
    expect(document.plugins).toEqual([]);
    expect(document.source_status).toBe('ready');
  });

  it('DC-MKT-05: H7 未成立は plugins: [] かつ source_status: pending-h7', () => {
    const document = buildMarketplaceDocument([entry()], { ...BUILD_OPTIONS, source: null });
    expect(document.plugins).toEqual([]);
    expect(document.source_status).toBe('pending-h7');
  });

  it('DC-MKT-06: 0 件と経路未確定が応答として区別できる', () => {
    const empty = buildMarketplaceDocument([], { ...BUILD_OPTIONS, source: () => 'github:example/repo' });
    const pending = buildMarketplaceDocument([entry()], { ...BUILD_OPTIONS, source: null });
    // plugins は同じ [] でも source_status で区別できる
    expect(empty.plugins).toEqual(pending.plugins);
    expect(empty.source_status).not.toBe(pending.source_status);
  });

  it('DC-MKT-09: 未確定時に source 推測値を焼き込まない', () => {
    const document = buildMarketplaceDocument([entry(), entry({ project_id: 'proj-2' })], {
      ...BUILD_OPTIONS,
      source: null,
    });
    const serialized = JSON.stringify(document);
    for (const guess of ['github', 'git-subdir', 'npm']) {
      expect(serialized).not.toContain(guess);
    }
    // 実装側の解決器も H7 確定まで null を返し続ける (fail-closed)
    expect(resolveAdoptedSourceResolver()).toBeNull();
  });

  it('DC-MKT-10: 解決器の有無が Stage 0 gate の結論と一致する', async () => {
    // 「null を返すこと」だけを固定すると、gate が成立へ変わっても実装を促さず、
    // 逆に正しい実装をテストが妨げる。判定の正本 (gate 終結記録の verdict) と連動させる。
    const conclusion = await readFile(
      path.join(REPO_ROOT, 'docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md'),
      'utf8',
    );
    const verdict = /^verdict:\s*(\S+)$/m.exec(conclusion)?.[1];
    expect(verdict, 'gate 終結記録から verdict を読めない').toBeDefined();

    if (verdict === 'H7_NOT_ESTABLISHED') {
      expect(resolveAdoptedSourceResolver(), 'gate 未成立なのに配布経路を解決している').toBeNull();
    } else {
      expect(
        resolveAdoptedSourceResolver(),
        `gate が ${verdict} へ変わっている。採用経路の resolver を実装すること`,
      ).not.toBeNull();
    }
  });
});

describe('DC-MKT / Route Handler の応答', () => {
  beforeEach(() => {
    runtimeHolder.current = createTokenRouteHarness().runtime;
  });

  async function callRoute(): Promise<Response> {
    const headers = new Headers({
      cookie: await sessionCookieFor(adminUser()),
      [TENANT_HEADER]: TENANT_A,
      [WORKSPACE_HEADER]: WORKSPACE_A1,
    });
    return marketplaceRoute(new Request('https://hub.example.com/marketplace.json', { method: 'GET', headers }), {
      params: Promise.resolve({}),
    });
  }

  it('DC-MKT-07: private stale cache を scope/session ごとに分離する', async () => {
    const response = await callRoute();
    expect(response.status).toBe(200);
    // stale-while-revalidate で Hub 停止中の継続性を保ちつつ、共有 cache から別 tenant へ配らせない。
    expect(response.headers.get('cache-control')).toBe('private, max-age=60, stale-while-revalidate=300');
    expect(response.headers.get('vary')).toBe('Cookie, x-harness-tenant-id, x-harness-workspace-id');
  });

  it('DC-MKT-08: pending-h7 は body とヘッダの両方で表明する', async () => {
    const response = await callRoute();
    expect(response.headers.get('x-catalog-source-status')).toBe('pending-h7');

    const body = marketplaceDocumentSchema.parse(await response.json());
    expect(body.source_status).toBe('pending-h7');
    expect(body.plugins).toEqual([]);
  });

  it('テナント申告の無い要求は文書を返さない (deny-by-default)', async () => {
    const headers = new Headers({ cookie: await sessionCookieFor(adminUser()) });
    const response = await marketplaceRoute(
      new Request('https://hub.example.com/marketplace.json', { method: 'GET', headers }),
      { params: Promise.resolve({}) },
    );
    expect(response.ok).toBe(false);
  });
});
