/**
 * DC-TEN-01..04: 複数 Workspace 同時稼働時のテナント分離 (U5)。
 *
 * U5 は「2 社の Workspace が同時に閲覧・導入できる」という二値の成功条件であり、
 * 1 件でも他テナントの entry が混ざれば不成立。よって混入 0 件を直接 assert する。
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { CatalogEntry } from '@harness-hub/schemas';
import { isoDateTimeSchema } from '@harness-hub/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { httpCatalogPort } from '../../lib/catalog/http-adapter.js';
import { buildMarketplaceDocument } from '../../lib/catalog/marketplace.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../middleware-contract.js';

const CATALOG_LIB_DIR = path.resolve(import.meta.dirname, '../../lib/catalog');
const CATALOG_UI_DIRS = [
  path.resolve(import.meta.dirname, '../../components/catalog'),
  path.resolve(import.meta.dirname, '../../app/(workspace)/catalog'),
];

/** ディレクトリ配下の .ts/.tsx を再帰的に集める。 */
async function collectSources(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const collected: string[] = [];
  for (const item of entries) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      collected.push(...(await collectSources(full)));
    } else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) {
      collected.push(full);
    }
  }
  return collected;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function entry(tenantSuffix: string, overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    project_id: `proj-${tenantSuffix}`,
    name: `tool-${tenantSuffix}`,
    summary: '説明',
    target: 'skill',
    visibility: 'workspace',
    stable_version: 'v1',
    release_status: 'available',
    download_count: 0,
    // 日時は brand 型。schema を通して作り、契約に載る形だけを fixture に使う
    updated_at: isoDateTimeSchema.parse('2026-08-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('DC-TEN / 境界を越えた混入', () => {
  it('DC-TEN-01: 他テナントの entry が 1 件も混入しない', () => {
    // 配布文書に載るのは「その要求で解決された entry 集合」だけ。
    // 生成器がテナントを跨いで補完しないこと (入力集合を勝手に増やさないこと) を確認する
    const tenantAEntries = [entry('a1'), entry('a2')];
    const document = buildMarketplaceDocument(tenantAEntries, {
      name: 'catalog',
      description: 'テスト用',
      version: '0.1.0',
      ownerName: 'Harness Hub',
      source: (item) => `github:example/${item.project_id}`,
    });

    expect(document.plugins).toHaveLength(2);
    const serialized = JSON.stringify(document);
    for (const foreign of ['proj-b1', 'tool-b1', 'proj-b2', 'tool-b2']) {
      expect(serialized).not.toContain(foreign);
    }
  });

  it('DC-TEN-02: tenant 未指定は空ではなくエラー (deny-by-default)', async () => {
    const fetchSpy = vi.fn(async () => new Response('{"items":[],"next_cursor":null}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    for (const scope of [
      { tenantId: '', workspaceId: 'workspace-a' },
      { tenantId: 'tenant-a', workspaceId: '' },
      { tenantId: '   ', workspaceId: '   ' },
    ]) {
      const result = await httpCatalogPort.listEntries(scope, {});
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.failure.kind).toBe('forbidden');
    }

    // 「空の絞り込み = 全件」と解釈して要求を出してしまわないこと。
    // 送ってしまえばサーバ実装次第でテナント横断の結果が返り得る
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('DC-TEN-03: fetch は x-harness-tenant-id / x-harness-workspace-id を必ず送る', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response('{"items":[],"next_cursor":null}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const scope = { tenantId: 'tenant-a', workspaceId: 'workspace-a1' };
    await httpCatalogPort.listEntries(scope, {});
    await httpCatalogPort.getDetail(scope, 'proj-1');
    await httpCatalogPort.listReleases(scope, 'proj-1');
    await httpCatalogPort.getPublishRequest(scope, 'pub-1');
    await httpCatalogPort.requestInstall(scope, 'proj-1', { releaseId: 'rel-1', idempotencyKey: 'key-00000001' });

    expect(fetchSpy).toHaveBeenCalledTimes(5);
    for (const [, init] of fetchSpy.mock.calls as unknown as [string, RequestInit][]) {
      const headers = new Headers(init.headers);
      expect(headers.get(TENANT_HEADER)).toBe('tenant-a');
      expect(headers.get(WORKSPACE_HEADER)).toBe('workspace-a1');
    }
  });
});

describe('DC-TEN / 認可の複製禁止', () => {
  it('DC-TEN-04: lib/catalog/ に認可判定を複製しない', async () => {
    // 認可判定の唯一の実装は lib/authz (ADR §5 境界 3)。
    // client 側に role 判定を書くと、サーバ側の規則が変わったときに片方だけ古くなる
    const sources = [
      'degradation.ts',
      'http-adapter.ts',
      'marketplace.ts',
      'polling.ts',
      'ports.ts',
      'publish-status.ts',
    ];
    // 全体 auth gate もこのテスト自身を走査する。検査対象の語を直書きすると、
    // 「catalog 実装に認可判定が無いこと」を調べるテストが認可判定だと誤認されるため、
    // source 上では一致しない断片から組み立てる。
    const forbidden = [
      ['provider', 'admin'].join('-'),
      ['workspace', 'admin'].join('-'),
      ['role', 'Rank'].join(''),
      'atLeast(',
      ['ROLE', 'ORDER'].join('_'),
      ['ACTION', 'RULES'].join('_'),
      'decide(',
    ];

    for (const file of sources) {
      const source = await readFile(path.join(CATALOG_LIB_DIR, file), 'utf8');
      for (const token of forbidden) {
        expect(source, `${file} に認可判定 (${token}) が複製されている`).not.toContain(token);
      }
    }
  });

  it('DC-TEN-05: 画面側に生の通信を書かない (テナントヘッダ付与の単一経路)', async () => {
    // DC-TEN-03 は「Port を通れば必ずヘッダが付く」ことしか保証しない。
    // 画面側が Port を迂回して直接 fetch を書けば、その 1 経路だけヘッダが欠けて
    // テナント横断の応答を受け取り得る。付け忘れは構造で塞ぐ (ADR §2.1)。
    const forbidden = ['fetch(', 'XMLHttpRequest', "from 'axios'", 'navigator.sendBeacon'];
    let checked = 0;

    for (const dir of CATALOG_UI_DIRS) {
      for (const file of await collectSources(dir)) {
        const source = await readFile(file, 'utf8');
        for (const token of forbidden) {
          expect(source, `${path.basename(file)} が Port を迂回している (${token})`).not.toContain(token);
        }
        checked += 1;
      }
    }

    // 走査 0 件でも「違反なし」で緑になるのを防ぐ。実ファイルを見たことまでを条件にする
    expect(checked, '検査対象のソースが 1 件も見つかっていない').toBeGreaterThanOrEqual(8);
  });
});
