'use client';

import { mediaUp, Panel } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useMemo } from 'react';

import { extractHeadingOutline } from '../../../../features/docs-cms/content-analysis.js';

const MarkdownView = dynamic(
  () => import('../../../../components/docs/markdown-view.js').then((module) => module.MarkdownView),
  { loading: () => <p aria-live="polite">本文を読み込んでいます…</p> },
);

const TableOfContents = dynamic(() => import('./table-of-contents.js').then((module) => module.TableOfContents), {
  loading: () => <p aria-live="polite">目次を読み込んでいます…</p>,
});

/** Markdown renderer/目次解析を、取得・ヘッダーを担う初期 route chunk から分離する。 */
export function DocumentDetailContent({ bodyMarkdown }: { readonly bodyMarkdown: string }): ReactNode {
  const headingOutline = useMemo(() => extractHeadingOutline(bodyMarkdown), [bodyMarkdown]);
  return (
    <>
      <style>{`
        [data-hh-doc-layout] { display: flex; flex-direction: column; gap: var(--hh-space-4); }
        ${mediaUp('lg')} { [data-hh-doc-layout] { flex-direction: row; align-items: flex-start; } }
      `}</style>
      <div data-hh-doc-layout="">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Panel>
            <MarkdownView content={bodyMarkdown} />
          </Panel>
        </div>
        <TableOfContents entries={headingOutline} />
      </div>
    </>
  );
}
