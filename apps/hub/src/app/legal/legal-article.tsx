/**
 * /legal に置く 1 本ぶんの文書 (利用規約・プライバシーポリシー) の描画。
 *
 * page.tsx から切り出しているのは、Next.js の page ファイルに部品を同居させると
 * テストから直接呼べる形にならないため。ここが「本文の差し込み口」の受け皿で、
 * 文言は一切持たず `legal-content.ts` から受け取ったものだけを出す。
 *
 * 表示は `Tabs` (page.tsx) で 1 文書ずつ切り替える。利用規約とプライバシーポリシーを
 * 同じ縦スクロールに並べると、条文が増えたときに目的の文書へ辿り着くまでの
 * スクロール量が増える一方だったため (HarnessHub UI/UX 改善)。タブ内は
 * 1 文書だけなので、複数 Panel を積む前提だった余白調整 (`first` 分岐) は不要になった。
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

export function LegalArticle({ entry }: { readonly entry: LegalDocument }): ReactNode {
  return (
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
  );
}
