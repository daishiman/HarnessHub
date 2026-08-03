// P0 シェルのトップ画面。dashboard 等の低優先 UI は作らず、基盤が起動していることだけを示す
// 表示部品は必ず @harness-hub/ui から import する (apps/hub 内で design system を再実装しない)
import { Alert } from '@harness-hub/ui';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE_NAME, systemAuthClock, verifySessionToken } from '../lib/auth/index.js';
import { DEFAULT_POST_SIGNIN_LANDING } from '../lib/routing/post-signin-landing.js';

/**
 * 未認証時は稼働確認表示を維持し、認証済み session がある場合は既定着地へ redirect する。
 * ここでの検証は署名と claims の形・期限だけを見る (edge の authorize() と同じ制約)。
 * 緊急失効の判定は route 側が担い、ここでは行わない。
 */
export default async function HomePage() {
  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (sessionSecret !== undefined && sessionSecret.length > 0) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
    if (token !== null) {
      const verification = await verifySessionToken(token, sessionSecret, systemAuthClock.nowSeconds());
      if (verification.ok) {
        redirect(DEFAULT_POST_SIGNIN_LANDING);
      }
    }
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
