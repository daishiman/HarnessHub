/**
 * /legal — 利用規約・プライバシーポリシー (静的公開ページ)。
 *
 * 全利用者 (未ログイン含む) に公開する (AD-2, screen-inventory.md 「規約 (legal) は静的ページとして
 * S18 配下に置く」)。middleware 側は `PUBLIC_PATH_PREFIXES` に `/legal` を追加済みで、
 * この画面自体は role 分岐・データ取得を一切持たない (静的コンテンツのみ、SEC9: salary 等 PII を含めない)。
 *
 * 認可判定はここに持ち込まない (誰でも読める文書であることに変わりはない) が、
 * 表示シェルだけは session の有無で分ける (HarnessHub feedback: サインイン後にこのページへ来ると
 * サイドバー/ヘッダーが消える不具合)。`resolveShellProps()` は未認証でも安全な既定値
 * (空 scope / ANONYMOUS identity) を返す設計 (`resolve-shell-props.ts`) なので、
 * ここで直接呼んでも公開性は壊れない。tenant/workspace の両方が解決できたときだけ
 * 業務画面と同じ `HubShell` を使い、それ以外 (未ログイン、または未確定) は
 * 従来どおり `PublicShell` に留める。
 *
 * 本文はこのファイルに書かない。`legal-content.ts` の 1 か所だけを差し替えれば
 * 文面が入れ替わるようにしてある (条の数が増減しても画面側の修正は不要)。
 *
 * 利用規約とプライバシーポリシーは同じページに縦積みする。上部の通常リンクは
 * `#terms` / `#privacy` へ移動するだけなので、JavaScript が無くても両文書が DOM に残り、
 * URL の共有・ブラウザ内検索・ページ全体の印刷をそのまま使える。
 */

import { ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { HubShell } from '../../components/shell/hub-shell.js';
import { PublicShell } from '../../components/shell/public-shell.js';
import { resolveShellProps } from '../../components/shell/resolve-shell-props.js';
import { LegalArticle } from './legal-article.js';
import { LEGAL_DOCUMENTS } from './legal-content.js';

export const metadata: Metadata = {
  title: '利用規約・プライバシーポリシー | Harness Hub',
  description: 'Harness Hub の利用規約とプライバシーポリシーです。',
};

export default async function LegalPage() {
  const shell = await resolveShellProps();
  const isAuthenticated = shell.scope.tenantId !== '' && shell.scope.workspaceId !== '';

  const content = (
    <article aria-labelledby="legal-heading">
      {/* 説明文は全画面共通で「この画面で何ができるか」を 1 行で出す (docs/frontend-ui-foundation-spec.md) */}
      <ScreenHeader
        id="legal-heading"
        title="利用規約・プライバシーポリシー"
        description="Harness Hub をご利用いただく際の条件と、取り扱う情報についての方針です。"
      />

      <nav aria-label="このページの文書" data-print-exclude="">
        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--hh-space-3)',
            margin: '0 0 var(--hh-space-4)',
            padding: 0,
            listStyle: 'none',
          }}
        >
          {LEGAL_DOCUMENTS.map((entry) => (
            <li key={entry.slug}>
              <a href={`#${entry.slug}`}>{entry.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      {LEGAL_DOCUMENTS.map((entry, index) => (
        <LegalArticle key={entry.slug} entry={entry} first={index === 0} />
      ))}
    </article>
  );

  const shellWrapper = (children: ReactNode) =>
    isAuthenticated ? (
      <HubShell
        scope={shell.scope}
        accountName={shell.accountName}
        accountNameIsIdentifier={shell.accountNameIsIdentifier}
        accountRole={shell.role}
        workspaceIds={shell.workspaceIds}
        workspaceNames={shell.workspaceNames}
        currentHref={shell.currentHref}
      >
        {children}
      </HubShell>
    ) : (
      <PublicShell>{children}</PublicShell>
    );

  return (
    <>
      <style>{'@media print { [data-print-exclude] { display: none !important; } }'}</style>
      {shellWrapper(content)}
    </>
  );
}
