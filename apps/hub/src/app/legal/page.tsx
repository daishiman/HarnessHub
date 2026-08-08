/**
 * /legal — 利用規約・プライバシーポリシー (静的公開ページ)。
 *
 * 全利用者 (未ログイン含む) に公開する (AD-2, screen-inventory.md 「規約 (legal) は静的ページとして
 * S18 配下に置く」)。middleware 側は `PUBLIC_PATH_PREFIXES` に `/legal` を追加済みで、
 * この画面自体は role 分岐・データ取得を一切持たない (静的コンテンツのみ、SEC9: salary 等 PII を含めない)。
 *
 * 認可判定をこの画面に持ち込まない (他画面と同じ理由: 判定点を増やさない)。
 */

import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { PublicShell } from '../../components/shell/public-shell.js';

export const metadata: Metadata = {
  title: '利用規約・プライバシーポリシー | Harness Hub',
  description: 'Harness Hub の利用規約とプライバシーポリシーです。',
};

export default function LegalPage() {
  return (
    <PublicShell>
      <article aria-labelledby="legal-heading">
        <ScreenHeader id="legal-heading" title="利用規約・プライバシーポリシー" />

        <Panel title="利用規約">
          <p style={{ marginBlockStart: 0 }}>
            本規約は、Harness Hub (以下「本サービス」といいます) の利用条件を定めるものです。本サービスを利用するお客様
            (以下「利用者」といいます) は、本規約に同意した上で本サービスをご利用ください。
          </p>
          <h3>第1条 (適用)</h3>
          <p>本規約は、利用者と本サービス提供者との間の本サービスの利用に関わる一切の関係に適用されます。</p>
          <h3>第2条 (禁止事項)</h3>
          <p>
            利用者は、本サービスの利用にあたり、法令または公序良俗に違反する行為、本サービスの運営を妨げる行為、
            他の利用者または第三者の権利を侵害する行為を行ってはなりません。
          </p>
          <h3>第3条 (免責事項)</h3>
          <p>
            本サービス提供者は、本サービスに関して利用者と他の利用者または第三者との間において生じた紛争について、一切責任を負いません。
          </p>
        </Panel>

        <Panel title="プライバシーポリシー" style={{ marginBlockStart: 'var(--hh-space-4)' }}>
          <p style={{ marginBlockStart: 0 }}>
            本サービス提供者は、利用者から取得した情報を、本サービスの提供・維持・改善の目的の範囲内でのみ利用し、
            関連する法令を遵守して適切に取り扱います。
          </p>
          <h3>第1条 (取得する情報)</h3>
          <p>
            本サービスは、契約に基づき利用者組織が登録したアカウント情報および業務利用に伴い生成される情報を取り扱います。
          </p>
          <h3>第2条 (第三者提供)</h3>
          <p>本サービス提供者は、法令に基づく場合を除き、利用者の同意なく取得した情報を第三者に提供しません。</p>
          <h3>第3条 (お問い合わせ)</h3>
          <p>本ポリシーに関するお問い合わせは、契約窓口までご連絡ください。</p>
        </Panel>
      </article>
    </PublicShell>
  );
}
