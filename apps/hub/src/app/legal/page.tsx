/**
 * /legal — 利用規約・プライバシーポリシー (静的公開ページ)。
 *
 * 全利用者 (未ログイン含む) に公開する (AD-2, screen-inventory.md 「規約 (legal) は静的ページとして
 * S18 配下に置く」)。middleware 側は `PUBLIC_PATH_PREFIXES` に `/legal` を追加済みで、
 * この画面自体は role 分岐・データ取得を一切持たない (静的コンテンツのみ、SEC9: salary 等 PII を含めない)。
 *
 * 表示シェル (HubShell / PublicShell) の出し分けは `layout.tsx` が持つ (このファイルでは持たない)。
 * page.tsx が HubShell 等の client 部品を直接 import すると、その CSS/JS が `/legal/page` の
 * manifest entry に直接乗り、G13 client JS 予算ゲートの実測を押し上げる (layout.tsx のコメント参照)。
 *
 * 本文はこのファイルに書かない。`legal-content.ts` の 1 か所だけを差し替えれば
 * 文面が入れ替わるようにしてある (条の数が増減しても画面側の修正は不要)。
 *
 * 利用規約とプライバシーポリシーは同じページに縦積みする。上部の通常リンクは
 * `#terms` / `#privacy` へ移動するだけなので、JavaScript が無くても両文書が DOM に残り、
 * URL の共有・ブラウザ内検索・ページ全体の印刷をそのまま使える。
 */

import { NavList, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { LegalArticle } from './legal-article.js';
import { LEGAL_DOCUMENTS } from './legal-content.js';

export const metadata: Metadata = {
  title: '利用規約・プライバシーポリシー | Harness Hub',
  description: 'Harness Hub の利用規約とプライバシーポリシーです。',
};

export default function LegalPage() {
  return (
    <>
      <style>{'@media print { [data-print-exclude] { display: none !important; } }'}</style>
      <article aria-labelledby="legal-heading">
        {/* 説明文は全画面共通で「この画面で何ができるか」を 1 行で出す (docs/frontend-ui-foundation-spec.md) */}
        <ScreenHeader
          id="legal-heading"
          title="利用規約・プライバシーポリシー"
          description="Harness Hub をご利用いただく際の条件と、取り扱う情報についての方針です。"
        />

        <NavList
          data-print-exclude=""
          style={{ marginBlockEnd: 'var(--hh-space-4)' }}
          label="このページの文書"
          items={LEGAL_DOCUMENTS.map((entry) => ({ href: `#${entry.slug}`, label: entry.title }))}
        />

        {LEGAL_DOCUMENTS.map((entry, index) => (
          <LegalArticle key={entry.slug} entry={entry} first={index === 0} />
        ))}
      </article>
    </>
  );
}
