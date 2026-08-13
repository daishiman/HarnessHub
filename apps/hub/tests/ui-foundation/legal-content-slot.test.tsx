/** @vitest-environment jsdom */
/**
 * LEGALSLOT-01〜09: /legal の本文の差し込み口と文書内ナビゲーション。
 *
 * 本文そのものは法務確認を経たものにしか置き換えられないため、ここで固定するのは
 * 「確認前の文面を画面に出さないこと」と「差し替えが 1 か所で済むこと」。
 * どちらも画面を眺めただけでは分からない。雛形の文面が出たままでも、条番号つきで
 * それらしく並ぶので「規約が載っている」と読めてしまい、欠陥に見えない。
 */
import { UiProvider } from '@harness-hub/ui';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { LegalArticle } from '../../src/app/legal/legal-article.js';
import { LEGAL_DOCUMENTS, type LegalDocument } from '../../src/app/legal/legal-content.js';

// LegalPage は session の有無を見て表示シェルを切り替える async server component
// (`../../src/app/legal/page.tsx` 参照)。ここでは本文差し込みだけを見たいので、
// 常に未ログイン (PublicShell) を通す最小限の next/headers 偽物を差す。
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => ({ get: () => null }),
}));
// next/font はビルド時にフォントを取得する仕組みで、テストプロセスでは動かない
// (HubShell 分岐が使われなくても import は評価されるため、常に偽物へ差し替える)。
vi.mock('next/font/google', () => ({
  Noto_Sans_JP: () => ({ variable: 'hh-test-font', className: 'hh-test-font-class' }),
  IBM_Plex_Sans: () => ({ variable: 'hh-test-font-plex', className: 'hh-test-font-plex-class' }),
  JetBrains_Mono: () => ({ variable: 'hh-test-font-mono', className: 'hh-test-font-mono-class' }),
}));

const { default: LegalPage } = await import('../../src/app/legal/page.js');

function render(node: ReactNode): string {
  return renderToStaticMarkup(<UiProvider>{node}</UiProvider>);
}

async function renderLegalDocument(): Promise<Document> {
  return new DOMParser().parseFromString(`<!DOCTYPE html>${render(await LegalPage())}`, 'text/html');
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
    const html = render(<LegalArticle entry={draft} first />);
    expect(html).toContain('準備中です');
  });

  it('LEGALSLOT-02: 確認前は本文 (前置き・条見出し・段落) を一切描画しない', () => {
    // 断り書きを添えて本文を出すのでは足りない。断り書きは、載っている文章が
    // 読まれるのを止めないため、確認前の文面は DOM に存在させないことで固定する。
    const html = render(<LegalArticle entry={draft} first />);
    expect(html).not.toContain(draft.lead);
    for (const section of draft.sections) {
      expect(html).not.toContain(section.heading);
      for (const paragraph of section.paragraphs) expect(html).not.toContain(paragraph);
    }
  });

  it('LEGALSLOT-03: 確認済みにすると本文が出て、準備中の断りが消える (画面側を直さずに切り替わる)', () => {
    const html = render(<LegalArticle entry={approved} first />);
    expect(html).not.toContain('準備中です');
    expect(html).toContain(approved.lead);
    expect(html).toContain('第1条 (適用)');
    expect(html).toContain('改定日: 2026年9月1日');
  });

  it('LEGALSLOT-04: 改定日は確認前でも黙らず、未確定だと書く', () => {
    // 規約は「いつ時点の内容に同意したのか」が分からないと同意の対象にならない。
    expect(render(<LegalArticle entry={draft} first />)).toContain('改定日: 未確定');
  });

  it('LEGALSLOT-05: 条を増やしても画面側の修正なしで全て描画される', () => {
    const extended: LegalDocument = {
      ...approved,
      sections: [...approved.sections, { heading: '第2条 (追加)', paragraphs: ['あとから足した条。'] }],
    };
    const html = render(<LegalArticle entry={extended} first />);
    expect(html).toContain('第2条 (追加)');
    expect(html).toContain('あとから足した条。');
  });

  it('LEGALSLOT-06: 画面は本文を持たず、確認前の文書は見出しと準備中の断りだけを出す', async () => {
    const document = await renderLegalDocument();
    for (const entry of LEGAL_DOCUMENTS) {
      // 文書があること自体は分かる (どこへ掲載されるのかが読める) が、中身は出さない。
      expect(document.getElementById(entry.slug)).not.toBeNull();
      expect(document.body.textContent).toContain(entry.title);
      if (entry.approved) continue;
      expect(document.body.textContent).not.toContain(entry.lead);
      for (const section of entry.sections) expect(document.body.textContent).not.toContain(section.heading);
    }
    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(0);
    expect(document.querySelectorAll('#terms, #privacy')).toHaveLength(2);
  });

  it('LEGALSLOT-07: 上部 nav は通常のフラグメントリンクで両文書へ直接到達できる', async () => {
    const document = await renderLegalDocument();
    const nav = document.querySelector('nav[aria-label="このページの文書"]');
    expect(nav).not.toBeNull();
    expect([...(nav?.querySelectorAll('a') ?? [])].map((link) => link.getAttribute('href'))).toStrictEqual([
      '#terms',
      '#privacy',
    ]);
  });

  it('LEGALSLOT-08: 各リンク先は共有可能な id とキーボード用フォーカス対象を持つ', async () => {
    const document = await renderLegalDocument();
    for (const entry of LEGAL_DOCUMENTS) {
      const target = document.getElementById(entry.slug);
      expect(target?.getAttribute('tabindex')).toBe('-1');
      expect((target as HTMLElement | null)?.style.scrollMarginBlockStart).toContain('--hh-shell-header-offset');
    }
  });

  it('LEGALSLOT-09: 文書内 nav は印刷対象から外れ、本文は印刷対象のまま残る', async () => {
    const document = await renderLegalDocument();
    expect(document.querySelector('nav[aria-label="このページの文書"]')?.hasAttribute('data-print-exclude')).toBe(true);
    expect([...document.querySelectorAll('style')].map((style) => style.textContent).join('\n')).toContain(
      '@media print { [data-print-exclude] { display: none !important; } }',
    );
    for (const entry of LEGAL_DOCUMENTS) {
      expect(document.getElementById(entry.slug)?.hasAttribute('data-print-exclude')).toBe(false);
    }
  });
});
