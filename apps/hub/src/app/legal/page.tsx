/**
 * /legal — 利用規約・プライバシーポリシー (静的公開ページ)。
 *
 * 全利用者 (未ログイン含む) に公開する (AD-2, screen-inventory.md 「規約 (legal) は静的ページとして
 * S18 配下に置く」)。middleware 側は `PUBLIC_PATH_PREFIXES` に `/legal` を追加済みで、
 * この画面自体は role 分岐・データ取得を一切持たない (静的コンテンツのみ、SEC9: salary 等 PII を含めない)。
 *
 * 認可判定をこの画面に持ち込まない (他画面と同じ理由: 判定点を増やさない)。
 *
 * 本文はこのファイルに書かない。`legal-content.ts` の 1 か所だけを差し替えれば
 * 文面が入れ替わるようにしてある (条の数が増減しても画面側の修正は不要)。
 */

import { ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { PublicShell } from '../../components/shell/public-shell.js';
import { LegalArticle } from './legal-article.js';
import { LEGAL_DOCUMENTS } from './legal-content.js';

export const metadata: Metadata = {
  title: '利用規約・プライバシーポリシー | Harness Hub',
  description: 'Harness Hub の利用規約とプライバシーポリシーです。',
};

export default function LegalPage() {
  return (
    <PublicShell>
      <article aria-labelledby="legal-heading">
        {/* 説明文は全画面共通で「この画面で何ができるか」を 1 行で出す (docs/frontend-ui-foundation-spec.md) */}
        <ScreenHeader
          id="legal-heading"
          title="利用規約・プライバシーポリシー"
          description="Harness Hub をご利用いただく際の条件と、取り扱う情報についての方針です。"
        />

        {LEGAL_DOCUMENTS.map((entry, index) => (
          <LegalArticle key={entry.title} entry={entry} first={index === 0} />
        ))}
      </article>
    </PublicShell>
  );
}
