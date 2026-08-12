/** @vitest-environment jsdom */
/**
 * LEGALSLOT-01〜06: /legal の本文の差し込み口 (HarnessHub-5yen)。
 *
 * 本文そのものは法務確認を経たものにしか置き換えられないため、ここで固定するのは
 * 「確認前の文面を画面に出さないこと」と「差し替えが 1 か所で済むこと」。
 * どちらも画面を眺めただけでは分からない。雛形の文面が出たままでも、条番号つきで
 * それらしく並ぶので「規約が載っている」と読めてしまい、欠陥に見えない。
 */
import { UiProvider } from '@harness-hub/ui';
import { fireEvent, render as renderDom, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LegalArticle } from '../../src/app/legal/legal-article.js';
import { LEGAL_DOCUMENTS, type LegalDocument } from '../../src/app/legal/legal-content.js';
import LegalPage from '../../src/app/legal/page.js';

function render(node: ReactNode): string {
  return renderToStaticMarkup(<UiProvider>{node}</UiProvider>);
}

const draft: LegalDocument = {
  slug: 'terms',
  title: '利用規約',
  approved: false,
  revisedOn: null,
  lead: '前置き。',
  sections: [{ heading: '第1条 (適用)', paragraphs: ['本文。'] }],
};

/** 確認済みの状態。本文が出るのはこちらだけ。 */
const approved: LegalDocument = { ...draft, approved: true, revisedOn: '2026-09-01' };

describe('LEGALSLOT: /legal の本文差し込み口', () => {
  it('LEGALSLOT-01: 確認前は「準備中」とだけ出す', () => {
    const html = render(<LegalArticle entry={draft} />);
    expect(html).toContain('準備中です');
  });

  it('LEGALSLOT-02: 確認前は本文 (前置き・条見出し・段落) を一切描画しない', () => {
    // 断り書きを添えて本文を出すのでは足りない。断り書きは、載っている文章が
    // 読まれるのを止めないため、確認前の文面は DOM に存在させないことで固定する。
    const html = render(<LegalArticle entry={draft} />);
    expect(html).not.toContain(draft.lead);
    for (const section of draft.sections) {
      expect(html).not.toContain(section.heading);
      for (const paragraph of section.paragraphs) expect(html).not.toContain(paragraph);
    }
  });

  it('LEGALSLOT-03: 確認済みにすると本文が出て、準備中の断りが消える (画面側を直さずに切り替わる)', () => {
    const html = render(<LegalArticle entry={approved} />);
    expect(html).not.toContain('準備中です');
    expect(html).toContain(approved.lead);
    expect(html).toContain('第1条 (適用)');
    expect(html).toContain('改定日: 2026年9月1日');
  });

  it('LEGALSLOT-04: 改定日は確認前でも黙らず、未確定だと書く', () => {
    // 規約は「いつ時点の内容に同意したのか」が分からないと同意の対象にならない。
    expect(render(<LegalArticle entry={draft} />)).toContain('改定日: 未確定');
  });

  it('LEGALSLOT-05: 条を増やしても画面側の修正なしで全て描画される', () => {
    const extended: LegalDocument = {
      ...approved,
      sections: [...approved.sections, { heading: '第2条 (追加)', paragraphs: ['あとから足した条。'] }],
    };
    const html = render(<LegalArticle entry={extended} />);
    expect(html).toContain('第2条 (追加)');
    expect(html).toContain('あとから足した条。');
  });

  it('LEGALSLOT-06: 画面は本文を持たず、確認前の文書は見出しと準備中の断りだけを出す', () => {
    const html = render(<LegalPage />);
    for (const entry of LEGAL_DOCUMENTS) {
      // 文書があること自体は分かる (どこへ掲載されるのかが読める) が、中身は出さない。
      expect(html).toContain(entry.title);
      if (entry.approved) continue;
      expect(html).not.toContain(entry.lead);
      for (const section of entry.sections) expect(html).not.toContain(section.heading);
    }
  });

  it('LEGALSLOT-07: タブを選ぶと対応する文書だけを表示する', () => {
    renderDom(
      <UiProvider>
        <LegalPage />
      </UiProvider>,
    );

    const privacyTab = screen.getByRole('tab', { name: 'プライバシーポリシー' });
    fireEvent.click(privacyTab);

    expect(privacyTab.getAttribute('aria-selected')).toBe('true');
    const panelId = privacyTab.getAttribute('aria-controls');
    expect(panelId).not.toBeNull();
    expect(document.getElementById(panelId ?? '')?.textContent).toContain('プライバシーポリシー');
  });
});
