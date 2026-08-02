/**
 * DC-DEG-01..08: Hub 停止時の §6.1 縮退 (qa-011 / qa-019)。acceptance 3 の直接根拠。
 *
 * 分類関数だけでなく、利用者が実際に読む文言 (`httpCatalogPort` が返す message) まで検証する。
 * 分類が正しくても文言が「エラーが発生しました」だと、導入済みツールが使えると伝わらないため。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type CatalogCapabilities,
  catalogCapabilities,
  classifyCatalogFailure,
  isDegraded,
} from '../../lib/catalog/degradation.js';
import { httpCatalogPort } from '../../lib/catalog/http-adapter.js';

const SCOPE = { tenantId: 'tenant-a', workspaceId: 'workspace-a' };

afterEach(() => {
  vi.unstubAllGlobals();
});

/** 指定 status を返す fetch に差し替える。 */
function stubFetchStatus(status: number): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status, headers: { 'content-type': 'application/json' } })),
  );
}

describe('DC-DEG / 失敗分類', () => {
  it('DC-DEG-01: 5xx は degraded', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifyCatalogFailure(status)).toBe('degraded');
    }
  });

  it('DC-DEG-02: 404 (API 未実装) も degraded であり fatal にしない', () => {
    // /api/v1/harnesses* は feat-publish-pipeline 側で未実装 (ADR §0 A2)。
    // 未実装を「壊れている」と表示すると、健全な縮退が障害として報告される
    expect(classifyCatalogFailure(404)).toBe('degraded');
    expect(classifyCatalogFailure(404)).not.toBe('fatal');
  });

  it('DC-DEG-03: 401 は unauthorized', () => {
    expect(classifyCatalogFailure(401)).toBe('unauthorized');
    expect(catalogCapabilities('unauthorized').requiresSignIn).toBe(true);
  });

  it('DC-DEG-04: 403 は forbidden (サインインへ飛ばさない)', () => {
    expect(classifyCatalogFailure(403)).toBe('forbidden');
    // 権限不足は再サインインで解決しない。飛ばすとサインイン↔拒否のループになる
    expect(catalogCapabilities('forbidden').requiresSignIn).toBe(false);
  });

  it('DC-DEG-05: ネットワーク例外は degraded', async () => {
    expect(classifyCatalogFailure(null)).toBe('degraded');
    expect(classifyCatalogFailure(undefined)).toBe('degraded');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const result = await httpCatalogPort.listEntries(SCOPE, {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('degraded');
    expect(result.failure.status).toBeNull();
  });
});

describe('DC-DEG / 縮退時に許す操作', () => {
  it('DC-DEG-06: degraded では閲覧・descriptor コピーは可、公開/追加/更新は不可', () => {
    const degraded = catalogCapabilities('degraded');
    expect(degraded).toEqual<CatalogCapabilities>({
      canBrowse: true,
      canCopyInstallDescriptor: true,
      canMutate: false,
      requiresSignIn: false,
    });
    expect(isDegraded('degraded')).toBe(true);

    // 縮退以外は「見えていたものが見え続ける」保証をしない
    for (const kind of ['unauthorized', 'forbidden', 'fatal'] as const) {
      expect(catalogCapabilities(kind).canBrowse).toBe(false);
      expect(catalogCapabilities(kind).canMutate).toBe(false);
      expect(isDegraded(kind)).toBe(false);
    }
  });

  it('DC-DEG-07: 縮退バナーは「導入済みのツールはそのまま使えます」を含む', async () => {
    stubFetchStatus(503);
    const result = await httpCatalogPort.listEntries(SCOPE, {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.kind).toBe('degraded');
    expect(result.failure.message).toContain('導入済みのツールはそのまま使えます');
  });
});

describe('DC-DEG / 分類の網羅性', () => {
  it('DC-DEG-08: 分類は 4 値のみで、未知 status も必ずいずれかへ落ちる', () => {
    const allowed = new Set(['degraded', 'unauthorized', 'forbidden', 'fatal']);
    const observed = new Set<string>();

    // 実在しない status を含めて全域を走査する。未知値が undefined へ落ちると
    // UI 側の switch が実行時に穴を開ける
    for (let status = 100; status <= 599; status += 1) {
      const kind = classifyCatalogFailure(status);
      expect(allowed.has(kind)).toBe(true);
      observed.add(kind);
    }
    for (const status of [0, -1, 999, Number.NaN]) {
      expect(allowed.has(classifyCatalogFailure(status))).toBe(true);
    }

    // 4 値すべてが実際に到達可能であること (定義だけあって使われない値を作らない)
    expect(observed).toEqual(new Set(['degraded', 'unauthorized', 'forbidden', 'fatal']));
  });
});
