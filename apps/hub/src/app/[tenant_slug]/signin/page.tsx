/**
 * `/{tenant_slug}/signin` — テナント先頭のサインイン画面 (ADR AD-5)。
 *
 * URL の先頭でテナントを確定させるのが要点。
 * 「まず email を入れさせて、そこからテナントを推測する」形にすると、
 * email の入力だけでテナントの存在有無を総当たりできてしまう。
 *
 * 表示部品は `@harness-hub/ui` から取る (apps/hub 内で design system を再実装しない)。
 */

import { signinRouteParamsSchema } from '@harness-hub/schemas';
import { Alert } from '@harness-hub/ui';
import { notFound } from 'next/navigation';

import { resolveTenantOidcConfig } from '../../../lib/auth/index.js';
import { authRuntime } from '../../../lib/authz/index.js';
import { tenantOidcCsrfAction, tenantOidcSigninAction } from './tenant-oidc-action.js';
import { TenantOidcSigninForm } from './tenant-oidc-signin-form.js';

interface SigninPageProps {
  readonly params: Promise<{ tenant_slug: string }>;
}

/**
 * エラー状態から抜ける唯一の導線。この画面は URL でテナントが確定しているため、
 * 入力し直す場所はランディング (`/`) のテナント入力しかない。導線が無いと戻るボタン以外に逃げ道が消える。
 * 文言・遷移先はどのエラーでも同一にする — 状態ごとに変えると応答差からテナントの有無が読めてしまう。
 */
const retryFromLanding = <a href="/">別のテナント ID を入力する</a>;

export default async function SigninPage({ params }: SigninPageProps) {
  const parsed = signinRouteParamsSchema.safeParse(await params);
  // slug の形が不正な時点で 404。存在するテナントかどうかは、この先も画面上では区別しない
  if (!parsed.success) notFound();

  const connection = await resolveConnection(parsed.data.tenant_slug);

  if (connection === null) {
    return (
      <section aria-labelledby="signin-heading">
        <h1 id="signin-heading">サインイン</h1>
        <Alert
          tone="danger"
          title="このテナントではサインインできません"
          description="接続設定が見つからないか、無効化されています。管理者にお問い合わせください。"
          action={retryFromLanding}
        />
      </section>
    );
  }

  if (!connection.available) {
    // 認証基盤が未結線であることを画面上でも隠さない (ADR §10)
    return (
      <section aria-labelledby="signin-heading">
        <h1 id="signin-heading">サインイン</h1>
        <Alert
          tone="warning"
          title="認証基盤が未結線です"
          description="OIDC の本番 adapter と Auth.js が未結線のため、サインインを開始できません。"
          action={retryFromLanding}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="signin-heading">
      <h1 id="signin-heading">サインイン</h1>
      <p>{connection.displayName} のアカウントでサインインします。</p>
      <TenantOidcSigninForm
        action={tenantOidcSigninAction(parsed.data.tenant_slug)}
        csrfEndpoint={tenantOidcCsrfAction(parsed.data.tenant_slug)}
        displayName={connection.displayName}
      />
    </section>
  );
}

interface ResolvedConnection {
  readonly available: boolean;
  readonly displayName: string;
}

/**
 * 接続を解決する。runtime 未結線 (repository 未着地) と「テナントが無い」を区別して返す。
 * 両方を同じ画面にすると、未結線の障害が「設定漏れ」に見えて調査が遅れる。
 */
async function resolveConnection(tenantSlug: string): Promise<ResolvedConnection | null> {
  let ports: ReturnType<typeof authRuntime>['ports'];
  try {
    ports = authRuntime().ports;
  } catch {
    return { available: false, displayName: '' };
  }

  const connection = await resolveTenantOidcConfig(ports.oidcConnections, tenantSlug);
  if (connection === null) return null;
  return { available: true, displayName: connection.displayName };
}
