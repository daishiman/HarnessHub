// @vitest-environment jsdom
/**
 * DC-TEN-06..10: 取得済み表示と認可・scope cache の境界。
 *
 * Hub 障害時は同じ tenant/workspace の直近データを残してよい。一方、401/403/契約不正時や
 * scope 切替後に以前のデータを残すと、認可済みだった過去の表示が現在の利用者へ漏れる。
 */
import type { CatalogDetail, CatalogEntry, ReleaseView } from '@harness-hub/schemas';
import { isoDateTimeSchema } from '@harness-hub/schemas';
import { UiProvider } from '@harness-hub/ui';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogDetail as CatalogDetailScreen } from '../../components/catalog/CatalogDetail.js';
import { CatalogList } from '../../components/catalog/CatalogList.js';
import { CatalogReleaseHistory } from '../../components/catalog/CatalogReleaseHistory.js';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';

const AT = isoDateTimeSchema.parse('2026-08-01T00:00:00.000Z');
const FAILURE_DISCRIMINANT = 'kind' as const;
const SCOPE_A: CatalogScope = { tenantId: 'tenant-a', workspaceId: 'workspace-a' };
const SCOPE_B: CatalogScope = { tenantId: 'tenant-b', workspaceId: 'workspace-b' };

const ENTRY: CatalogEntry = {
  project_id: 'project-secret-a',
  name: 'テナント A 専用ツール',
  summary: 'テナント A だけが閲覧できる説明',
  target: 'skill',
  visibility: 'workspace',
  stable_version: 'v1',
  release_status: 'available',
  download_count: 1,
  updated_at: AT,
};

const DETAIL: CatalogDetail = {
  ...ENTRY,
  stable_release_id: 'release-a',
  launch_url: null,
};

const RELEASE: ReleaseView = {
  id: 'release-a',
  project_id: ENTRY.project_id,
  channel_id: 'channel-a',
  version: 'v1',
  package_hash: 'sha256-secret-a',
  status: 'available',
  created_by: 'user-a',
  created_at: AT,
};

const FORBIDDEN: { readonly ok: false; readonly failure: CatalogFailure } = {
  ok: false,
  failure: {
    [FAILURE_DISCRIMINANT]: 'forbidden',
    status: 403,
    retryAfterSeconds: null,
    message: 'この操作を行う権限がありません。',
  },
};

const DEGRADED: { readonly ok: false; readonly failure: CatalogFailure } = {
  ok: false,
  failure: {
    [FAILURE_DISCRIMINANT]: 'degraded',
    status: 503,
    retryAfterSeconds: null,
    message: 'Hub が一時的に応答していません。導入済みのツールはそのまま使えます。',
  },
};

async function unexpected(): Promise<never> {
  throw new Error('このテストでは呼ばれない CatalogPort method です');
}

function portWith(overrides: Partial<CatalogPort>): CatalogPort {
  return {
    listEntries: unexpected,
    getDetail: unexpected,
    listReleases: unexpected,
    getPublishRequest: unexpected,
    requestInstall: unexpected,
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

async function render(element: ReactElement): Promise<void> {
  await act(async () => {
    root.render(createElement(UiProvider, null, element));
  });
  await flush();
}

async function flush(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function submitListFilter(): Promise<void> {
  const form = container.querySelector('form');
  if (form === null) throw new Error('絞り込み form がありません');
  await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await flush();
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.replaceChildren(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('DC-TEN / 認可失敗後の取得済み表示', () => {
  it('DC-TEN-06: 一覧は 403 後に以前の行を描画しない', async () => {
    const listEntries = vi.fn().mockResolvedValueOnce({ ok: true, value: { items: [ENTRY], next_cursor: null } });
    listEntries.mockResolvedValueOnce(FORBIDDEN);
    const port = portWith({ listEntries });

    await render(<CatalogList scope={SCOPE_A} port={port} />);
    expect(container.textContent).toContain(ENTRY.name);

    await submitListFilter();
    expect(container.textContent).toContain(FORBIDDEN.failure.message);
    expect(container.textContent).not.toContain(ENTRY.name);
    expect(container.querySelector('table')).toBeNull();
  });

  it('DC-TEN-07: 詳細は 403 後に initialDetail を描画しない', async () => {
    const port = portWith({ getDetail: vi.fn().mockResolvedValue(FORBIDDEN) });
    await render(
      <CatalogDetailScreen scope={SCOPE_A} projectId={ENTRY.project_id} initialDetail={DETAIL} port={port} />,
    );

    expect(container.textContent).toContain(FORBIDDEN.failure.message);
    expect(container.textContent).not.toContain(DETAIL.name);
    expect(container.textContent).not.toContain(DETAIL.summary);
  });

  it('DC-TEN-08: 履歴は 403 後に以前の行を描画しない', async () => {
    const listReleases = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: { items: [RELEASE], next_cursor: null } })
      .mockResolvedValueOnce(FORBIDDEN);
    const port = portWith({ listReleases });

    await render(<CatalogReleaseHistory scope={SCOPE_A} projectId="project-a" port={port} />);
    expect(container.textContent).toContain(RELEASE.version);

    await render(<CatalogReleaseHistory scope={SCOPE_A} projectId="project-b" port={port} />);
    expect(container.textContent).toContain(FORBIDDEN.failure.message);
    expect(container.querySelector('table')).toBeNull();
  });
});

describe('DC-TEN / 縮退 cache の scope', () => {
  it('DC-TEN-09: 同じ scope の 503 では取得済み一覧を維持する', async () => {
    const listEntries = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: { items: [ENTRY], next_cursor: null } })
      .mockResolvedValueOnce(DEGRADED);
    const port = portWith({ listEntries });

    await render(<CatalogList scope={SCOPE_A} port={port} />);
    await submitListFilter();

    expect(container.textContent).toContain(DEGRADED.failure.message);
    expect(container.textContent).toContain(ENTRY.name);
  });

  it('DC-TEN-10: scope 切替後の 503 では以前の tenant の一覧を再利用しない', async () => {
    const listEntries = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: { items: [ENTRY], next_cursor: null } })
      .mockResolvedValueOnce(DEGRADED);
    const port = portWith({ listEntries });

    await render(<CatalogList scope={SCOPE_A} port={port} />);
    expect(container.textContent).toContain(ENTRY.name);

    await render(<CatalogList scope={SCOPE_B} port={port} />);
    expect(container.textContent).toContain(DEGRADED.failure.message);
    expect(container.textContent).not.toContain(ENTRY.name);
  });
});

describe('DC-LIST / 絞り込み要求数', () => {
  it('DC-LIST-01: 入力中は再取得せず submit で一度だけ取得する', async () => {
    const listEntries = vi.fn().mockResolvedValue({ ok: true, value: { items: [ENTRY], next_cursor: null } });
    const port = portWith({ listEntries });
    await render(<CatalogList scope={SCOPE_A} port={port} />);
    expect(listEntries).toHaveBeenCalledTimes(1);

    const input = container.querySelector<HTMLInputElement>('input');
    if (input === null) throw new Error('キーワード input がありません');
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (valueSetter === undefined) throw new Error('input value setter がありません');
    await act(async () => {
      valueSetter.call(input, '請求書');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(listEntries).toHaveBeenCalledTimes(1);

    await submitListFilter();
    expect(listEntries).toHaveBeenCalledTimes(2);
    expect(listEntries.mock.calls[1]?.[1]).toEqual({ q: '請求書' });
  });
});
