'use client';

import { Alert, Button } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';

import { DEFAULT_POST_SIGNIN_LANDING, resolvePostSigninLanding } from '../../../lib/routing/post-signin-landing.js';

interface TenantOidcSigninFormProps {
  readonly action: string;
  readonly csrfEndpoint: string;
  readonly displayName: string;
}

interface CsrfResponse {
  readonly csrfToken?: unknown;
}

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Auth.js の CSRF endpoint から一時 token を取る。
 *
 * `credentials: same-origin` が重要。応答の CSRF cookie と form の token が同じでなければ、
 * Auth.js は `MissingCSRF` としてサインインを開始しない。
 */
export async function fetchCsrfToken(csrfEndpoint: string, fetcher: Fetcher = fetch): Promise<string> {
  const response = await fetcher(csrfEndpoint, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('CSRF endpoint failed');

  const body = (await response.json()) as CsrfResponse;
  if (typeof body.csrfToken !== 'string' || body.csrfToken.length === 0) {
    throw new Error('CSRF token missing');
  }
  return body.csrfToken;
}

/**
 * CSRF cookie/token を揃えてから、通常の form navigation で Auth.js へ送る。
 *
 * Google への 302 を `fetch()` で追うと CORS の対象になって遷移できないため、
 * token 取得だけを fetch に限定し、外部 IdP への移動はブラウザ標準送信へ任せる。
 */
export function TenantOidcSigninForm({ action, csrfEndpoint, displayName }: TenantOidcSigninFormProps): ReactNode {
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // 遷移元 path (`?returnTo=`) -> 既定着地の順で解決する。同一 origin の相対 path のみ許可し、
  // 絶対 URL・スキーム付き・protocol-relative は既定着地へ落とす (open redirect 防止)。
  // SSR と初回 client render を一致させるため既定着地で初期化し、mount 後に client 側で確定する
  // (window.location はブラウザにしか無いため、SSR 中に読むと hydration mismatch になる)。
  const [callbackUrl, setCallbackUrl] = useState(DEFAULT_POST_SIGNIN_LANDING);
  useEffect(() => {
    const returnTo = new URLSearchParams(window.location.search).get('returnTo');
    setCallbackUrl(resolvePostSigninLanding(returnTo));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting.current) return;

    submitting.current = true;
    setLoading(true);
    setFailed(false);

    const form = event.currentTarget;
    try {
      const csrfToken = await fetchCsrfToken(csrfEndpoint);
      const csrfInput = form.elements.namedItem('csrfToken');
      if (!(csrfInput instanceof HTMLInputElement)) throw new Error('CSRF input missing');
      csrfInput.value = csrfToken;
      // submit event を再発火させず、Auth.js の外部 redirect を通常 navigation として辿る。
      HTMLFormElement.prototype.submit.call(form);
    } catch {
      submitting.current = false;
      setLoading(false);
      setFailed(true);
    }
  }

  return (
    <>
      <form
        method="post"
        action={action}
        data-csrf-endpoint={csrfEndpoint}
        aria-busy={loading || undefined}
        onSubmit={submit}
      >
        <input type="hidden" name="csrfToken" defaultValue="" />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Button type="submit" variant="primary" loading={loading}>
          {loading ? 'サインインを準備中…' : `${displayName} でサインイン`}
        </Button>
      </form>
      {failed ? (
        <Alert
          tone="danger"
          live="assertive"
          title="サインインを開始できませんでした"
          description="通信状態を確認して、もう一度お試しください。"
        />
      ) : null}
    </>
  );
}
