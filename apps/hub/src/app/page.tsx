// P0 シェルのトップ画面。dashboard 等の低優先 UI は作らず、基盤が起動していることだけを示す
// 表示部品は必ず @harness-hub/ui から import する (apps/hub 内で design system を再実装しない)
import { Alert } from '@harness-hub/ui';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authRuntime } from '../lib/authz/index.js';
import { DEFAULT_LANDING_PATH } from '../lib/routing/post-signin-landing.js';
import { resolveDeviceApprovalSession } from './device/device-approval-session.js';

export default async function HomePage() {
  // `/` は非業務のステータス画面 (public path)。認証済み session はここに留めず既定業務画面へ送る。
  // spec: harness-hub-post-signin-workspace-scope-addendum §C (「/ を開くと既定着地へ redirect」)
  const session = await resolveRootSession();
  if (session.status === 'authenticated') {
    redirect(DEFAULT_LANDING_PATH);
  }

  return (
    <section aria-labelledby="status-heading">
      <h2 id="status-heading">稼働状況</h2>
      <Alert
        tone="success"
        title="Hub の実行基盤が起動しています"
        description="依存先を含む死活状態は /health で確認できます。"
        action={<a href="/health">/health を開く</a>}
      />
    </section>
  );
}

/** device 承認画面と同じ session 解決を再利用する。認証設定が未結線でも `/` 自体は表示を続ける。 */
async function resolveRootSession() {
  try {
    const runtime = authRuntime();
    const requestHeaders = await headers();
    return await resolveDeviceApprovalSession(requestHeaders.get('cookie'), {
      sessionSecret: runtime.authz.sessionSecret,
      nowSeconds: runtime.ports.clock.nowSeconds(),
      isRevoked: (tenantId, userId, issuedAtSeconds) =>
        runtime.authz.revocation.isRevoked(tenantId, userId, issuedAtSeconds),
    });
  } catch {
    return { status: 'unavailable' } as const;
  }
}
