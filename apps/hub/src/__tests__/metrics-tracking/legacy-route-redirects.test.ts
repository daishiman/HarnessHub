/**
 * 旧 route (`/metrics`, `/metrics/usage`) が正本 route へ寄せられていることの受入契約
 * (sys-metrics-tracking-p05 / architecture-decision-record-ui-ops.md §37「S09/S16 contract」)。
 *
 * ADR は「旧 route を第二の画面 owner として残さない」と定める。画面本体が旧 route にも
 * 残っていると、認可と表示の owner が 2 つに割れて片方だけ直す事故が起きる。
 * ここでは「旧 route が描画せず必ず転送すること」と「共有 URL のクエリが落ちないこと」を固定する。
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const permanentRedirect = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ permanentRedirect }));

import MetricsRedirectPage from '../../app/(dashboard)/metrics/page.js';
import MetricsUsageRedirectPage from '../../app/(dashboard)/metrics/usage/page.js';

afterEach(() => {
  permanentRedirect.mockClear();
});

describe('MTR-REDIR: 旧 /metrics/usage の互換転送 (S16)', () => {
  it('MTR-REDIR-001: クエリが無ければ /tracking へそのまま転送する', async () => {
    await MetricsUsageRedirectPage({ searchParams: Promise.resolve({}) });
    expect(permanentRedirect).toHaveBeenCalledWith('/tracking');
  });

  it('MTR-REDIR-002: 期間と scope のクエリを保ったまま転送する (共有 URL が壊れない)', async () => {
    await MetricsUsageRedirectPage({
      searchParams: Promise.resolve({ tenant: 'tenant-a', workspace: 'ws-1', from: '2026-01-01' }),
    });
    expect(permanentRedirect).toHaveBeenCalledWith('/tracking?tenant=tenant-a&workspace=ws-1&from=2026-01-01');
  });

  it('MTR-REDIR-003: 同名の繰り返しクエリを 1 つに潰さない', async () => {
    await MetricsUsageRedirectPage({ searchParams: Promise.resolve({ harness: ['h-1', 'h-2'] }) });
    expect(permanentRedirect).toHaveBeenCalledWith('/tracking?harness=h-1&harness=h-2');
  });

  it('MTR-REDIR-004: 値のないクエリは付け直さない', async () => {
    await MetricsUsageRedirectPage({ searchParams: Promise.resolve({ tenant: undefined }) });
    expect(permanentRedirect).toHaveBeenCalledWith('/tracking');
  });
});

describe('MTR-REDIR: 旧 /metrics の互換転送 (S09)', () => {
  it('MTR-REDIR-011: クエリが無ければ /dashboard へそのまま転送する', async () => {
    await MetricsRedirectPage({ searchParams: Promise.resolve({}) });
    expect(permanentRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('MTR-REDIR-012: 期間と scope のクエリを保ったまま転送する', async () => {
    await MetricsRedirectPage({
      searchParams: Promise.resolve({ tenant: 'tenant-a', workspace: 'ws-1', from: '2026-01-01', to: '2026-01-31' }),
    });
    expect(permanentRedirect).toHaveBeenCalledWith(
      '/dashboard?tenant=tenant-a&workspace=ws-1&from=2026-01-01&to=2026-01-31',
    );
  });

  it('MTR-REDIR-013: 旧 route 自身は描画せず、必ず転送だけを行う', async () => {
    // 戻り値で画面を返してしまうと「旧 route も第二の owner」になる。
    // `permanentRedirect` は例外を投げて描画を止めるのが本来の挙動で、ここでは mock なので
    // undefined が返る。描画結果 (JSX) を返さないことをこの形で固定する。
    const result = await MetricsRedirectPage({ searchParams: Promise.resolve({ tenant: 'tenant-a' }) });
    expect(result).toBeUndefined();
    expect(permanentRedirect).toHaveBeenCalledOnce();
  });
});
