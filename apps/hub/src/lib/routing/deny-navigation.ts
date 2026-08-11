/**
 * 認可層が拒否したとき、ブラウザの画面遷移にだけ人間が読める応答を返すための表示層。
 *
 * middleware は判定結果をそのまま `{"error": "..."}` の JSON で返していた。API 契約としては
 * これが正しいが、ページ遷移で拒否された利用者の画面には生の JSON が出て、何が起きたのかも
 * どこへ戻ればよいのかも分からない状態になっていた。
 *
 * ここに置くのは**表示だけ**で、認可の判断は一切しない (判断は src/middleware/authz.ts の単一層のまま)。
 */

import type { DenyReason } from '../../middleware-contract.js';
import { workspaceRecoveryNotice } from './workspace-recovery.js';

/**
 * ブラウザの画面遷移とみなせる要求か。
 *
 * 条件を「GET かつ `Accept: text/html` かつ Bearer 無しかつ `/api/` 配下でない」に絞るのは、
 * 機械クライアントの JSON 契約を一切変えないため。fetch (`Accept: application/json`)、
 * Bearer 認証、Next の client 側遷移 (`Accept: text/x-component`) はどれもこの条件に当たらず、
 * 従来どおり JSON を受け取る。
 */
export function isNavigationRequest(input: {
  readonly method: string;
  readonly pathname: string;
  readonly accept: string | null;
  readonly hasBearer: boolean;
}): boolean {
  if (input.method !== 'GET' || input.hasBearer) return false;
  if (input.pathname === '/api' || input.pathname.startsWith('/api/')) return false;
  return input.accept?.includes('text/html') === true;
}

interface DenyNotice {
  readonly title: string;
  readonly description: string;
  /** 復帰先へのリンクを出すか。存在秘匿のため出さない方がよい場合は false。 */
  readonly backToTop: boolean;
  /** 復帰リンクの文言。省略時は汎用の「トップページへ戻る」。 */
  readonly actionLabel?: string;
}

// scope 未解決の文言は RSC 側の ScopeUnresolvedScreen と同一の正本を使う (受入 5)。
// 同じ状態が層ごとに別の説明になると、利用者は画面が変わるたびに読み直すことになる。
const unresolved = workspaceRecoveryNotice('unresolved');
const conflicting = workspaceRecoveryNotice('conflicting');

/**
 * 拒否理由ごとの案内文。
 *
 * `tenant_mismatch` だけ理由に触れないのは、他テナントの資源であることを応答から伝えないため
 * (T-ISO-06。status も 404 で揃えてある)。
 */
const NOTICES: Readonly<Record<DenyReason, DenyNotice>> = {
  unauthenticated: {
    title: 'サインインが必要です',
    description: 'この画面を開くにはサインインしてください。セッションの有効期限が切れている場合もあります。',
    backToTop: true,
  },
  missing_tenant_scope: {
    title: unresolved.title,
    description: unresolved.description,
    backToTop: true,
    actionLabel: unresolved.actionLabel,
  },
  ambiguous_scope: {
    title: conflicting.title,
    description: conflicting.description,
    backToTop: true,
    actionLabel: conflicting.actionLabel,
  },
  workspace_not_member: {
    title: 'この Workspace を開く権限がありません',
    description: '所属していない Workspace の画面は開けません。必要な場合はテナントの管理者へ依頼してください。',
    backToTop: true,
  },
  tenant_mismatch: {
    title: 'ページが見つかりません',
    description: 'URL をご確認ください。',
    backToTop: false,
  },
};

/**
 * 拒否理由を最小の HTML ページにする。
 *
 * middleware は edge で動き React を描けないため文字列で組む。埋め込む値は上の定数だけで、
 * 要求由来の文字列 (path や query) は一切入れない — 入れると escape 漏れがそのまま XSS になる。
 * 復帰先はリンクにとどめ、自動 redirect にはしない (`/` は条件次第で業務画面へ送るため、
 * 拒否 → redirect → 拒否 の往復を作りかねない)。
 */
export function renderDenyNavigationPage(reason: DenyReason): string {
  const notice = NOTICES[reason];
  const back = notice.backToTop ? `<p><a href="/">${notice.actionLabel ?? 'トップページへ戻る'}</a></p>` : '';
  return [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${notice.title} | Harness Hub</title>`,
    '</head>',
    '<body>',
    '<main>',
    `<h1>${notice.title}</h1>`,
    `<p>${notice.description}</p>`,
    back,
    '</main>',
    '</body>',
    '</html>',
  ].join('');
}
