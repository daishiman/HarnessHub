// GET /signin?tenant=<slug> — ランディングのテナント入力を `/{tenant_slug}/signin` へ送り出す。
//
// 画面ではなく route handler にしているのは、遷移先が query ではなく **path** で決まるため。
// HTML の GET フォームは query しか組めないので、受け口を 1 つ置いて 303 で振り分ける。
// client 側で router.push する形にしないのは、サインインの入口が JS の読み込み完了まで
// 効かない状態を作らないため (この画面は未認証の全利用者が最初に触る)。
import { NextResponse } from 'next/server';

import {
  LAST_TENANT_COOKIE_MAX_AGE_SECONDS,
  LAST_TENANT_COOKIE_NAME,
  resolveSigninEntry,
  TENANT_QUERY_PARAM,
} from '../../lib/routing/signin-entry.js';

// 入力に応じて遷移先が変わるため、経路そのものをキャッシュさせない
export const dynamic = 'force-dynamic';

export function GET(request: Request): NextResponse {
  const url = new URL(request.url);
  const resolution = resolveSigninEntry(url.searchParams.get(TENANT_QUERY_PARAM));

  // 303 にするのは、POST 由来で来た場合でも GET で取り直させるため (RFC 9110 §15.4.4)
  const response = NextResponse.redirect(new URL(resolution.location, url.origin), 303);
  response.headers.set('cache-control', 'no-store');

  if (resolution.ok) {
    // 次回 `/` に直リンクを出すためだけの記憶。認可には使わないので改竄されても権限は増えない。
    // それでも httpOnly にするのは、この端末の利用テナントを script から読めるようにする理由が無いため。
    response.cookies.set({
      name: LAST_TENANT_COOKIE_NAME,
      value: resolution.slug,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: LAST_TENANT_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
