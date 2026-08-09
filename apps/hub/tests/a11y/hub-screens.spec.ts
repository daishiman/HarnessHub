// @vitest-environment jsdom
// HF-QA-A11Y-002: apps/hub 画面結合の axe 違反が 0 件であること (qa-018 / WCAG 2.2 AA)

import axe from 'axe-core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeviceApprovalForm } from '../../src/app/device/device-approval-form';
import RootLayout, { metadata } from '../../src/app/layout';
import { SESSION_COOKIE_NAME } from '../../src/lib/auth/config';
import { LAST_TENANT_COOKIE_NAME, TENANT_ERROR_QUERY_PARAM } from '../../src/lib/routing/signin-entry';

const { getCookie, verifySessionToken } = vi.hoisted(() => ({ getCookie: vi.fn(), verifySessionToken: vi.fn() }));

// HomePage は cookies() を読む server component。request scope の外で描くこの検査では、
// cookie の有無を mock で与えて「どの分岐の DOM を検査しているか」を明示する
vi.mock('next/headers', () => ({ cookies: async () => ({ get: getCookie }) }));
// session を持つ分岐 (workspace 選択) を描くため、署名検証だけ差し替える
vi.mock('../../src/lib/auth/index.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/auth/index.js')>('../../src/lib/auth/index.js');
  return { ...actual, verifySessionToken };
});

const HomePage = (await import('../../src/app/page')).default;

afterEach(() => {
  vi.clearAllMocks();
  getCookie.mockReturnValue(undefined);
});

/** SSR 済みの HTML を jsdom の document へ載せ替える (layout の <html lang> ごと検査対象にする) */
function mountScreen(html: string): void {
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');

  // <title> は Next が metadata から head へ注入する。実配信と同じ状態で検査するためここで再現する
  const title = parsed.createElement('title');
  title.textContent = String(metadata.title);
  parsed.head.appendChild(title);

  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

function formatViolations(violations: readonly axe.Result[]): string {
  return violations.map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`).join('\n');
}

describe('apps/hub 画面結合の a11y', () => {
  it('トップ画面 (layout + page) に axe 違反が無い', async () => {
    // HomePage は async server component (cookies() で session を読む) なので、
    // 関数を渡すのではなく await した ReactNode を渡す (signin/page.tsx のテストと同じ理由)
    const html = renderToStaticMarkup(
      createElement(RootLayout, null, await HomePage({ searchParams: Promise.resolve({}) })),
    );
    mountScreen(html);

    const results = await axe.run(document);
    expect(formatViolations(results.violations)).toBe('');
    expect(results.violations).toHaveLength(0);
  });

  it('検査対象の DOM が実際に描画されている (空ページを緑にしない)', async () => {
    const html = renderToStaticMarkup(
      createElement(RootLayout, null, await HomePage({ searchParams: Promise.resolve({}) })),
    );
    mountScreen(html);

    // 「何も無いページなら違反 0 件」で通ってしまう Goodhart 化を防ぐ
    expect(document.documentElement.getAttribute('lang')).toBe('ja');
    expect(document.title).not.toBe('');
    expect(document.querySelector('main')).not.toBeNull();
    expect(document.querySelectorAll('h1, h2').length).toBeGreaterThan(0);
    expect(document.querySelector('a[href="#main"]')).not.toBeNull();
  });

  it('トップ画面の差し戻し分岐 (エラー Alert + 前回のテナント) にも axe 違反が無い', async () => {
    // cookie 無し・query 空でしか描かないと、この 2 分岐の DOM は一度も検査されない
    getCookie.mockImplementation((name: string) =>
      name === LAST_TENANT_COOKIE_NAME ? { value: 'harness-hub' } : undefined,
    );

    const html = renderToStaticMarkup(
      createElement(
        RootLayout,
        null,
        await HomePage({ searchParams: Promise.resolve({ [TENANT_ERROR_QUERY_PARAM]: '1' }) }),
      ),
    );
    mountScreen(html);

    const results = await axe.run(document);
    expect(formatViolations(results.violations)).toBe('');
    // 検査対象が実際に両分岐を含んでいること (空の DOM を緑にしない)
    expect(document.body.textContent).toContain('テナント ID の形式が正しくありません');
    expect(document.querySelector('a[href="/harness-hub/signin"]')).not.toBeNull();
  });

  it('Workspace 選択画面 (複数所属 + 未選択) にも axe 違反が無い', async () => {
    const original = process.env.AUTH_SESSION_SECRET;
    process.env.AUTH_SESSION_SECRET = 'a11y-test-secret';
    getCookie.mockImplementation((name: string) =>
      name === SESSION_COOKIE_NAME ? { value: 'valid-token' } : undefined,
    );
    verifySessionToken.mockResolvedValue({
      ok: true,
      claims: {
        sub: 'user-1',
        tenant_id: 'tenant-a',
        role: 'member',
        status: 'active',
        workspace_ids: ['ws-1', 'ws-2'],
      },
    });

    try {
      const html = renderToStaticMarkup(
        createElement(RootLayout, null, await HomePage({ searchParams: Promise.resolve({}) })),
      );
      mountScreen(html);

      const results = await axe.run(document);
      expect(formatViolations(results.violations)).toBe('');
      expect(document.querySelectorAll('a[href^="/signin/workspace?"]')).toHaveLength(2);
    } finally {
      if (original === undefined) delete process.env.AUTH_SESSION_SECRET;
      else process.env.AUTH_SESSION_SECRET = original;
    }
  });

  it('Device Flow承認画面にaxe違反が無く、確認コードとWorkspaceをラベル付きで選べる', async () => {
    const screen = createElement(DeviceApprovalForm, {
      tenantId: 'tenant-acme',
      workspaceIds: ['workspace-a', 'workspace-b'],
      initialUserCode: 'ABCD1234',
    });
    const html = renderToStaticMarkup(createElement(RootLayout, null, screen));
    mountScreen(html);

    const results = await axe.run(document);
    expect(formatViolations(results.violations)).toBe('');
    expect(results.violations).toHaveLength(0);
    expect(document.querySelector('input[value="ABCD1234"]')).not.toBeNull();
    expect(document.querySelectorAll('select option')).toHaveLength(2);
    expect(document.querySelector('button[type="submit"]')?.textContent).toContain('承認');
  });
});
