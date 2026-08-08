/**
 * テナント設定の「認証」画面 (provider-admin 専用)。
 *
 * server component 側では **認可判定をしない**。判定は API 側の `withAuthz` +
 * `ACTION_RULES` の 1 箇所に閉じている。ここで role を見て出し分けると認可点が 2 つになり、
 * 片方だけ緩んだときに画面が「見えるのに操作できない」ではなく
 * 「見えないが API は通る」に化ける。画面は API の応答 (403) をそのまま扱う。
 */

import type { Metadata } from 'next';

import { resolveDashboardScope, tenantIdFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { OidcConnectionAdmin } from './oidc-connection-admin.js';

export const metadata: Metadata = {
  title: '認証設定 | Harness Hub',
  description: '顧客所有 Google OAuth client の登録・接続テスト・ローテーションを行います。',
};

interface AuthSettingsPageProps {
  readonly searchParams: Promise<{ readonly tenant?: string }>;
}

export default async function AuthSettingsPage({ searchParams }: AuthSettingsPageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const tenantId = tenantIdFromQuery(query, scope);

  return (
    <section aria-labelledby="auth-settings-heading">
      <h1 id="auth-settings-heading">認証設定 — 顧客所有 Google OAuth</h1>
      <p>
        自社で作成した Google OAuth client を使ってサインインする方式の設定です。 Google Cloud Console 側の手作業と Hub
        側の操作を、下の 1 → 2 → 3 の順で行います。
      </p>
      {tenantId === '' ? (
        <p>
          テナントを特定できませんでした。ログインし直すか、URL に <code>?tenant=</code> を付けてアクセスしてください。
        </p>
      ) : (
        <OidcConnectionAdmin tenantId={tenantId} />
      )}
    </section>
  );
}
