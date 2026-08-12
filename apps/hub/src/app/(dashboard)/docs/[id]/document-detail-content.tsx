'use client';

import { Badge, mediaUp, Panel, TagRow } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useMemo } from 'react';

import { extractHeadingOutline } from '../../../../features/docs-cms/content-analysis.js';

const MarkdownView = dynamic(
  () => import('../../../../components/docs/markdown-view.js').then((module) => module.DocsMarkdownView),
  { loading: () => <p aria-live="polite">本文を読み込んでいます…</p> },
);

const TableOfContents = dynamic(() => import('./table-of-contents.js').then((module) => module.TableOfContents), {
  loading: () => <p aria-live="polite">目次を読み込んでいます…</p>,
});

interface DocumentDetailContentProps {
  readonly bodyMarkdown: string;
  readonly category: string | null;
  readonly tags: readonly string[] | null;
  readonly excerpt: string | null;
}

/** Markdown renderer/目次解析を、取得・ヘッダーを担う初期 route chunk から分離する。 */
export function DocumentDetailContent({
  bodyMarkdown,
  category,
  tags,
  excerpt,
}: DocumentDetailContentProps): ReactNode {
  const headingOutline = useMemo(() => extractHeadingOutline(bodyMarkdown), [bodyMarkdown]);
  const hasClassification = category !== null || (tags !== null && tags.length > 0);
  return (
    <>
      <style>{`
        [data-hh-doc-layout] { display: flex; flex-direction: column; gap: var(--hh-space-4); }
        ${mediaUp('lg')} { [data-hh-doc-layout] { flex-direction: row; align-items: flex-start; } }
      `}</style>
      <div data-hh-doc-layout="">
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* 一覧のバッジ表示 (document-list.tsx) と同じ tone 割当てに揃える: category=info, tags=neutral */}
          {hasClassification ? (
            <TagRow>
              {category === null ? null : <Badge tone="info">{category}</Badge>}
              {(tags ?? []).map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </TagRow>
          ) : null}
          {excerpt === null || excerpt === '' ? null : <p style={{ color: 'var(--hh-color-text-muted)' }}>{excerpt}</p>}
          <Panel>
            <MarkdownView content={bodyMarkdown} />
          </Panel>
        </div>
        <TableOfContents entries={headingOutline} />
      </div>
    </>
  );
}
