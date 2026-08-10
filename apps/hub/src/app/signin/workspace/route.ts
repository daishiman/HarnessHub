// GET /signin/workspace?workspace=<id> — ランディングで選ばれた workspace を session へ束縛する。
//
// 2 件以上の workspace に所属する利用者は、`hh_active_workspace` cookie が無いと
// active workspace が確定せず業務画面が 403 (missing_tenant_scope) になる。その cookie を書く
// 唯一の経路がここ。画面ではなく route handler なのは `/signin` と同じ理由 (JS 無しの
// GET リンク/フォームから遷移でき、サインイン導線が client JS の読み込みに依存しない)。
//
// 公開 path (`/signin` 前方一致) に置くが、認可を緩めてはいない。この route 自身が session cookie の
// 署名・期限・status を検証し、claims の所属一覧に無い workspace ID は一切 cookie にしない (fail-closed)。
import { NextResponse } from 'next/server';

import {
  AUTH_NUMERIC_CONTRACT,
  SESSION_COOKIE_NAME,
  systemAuthClock,
  verifySessionToken,
} from '../../../lib/auth/index.js';
import { ACTIVE_WORKSPACE_COOKIE_NAME, readCookie } from '../../../lib/auth/session.js';
import {
  resolveWorkspaceEntry,
  WORKSPACE_QUERY_PARAM,
  WORKSPACE_RETURN_TO_QUERY_PARAM,
  type WorkspaceEntryResolution,
} from '../../../lib/routing/workspace-entry.js';

// 選択値と session に応じて遷移先も cookie も変わるため、経路そのものをキャッシュさせない
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const resolution = await resolveRequest(
    request,
    url.searchParams.get(WORKSPACE_QUERY_PARAM),
    url.searchParams.get(WORKSPACE_RETURN_TO_QUERY_PARAM),
  );

  if (!resolution.ok) {
    const response = NextResponse.redirect(new URL(resolution.location, url.origin), 303);
    response.headers.set('cache-control', 'no-store');
    return response;
  }

  // redirect だけを返すと、ブラウザは最終画面が届くまで旧 scope の document を表示し続け得る。
  // 先に scope 情報を一切持たない同一 origin の文書を commit させ、meta refresh で最終画面へ進める。
  // これにより client JS 0 のまま「旧 scope を消す」→「新 scope を読む」の順序が HTTP 境界で固定される。
  const response = new NextResponse(renderWorkspaceSwitchIntermediate(resolution.location), {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
    },
  });

  // 認可上の正当性は毎要求 `resolveActiveWorkspaceId` が所属一覧に対して再検証するため署名は不要。
  // それでも httpOnly にするのは、この値を script から読み書きさせる理由が無いため。
  response.cookies.set({
    name: ACTIVE_WORKSPACE_COOKIE_NAME,
    value: resolution.workspaceId,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_NUMERIC_CONTRACT.sessionMaxAgeSeconds,
  });

  return response;
}

/**
 * session を検証したうえで選択値を受理するか決める。
 * 検証できない session ではランディングへ戻すだけにして cookie を書かない
 * (未認証の要求で cookie を焼けると、後からサインインした別人の session に他人の選択が乗る)。
 */
async function resolveRequest(
  request: Request,
  raw: string | null,
  returnTo: string | null,
): Promise<WorkspaceEntryResolution> {
  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (sessionSecret === undefined || sessionSecret.length === 0) return { ok: false as const, location: '/' };

  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE_NAME);
  if (token === null) return { ok: false as const, location: '/' };

  const verification = await verifySessionToken(token, sessionSecret, systemAuthClock.nowSeconds());
  // 無効化された利用者の session は署名が正しくても主体として扱わない (dashboard-scope.ts と同じ基準)
  if (!verification.ok || verification.claims.status !== 'active') return { ok: false as const, location: '/' };

  return resolveWorkspaceEntry(raw, verification.claims.workspace_ids, returnTo);
}

function renderWorkspaceSwitchIntermediate(location: string): string {
  const safeLocation = escapeHtmlAttribute(location);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="0;url=${safeLocation}">
  <title>Workspace を切り替えています | Harness Hub</title>
</head>
<body data-hh-workspace-switch-intermediate="">
  <main>
    <h1>Workspace を切り替えています</h1>
    <p>新しい Workspace の画面を安全に読み込んでいます。</p>
    <p><a href="${safeLocation}">自動で進まない場合は続行してください</a></p>
  </main>
</body>
</html>`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
