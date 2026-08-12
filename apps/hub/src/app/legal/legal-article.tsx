/**
 * /legal に置く 1 本ぶんの文書 (利用規約・プライバシーポリシー) の描画。
 *
 * page.tsx から切り出しているのは、Next.js の page ファイルに部品を同居させると
 * テストから直接呼べる形にならないため。ここが「本文の差し込み口」の受け皿で、
 * 文言は一切持たず `legal-content.ts` から受け取ったものだけを出す。
 *
 * 文書は page.tsx で縦に並ぶ。`id` は通常のフラグメントリンクの飛び先で、
 * `tabIndex={-1}` によりキーボード利用時にもフォーカス先として扱える。
 */
import { Alert, Panel } from '@harness-hub/ui';
import type { ReactNode } from 'react';

import type { LegalDocument } from './legal-content.js';

/** 改定日は「いつ時点のものか」を示す。未確定なら黙らず、未確定だと書く。 */
function revisionLine(entry: LegalDocument): string {
  if (entry.revisedOn === null) return '改定日: 未確定';
  const [year, month, day] = entry.revisedOn.split('-');
  return `改定日: ${year}年${Number(month)}月${Number(day)}日`;
}

export function LegalArticle({
  entry,
  first = false,
}: {
  readonly entry: LegalDocument;
  readonly first?: boolean;
}): ReactNode {
  return (
    <div
      id={entry.slug}
      tabIndex={-1}
      style={{
        scrollMarginBlockStart: 'calc(var(--hh-shell-header-offset, 0px) + var(--hh-space-4))',
        marginBlockStart: first ? undefined : 'var(--hh-space-4)',
      }}
    >
      <Panel title={entry.title}>
        {/*
          確認が取れていない文面は「断り書きを添えて出す」のではなく、出さない。
          断り書きは、載っている文章が読まれるのを止めない。条番号つきの本文が
          規約の体裁で並んでいれば、利用者はそれを読んで判断する余地が残り、
          「免責事項にそう書いてあった」と受け取られ得る。確認前の文面については
          そう読まれること自体が避けたい事象なので、描画の段階で落とす。

          `legal-content.ts` の `lead` / `sections` は消さずに残してある。値を空に
          するより、`approved` を true にすれば出る状態で置いておく方が、本文が
          確定したときの差し替え手順が変わらない。ここは描画の分岐だけを持つ。
        */}
        {entry.approved ? (
          <>
            <p style={{ marginBlockStart: 0 }}>{entry.lead}</p>
            {entry.sections.map((section) => (
              <section key={section.heading}>
                <h3>{section.heading}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </>
        ) : (
          <Alert
            tone="info"
            title="準備中です"
            description={`${entry.title}は現在準備中で、まだ掲載していません。内容が確定しましたら、この画面に掲載します。`}
          />
        )}
        <p style={{ marginBlockEnd: 0 }}>{revisionLine(entry)}</p>
      </Panel>
    </div>
  );
}
