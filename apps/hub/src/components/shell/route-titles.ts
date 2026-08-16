/**
 * 業務シェルの現在地タイトル。
 *
 * サイドバー用の nav item は「領域」を表すため、詳細・作成・編集 route までを
 * 区別できない。この表は header の現在地表示だけを担い、各 page の h1 や
 * API/認可の判断には使わない。
 *
 * exact route を先に、dynamic route を後に評価する。これにより `new` / `publish` /
 * `releases` を ID と誤認せず、同じ URL は必ず同じタイトルへ解決される。
 */
const exactScreenTitles: Readonly<Record<string, string>> = {
  '/dashboard': 'ホーム',
  '/catalog': '業務ツール',
  '/catalog/publish': 'Skill を公開する',
  '/catalog/releases': 'リリース履歴',
  '/builds': '構築パイプライン',
  '/docs': 'ドキュメント',
  '/docs/new': 'ドキュメントを作成',
  '/feedback': '改善要望フィードバック',
  '/feedback/new': '改善要望を報告',
  '/metrics': '効果測定ダッシュボード',
  '/metrics/usage': '使用状況・削減効果',
  '/tracking': '使用状況・削減効果',
  '/sheets': 'ヒアリングシート',
  '/sheets/new': '業務の困りごとを登録',
  '/users': 'ユーザー管理',
  '/settings/account': 'アカウント設定',
  '/settings/auth': '認証設定 — 顧客所有 Google OAuth',
  '/settings/coefficients': '見積係数設定',
  '/settings/notion': 'Notion連携',
  '/settings/system': 'システム',
  // `/legal` は session がある場合だけ HubShell で描画される。
  '/legal': '利用規約・プライバシーポリシー',
};

const dynamicScreenTitles: readonly { readonly pattern: RegExp; readonly title: string }[] = [
  { pattern: /^\/catalog\/[^/]+$/, title: '業務ツール詳細' },
  { pattern: /^\/docs\/[^/]+\/edit$/, title: 'ドキュメントを編集' },
  { pattern: /^\/docs\/[^/]+$/, title: 'ドキュメント詳細' },
  { pattern: /^\/feedback\/[^/]+$/, title: 'フィードバック詳細' },
  { pattern: /^\/sheets\/[^/]+$/, title: 'ヒアリングシート詳細' },
  { pattern: /^\/users\/[^/]+$/, title: 'ユーザー詳細' },
];

export function resolveShellScreenTitle(currentHref: string | undefined): string | undefined {
  if (currentHref === undefined) return undefined;
  const path = normalizePath(currentHref);
  const exact = exactScreenTitles[path];
  if (exact !== undefined) return exact;
  return dynamicScreenTitles.find(({ pattern }) => pattern.test(path))?.title;
}

function normalizePath(href: string): string {
  const [path = '/'] = href.split(/[?#]/, 1);
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}
