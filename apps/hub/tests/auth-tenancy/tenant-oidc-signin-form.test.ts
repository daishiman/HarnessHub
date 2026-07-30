/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { fetchCsrfToken, TenantOidcSigninForm } from '../../src/app/[tenant_slug]/signin/tenant-oidc-signin-form.js';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('tenant OIDC signin form のCSRF準備', () => {
  it('同一origin cookieを有効にしてtenant別CSRF tokenを取得する', async () => {
    const fetcher = vi.fn(async () => Response.json({ csrfToken: 'csrf-acme' }));

    await expect(fetchCsrfToken('/api/auth/acme/csrf', fetcher)).resolves.toBe('csrf-acme');
    expect(fetcher).toHaveBeenCalledWith('/api/auth/acme/csrf', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
  });

  it('endpoint失敗または空tokenではform送信へ進めない', async () => {
    const failed = vi.fn(async () => new Response(null, { status: 500 }));
    const missing = vi.fn(async () => Response.json({}));

    await expect(fetchCsrfToken('/api/auth/acme/csrf', failed)).rejects.toThrow('CSRF endpoint failed');
    await expect(fetchCsrfToken('/api/auth/acme/csrf', missing)).rejects.toThrow('CSRF token missing');
  });

  it('submit時にtokenをhidden inputへ入れてnative form navigationへ進む', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const fetcher = vi.fn(async () => Response.json({ csrfToken: 'csrf-acme' }));
    vi.stubGlobal('fetch', fetcher);
    const nativeSubmit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => undefined);

    await act(async () => {
      root.render(
        createElement(TenantOidcSigninForm, {
          action: '/api/auth/acme/signin/tenant-oidc',
          csrfEndpoint: '/api/auth/acme/csrf',
          displayName: 'Acme IdP',
        }),
      );
    });

    const form = container.querySelector('form');
    if (form === null) throw new Error('signin form not rendered');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(nativeSubmit).toHaveBeenCalledOnce());
    });

    expect(fetcher).toHaveBeenCalledWith('/api/auth/acme/csrf', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    expect((form.elements.namedItem('csrfToken') as HTMLInputElement).value).toBe('csrf-acme');

    await act(async () => root.unmount());
    nativeSubmit.mockRestore();
    vi.unstubAllGlobals();
    container.remove();
  });
});
