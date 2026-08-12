'use client';

/**
 * ドキュメント詳細画面の目次 (Priority 6)。
 *
 * 見出し一覧は `extractHeadingOutline` (content-analysis.ts) が正本。ここでは
 * その出力を並べて「読んでいる場所」の追従表示とクリックでのスクロールだけを持つ。
 * slug の採番規則は `packages/ui/src/components/Markdown.tsx` の見出し id 生成と
 * 完全に一致させてある (同じ slugify + 同じ重複解決規則) ため、ここのリンクは
 * MarkdownView が実際に描く id へそのまま当たる。
 */
import { Button, mediaUp } from '@harness-hub/ui';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import type { HeadingOutlineEntry } from '../../../../features/docs-cms/content-analysis.js';

// lg 以上はサイドバー常時表示 (本文の横に十分な余白がある幅)、それ未満は折りたたみ式に切り替える。
// 画面幅ぶんの出し分けは JS の matchMedia ではなくここに閉じた <style> の @media に任せる
// (SSR と初回描画で JS 判定結果が食い違って、開いた瞬間だけ両方出る/両方消えるちらつきを避ける)。
const desktopBreakpoint = mediaUp('lg');

interface TableOfContentsProps {
  readonly entries: readonly HeadingOutlineEntry[];
}

/**
 * デスクトップでは常時表示の縦並びサイドバー、狭い画面では折りたたみ式にする。
 * 別コンポーネントに分けているのは詳細画面 (page.tsx) を素直な取得/描画だけに保つため。
 */
export function TableOfContents({ entries }: TableOfContentsProps): ReactNode {
  const [activeSlug, setActiveSlug] = useState<string | null>(entries[0]?.slug ?? null);
  const [collapsed, setCollapsed] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scopeId = useId().replace(/[:]/g, '');

  // 見出しの scroll 位置を追いかけて、いま読んでいる節を目次側にも反映する。
  // 見出し数が変わったとき (別文書へ遷移したときなど) は張り直す。
  useEffect(() => {
    if (entries.length === 0) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const targets = entries
      .map((entry) => document.getElementById(entry.slug))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (observedEntries) => {
        // 画面上部に一番近い、いま見えている見出しを「現在地」とする
        const visible = observedEntries
          .filter((observed) => observed.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0];
        if (top !== undefined) setActiveSlug(top.target.id);
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );
    observerRef.current = observer;
    for (const target of targets) observer.observe(target);

    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  const scrollTo = (slug: string): void => {
    const target = document.getElementById(slug);
    if (target === null) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSlug(slug);
  };

  const list = (
    <nav aria-label="目次" data-hh-toc="">
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--hh-space-1)',
        }}
      >
        {entries.map((entry) => (
          <li key={entry.slug} style={{ marginInlineStart: `${(entry.level - 1) * 12}px` }}>
            <a
              href={`#${entry.slug}`}
              data-hh-focusable=""
              aria-current={activeSlug === entry.slug ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                scrollTo(entry.slug);
              }}
              style={{
                display: 'block',
                padding: '2px 0',
                fontSize: 'var(--hh-font-size-sm)',
                color: activeSlug === entry.slug ? 'var(--hh-color-primary)' : 'var(--hh-color-text-muted)',
                fontWeight: activeSlug === entry.slug ? 'var(--hh-font-weight-bold)' : undefined,
                textDecoration: 'none',
              }}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <>
      {/*
        文字列を children としてそのまま渡す (dangerouslySetInnerHTML は使わない・MarkdownView と同じ方針)。
        利用者入力は一切含まず、data 属性の値は useId() 由来の固定パターンのみ。
      */}
      <style>{`
        [data-hh-toc-desktop="${scopeId}"] { display: none; }
        [data-hh-toc-mobile="${scopeId}"] { display: block; }
        ${desktopBreakpoint} {
          [data-hh-toc-desktop="${scopeId}"] { display: block; }
          [data-hh-toc-mobile="${scopeId}"] { display: none; }
        }
      `}</style>

      {/* デスクトップ (lg 以上): 常時表示の sticky サイドバー */}
      <aside
        data-hh-toc-desktop={scopeId}
        style={{
          position: 'sticky',
          insetBlockStart: 'calc(var(--hh-screen-header-height, 0px) + var(--hh-space-4))',
          alignSelf: 'flex-start',
          minWidth: '200px',
          maxWidth: '260px',
          maxHeight: 'calc(100vh - var(--hh-screen-header-height, 0px) - var(--hh-space-8))',
          overflowY: 'auto',
          padding: 'var(--hh-space-3)',
          borderInlineStart: '1px solid var(--hh-color-border)',
        }}
      >
        {list}
      </aside>

      {/* 狭い画面: 折りたたみ式のパネル。常時サイドバーを敷くと本文幅を圧迫するため */}
      <div data-hh-toc-mobile={scopeId} style={{ marginBlockEnd: 'var(--hh-space-4)' }}>
        <Button type="button" variant="secondary" aria-expanded={!collapsed} onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? '目次を開く' : '目次を閉じる'}
        </Button>
        {collapsed ? null : (
          <div
            style={{
              marginBlockStart: 'var(--hh-space-2)',
              padding: 'var(--hh-space-3)',
              border: '1px solid var(--hh-color-border)',
              borderRadius: 'var(--hh-radius-md)',
            }}
          >
            {list}
          </div>
        )}
      </div>
    </>
  );
}
