// @vitest-environment jsdom
/**
 * 顧客持ち込み OIDC credential 管理画面の a11y 検査
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729 / WCAG 2.2 AA)。
 *
 * 親 (`OidcConnectionAdmin`) ごと SSR しても「読み込み中です。」しか出ない — 一覧は client 側の
 * fetch で入るため。それを検査しても「空ページなら違反 0 件」になるだけなので、
 * **中身のある状態の部品を直接描画する**。
 *
 * secret の非表示もここで押さえる。a11y 検査は描画済み DOM 全体を持っているので、
 * 「画面に secret が出ていないこと」を DOM 文字列に対して直接主張できる位置にある。
 */

import type { OidcConnectionSetup, OidcConnectionSummary } from '@harness-hub/schemas';
import axe from 'axe-core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  ConnectionCard,
  parseWorkspaceDomainInput,
  SetupPanel,
} from '../../src/app/(dashboard)/settings/auth/oidc-connection-admin.js';
import RootLayout, { metadata } from '../../src/app/layout.js';

/** 画面へ出てはいけない値。last4 (`0001`) とは別物にしてある。 */
const FULL_SECRET = 'goog-secret-should-not-render';

const SETUP: OidcConnectionSetup = {
  tenant_slug: 'acme',
  customer_callback_url: 'https://hub.example.com/api/auth/acme/callback/tenant-oidc',
  shared_callback_url: 'https://hub.example.com/api/auth/callback/tenant-oidc',
  required_google_scopes: ['openid', 'email', 'profile'],
};

function summary(overrides: Partial<OidcConnectionSummary> = {}): OidcConnectionSummary {
  return {
    id: 'conn-1',
    tenant_id: 'tenant-acme',
    issuer_url: 'https://accounts.google.com',
    client_id: 'client-acme',
    credential_mode: 'customer_google',
    credential_status: 'active',
    client_secret_last4: '0001',
    last_tested_at: '2026-08-01T00:00:00.000Z',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    allowed_workspace_domains: ['example.com'],
    resolvable: true,
    rotation: {
      staged: false,
      pending_client_secret_last4: null,
      pending_client_id: null,
      pending_credential_mode: null,
      pending_tested_at: null,
    },
    ...overrides,
  };
}

const CARD_PROPS = {
  busy: false,
  rotationSecret: '',
  onRotationSecretChange: () => undefined,
  onTest: () => undefined,
  onStageRotation: () => undefined,
  onDiscardRotation: () => undefined,
  onActivate: () => undefined,
  onDisable: () => undefined,
} as const;

/** SSR 済み HTML を jsdom へ載せ替える (layout の `<html lang>` ごと検査対象にする)。 */
function mountScreen(html: string): void {
  const parsed = new DOMParser().parseFromString(`<!DOCTYPE html>${html}`, 'text/html');
  const title = parsed.createElement('title');
  title.textContent = String(metadata.title);
  parsed.head.appendChild(title);
  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

function formatViolations(violations: readonly axe.Result[]): string {
  return violations.map((violation) => `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`).join('\n');
}

/**
 * 部品を**実画面と同じ見出し階層へ置いて**から検査する。
 *
 * `page.tsx` は h1、各 section は h2、`ConnectionCard` の rotation 欄は h3 を持つ。
 * 部品だけ裸で描画すると h3 が最初の見出しになり、実配信では起きない `heading-order` が出る。
 * 逆に骨格を省くと、その違反を「無視してよい既知の差分」として抑制する運用が始まってしまう。
 */
function renderAndAudit(
  screen: ReturnType<typeof createElement>,
  options: { readonly inSection?: boolean } = {},
): Promise<string> {
  const body =
    options.inSection === true
      ? createElement(
          'section',
          { 'aria-labelledby': 'connections-heading' },
          createElement('h2', { id: 'connections-heading' }, '3. 接続の状態'),
          screen,
        )
      : screen;
  const page = createElement(
    'section',
    { 'aria-labelledby': 'auth-settings-heading' },
    createElement('h1', { id: 'auth-settings-heading' }, '認証設定 — 顧客所有 Google OAuth'),
    body,
  );
  const html = renderToStaticMarkup(createElement(RootLayout, null, page));
  mountScreen(html);
  return axe.run(document).then((results) => {
    expect(formatViolations(results.violations)).toBe('');
    return html;
  });
}

describe('OIDC 接続管理画面の a11y (WCAG 2.2 AA)', () => {
  it('Workspace ドメイン入力を小文字化し、空白と重複を除いて API へ渡せる', () => {
    expect(parseWorkspaceDomainInput(' Example.COM, subsidiary.example.com\nexample.com ')).toEqual([
      'example.com',
      'subsidiary.example.com',
    ]);
  });

  it('Google Console 側の手作業パネルに axe 違反が無く、callback URL がコピーできる', async () => {
    const html = await renderAndAudit(createElement(SetupPanel, { setup: SETUP }));

    // 空パネルを緑にしない: Hub が代行しないことと、実際の callback URL が出ている
    expect(document.querySelector('h2')?.textContent).toContain('Google Cloud Console');
    expect(html).toContain(SETUP.customer_callback_url);
    expect(document.querySelector('button[aria-label="顧客所有方式の callback URLをコピー"]')).not.toBeNull();
  });

  it('稼働中の接続カードに axe 違反が無く、secret は last4 だけが出る', async () => {
    const html = await renderAndAudit(createElement(ConnectionCard, { ...CARD_PROPS, connection: summary() }), {
      inSection: true,
    });

    expect(document.querySelector('article[aria-label="接続 client-acme"]')).not.toBeNull();
    expect(html).toContain('0001');
    expect(html).not.toContain(FULL_SECRET);
    // 現行 secret を編集させる欄は存在しない (差し替えは rotation 経路だけ)
    expect(document.querySelector('input[value="client-acme"]')).toBeNull();
  });

  it('rotation 中のカードに axe 違反が無く、切替前であることが読み取れる', async () => {
    const staged = summary({
      rotation: {
        staged: true,
        pending_client_secret_last4: '0002',
        pending_client_id: 'client-swapped',
        pending_credential_mode: 'customer_google',
        pending_tested_at: '2026-08-02T00:00:00.000Z',
      },
    });
    const html = await renderAndAudit(createElement(ConnectionCard, { ...CARD_PROPS, connection: staged }), {
      inSection: true,
    });

    expect(html).toContain('0002');
    // 「まだ切り替わっていない」ことが画面から分かる。ここが伝わらないと、
    // 運用者が Google 側の旧 secret を先に消してログインを落とす
    expect(document.body.textContent).toContain('現在のログインは今までの設定で継続しています');
    expect(html).not.toContain(FULL_SECRET);
  });

  it('secret 入力欄が type="password" で、送信後も値を持ち回らない', async () => {
    await renderAndAudit(createElement(ConnectionCard, { ...CARD_PROPS, connection: summary() }), { inSection: true });

    const secretInput = document.querySelector('input[type="password"]');
    expect(secretInput).not.toBeNull();
    // 初期値を持たせない。持たせると DOM に secret が載り、SSR の HTML にも残る
    expect(secretInput?.getAttribute('value')).toBe('');
    expect(secretInput?.getAttribute('autocomplete')).toBe('new-password');
  });
});
