'use client';

import type { DocumentDetail } from '@harness-hub/schemas';
import { Badge, DefinitionList, mediaUp, Panel, TagRow, Thumbnail } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useMemo } from 'react';

import { DateTimeText } from '../../../../components/format/date-time-text.js';
import { extractHeadingOutline } from '../../../../features/docs-cms/content-analysis.js';

const MarkdownView = dynamic(
  () => import('../../../../components/docs/markdown-view.js').then((module) => module.DocsMarkdownView),
  { loading: () => <p aria-live="polite">本文を読み込んでいます…</p> },
);

const TableOfContents = dynamic(() => import('./table-of-contents.js').then((module) => module.TableOfContents), {
  loading: () => <p aria-live="polite">目次を読み込んでいます…</p>,
});

interface DocumentDetailContentProps {
  readonly detail: DocumentDetail;
  readonly scheduled: boolean;
}

/**
 * 取得が解決した後にだけ現れる表示を、取得・ヘッダーを担う初期 route chunk から丸ごと分離する。
 *
 * 本文 (Markdown renderer / 目次解析) だけでなく「分類と公開設定」も含めるのは、
 * どちらも `doc === null` の間は描かれないためである。page 側に残すと、まだ何も表示できない
 * 読み込み中の状態のためにその分の JS を必ず配ることになる (G13 予算)。
 */
export function DocumentDetailContent({ detail, scheduled }: DocumentDetailContentProps): ReactNode {
  const bodyMarkdown = detail.body_markdown;
  const headingOutline = useMemo(() => extractHeadingOutline(bodyMarkdown), [bodyMarkdown]);
  const tags = detail.tags ?? [];
  const hasClassification = detail.category !== null || tags.length > 0;
  return (
    <>
      <Panel title="分類と公開設定">
        <DefinitionList
          label="分類と公開設定"
          columns={2}
          items={[
            { term: 'カテゴリ', description: detail.category ?? '未分類' },
            { term: 'タグ', description: tags.length > 0 ? tags.join('、') : 'タグなし' },
            {
              term: '予約公開',
              description: detail.publish_at === null ? '設定なし' : <DateTimeText value={detail.publish_at} />,
              hint: scheduled ? '日次の予約公開処理で公開されます (最大24時間程度かかる場合があります)。' : undefined,
            },
            { term: '要約', description: detail.excerpt ?? '要約なし' },
            {
              term: '要約の設定',
              description: detail.excerpt_source === 'manual' ? '手動' : '本文から自動生成',
            },
            {
              term: 'サムネイルの設定',
              description: detail.thumbnail_source === 'manual' ? '手動' : '本文の最初の画像から自動設定',
            },
          ]}
        />
        {detail.thumbnail_url === null ? null : (
          <Thumbnail src={detail.thumbnail_url} size="block" spacingBefore="section" />
        )}
      </Panel>
      <style>{`
        [data-hh-doc-layout] { display: flex; flex-direction: column; gap: var(--hh-space-4); }
        ${mediaUp('lg')} { [data-hh-doc-layout] { flex-direction: row; align-items: flex-start; } }
      `}</style>
      <div data-hh-doc-layout="">
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* 一覧のバッジ表示 (document-list.tsx) と同じ tone 割当てに揃える: category=info, tags=neutral */}
          {hasClassification ? (
            <TagRow>
              {detail.category === null ? null : <Badge tone="info">{detail.category}</Badge>}
              {tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </TagRow>
          ) : null}
          {detail.excerpt === null || detail.excerpt === '' ? null : (
            <p style={{ color: 'var(--hh-color-text-muted)' }}>{detail.excerpt}</p>
          )}
          <Panel>
            <MarkdownView content={bodyMarkdown} />
          </Panel>
        </div>
        <TableOfContents entries={headingOutline} />
      </div>
    </>
  );
}
