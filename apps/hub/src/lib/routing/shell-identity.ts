/**
 * 共通シェルのヘッダーが必要とする「誰としてサインインしているか」の解決。
 *
 * `resolveDashboardScope()` は tenant/workspace だけを返す契約なので、
 * 役割表示 (qa-005: 権限の思い込みを防ぐためアバターメニューに role を出す) のために
 * scope の型を広げず、この 1 関数を足している。
 *
 * 判定規則は dashboard-scope.ts と同じ (署名検証 + status !== 'active' は主体として扱わない)。
 *
 * 注意: `next/headers` を使う Server Component 専用。
 */

import type { SessionRole } from '@harness-hub/schemas';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { SESSION_COOKIE_NAME } from '../auth/config.js';
import { systemAuthClock } from '../auth/ports.js';
import { verifySessionToken } from '../auth/session.js';

export interface ShellIdentity {
  /** 利用者の識別子 (session の sub)。表示名が無いときの最後の拠り所。 */
  readonly subject: string | null;
  /**
   * 人が読める表示名 (氏名、無ければメールアドレス)。
   * claim が無い session (この claim を足す前に発行されたもの、または名前もメールも
   * 空の利用者) では null。呼び出し側は null のとき subject を**識別子として**出す。
   */
  readonly displayName: string | null;
  /** session claim の役割。未確定なら null。 */
  readonly role: SessionRole | null;
  /**
   * 所属 Workspace の識別子一覧 (feat-workspace-switch-ux 受入 1・3)。
   * シェルの切替 UI を出すかどうかは「所属が 2 件以上か」で決まるため、
   * scope (現在値 1 件) だけでは判定できず、一覧そのものが要る。
   * 未認証・検証失敗時は空配列 = 切替 UI なし (fail-closed)。
   */
  readonly workspaceIds: readonly string[];
  /**
   * 所属 Workspace の表示名 (識別子 → 名前)。**表示専用**で、切替 UI を出すかの判定には使わない
   * (判定は `workspaceIds` の件数だけで決まる)。名前が無い Workspace はキーごと欠ける。
   */
  readonly workspaceNames: Readonly<Record<string, string>>;
}

const ANONYMOUS: ShellIdentity = {
  subject: null,
  displayName: null,
  role: null,
  workspaceIds: [],
  workspaceNames: {},
};

/** 同一リクエスト内での cookie 読取・署名検証の重複を避けるため cache でラップする。 */
export const resolveShellIdentity = cache(async (): Promise<ShellIdentity> => {
  const sessionSecret = process.env.AUTH_SESSION_SECRET;
  if (sessionSecret === undefined || sessionSecret.length === 0) return ANONYMOUS;

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (token === undefined) return ANONYMOUS;

  const verification = await verifySessionToken(token, sessionSecret, systemAuthClock.nowSeconds());
  if (!verification.ok) return ANONYMOUS;

  const { claims } = verification;
  if (claims.status !== 'active') return ANONYMOUS;

  return {
    subject: claims.sub,
    displayName: claims.name ?? null,
    role: claims.role,
    workspaceIds: claims.workspace_ids,
    workspaceNames: claims.workspace_names ?? {},
  };
});
