/**
 * DC-TBT-01..04: 応答検証器 (zod + 契約 schema) をブラウザへ読み込む条件の固定 (HarnessHub-aqi)。
 *
 * `/catalog` の TBT 予算 200ms に対し、検証器チャンクの評価は実測で 82ms の long task だった
 * (2026-08-08 / Lighthouse mobile・CPU 4x・benchmarkIndex 2830)。消費先 `/api/v1/harnesses*` は
 * 未実装 (ports.ts / ADR §0 A2) のため応答は 404 で、**検証すべき本文が無いのに毎回評価していた**。
 *
 * 「本文があるときだけ読む」という条件は、性能都合で入れた分だけ元へ戻りやすい。
 * 逆に戻しすぎて検証を落とすと契約違反の応答をそのまま描くことになる (§2.1)。
 * そのため「失敗応答では読まない」と「成功応答では必ず読んで弾く」を対で固定する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** 検証器モジュールが実際に評価された回数。動的 import が走った瞬間にだけ増える。 */
const validatorLoads = vi.hoisted(() => ({ count: 0 }));

vi.mock('../../lib/catalog/response-schemas.js', async (importOriginal) => {
  validatorLoads.count += 1;
  return await importOriginal<typeof import('../../lib/catalog/response-schemas.js')>();
});

import { httpCatalogPort } from '../../lib/catalog/http-adapter.js';

const SCOPE = { tenantId: 'tenant-a', workspaceId: 'workspace-a' } as const;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  validatorLoads.count = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DC-TBT / 検証器を読み込む条件', () => {
  it('DC-TBT-01: 404 (消費先未実装) では検証器チャンクを読み込まない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<!DOCTYPE html>', { status: 404 })),
    );

    const result = await httpCatalogPort.listEntries(SCOPE, {});

    expect(result.ok).toBe(false);
    expect(validatorLoads.count).toBe(0);
  });

  it('DC-TBT-02: 5xx / 401 / 403 でも検証器チャンクを読み込まない', async () => {
    for (const status of [401, 403, 429, 500, 503]) {
      validatorLoads.count = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('', { status })),
      );

      const result = await httpCatalogPort.listEntries(SCOPE, {});

      expect(result.ok, `status=${status}`).toBe(false);
      expect(validatorLoads.count, `status=${status} で検証器を読み込んでいる`).toBe(0);
    }
  });

  it('DC-TBT-03: scope が空なら fetch も検証器読み込みも起こさない', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await httpCatalogPort.listEntries({ tenantId: '', workspaceId: 'workspace-a' }, {});

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(validatorLoads.count).toBe(0);
  });

  it('DC-TBT-04: 200 では検証器を読み込み、契約違反の本文を通さない', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(200, { items: [{ project_id: 'p1' }] })),
    );

    const result = await httpCatalogPort.listEntries(SCOPE, {});

    // 読み込みが起きていること自体が「検証を落としていない」ことの証拠になる
    expect(validatorLoads.count).toBe(1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.kind).toBe('fatal');
  });
});
