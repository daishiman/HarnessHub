'use client';

/**
 * DOCS-SEC7-101 は本ファイル自身の source が MarkdownView を直接使うことを要求する (共通レンダラ以外での本文描画を禁じる)。
 * sheets 系画面のような server wrapper + client companion への分割は、その要求と両立しないためここでは採らない。
 */
import type { DocumentDetail } from '@harness-hub/schemas';
import {
  Alert,
  Badge,
  Button,
  DefinitionList,
  LiveStatus,
  Panel,
  ScopeChip,
  ScreenHeader,
  StatusChip,
  TagRow,
  Thumbnail,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, use, useCallback, useEffect, useState } from 'react';
import { DateTimeText } from '../../../../components/format/date-time-text.js';
import { canWriteDocument, extractErrorMessage } from '../../../../features/docs-cms/client-errors.js';
import { scopeFromQuery } from '../../../../lib/routing/dashboard-scope-helpers.js';
import { useDashboardScope, useSessionRole } from '../../dashboard-scope-context.js';

const DocumentDetailContent = dynamic(
  () => import('./document-detail-content.js').then((module) => module.DocumentDetailContent),
  { loading: () => <p aria-live="polite">本文を読み込んでいます…</p> },
);

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

const headers = (tenantId: string, workspaceId: string) => ({
  'content-type': 'application/json',
  'x-harness-tenant-id': tenantId,
  'x-harness-workspace-id': workspaceId,
});

export default function DocumentDetailPage({ params, searchParams }: PageProps): ReactNode {
  const { id } = use(params);
  const query = use(searchParams);
  const scope = useDashboardScope();
  const role = useSessionRole();
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 現在時刻に依存する badge は hydration 後にだけ導出し、SSR/初回client描画の差を作らない。
  const [clientNow, setClientNow] = useState<number | null>(null);

  useEffect(() => {
    setClientNow(Date.now());
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/docs/${id}`, {
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error(await extractErrorMessage(response, 'ドキュメントを取得できませんでした。'));
      setDoc((await response.json()) as DocumentDetail);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ドキュメントを取得できませんでした。');
    }
  }, [id, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const listHref = `/docs?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`;
  if (doc === null) {
    return (
      <article>
        <ScreenHeader
          title="ドキュメント詳細"
          breadcrumbs={[{ href: listHref, label: 'ドキュメント' }, { label: '詳細' }]}
          breadcrumbsLabel="現在地"
          sticky
        />
        {error === null ? (
          <LiveStatus>ドキュメントを読み込み中です。</LiveStatus>
        ) : (
          <Alert tone="danger" title="読み込みエラー" description={error} />
        )}
      </article>
    );
  }

  const scheduled =
    clientNow !== null && doc.status === 'draft' && doc.publish_at !== null && doc.publish_at > clientNow;

  return (
    <article>
      <ScreenHeader
        title={doc.title}
        breadcrumbs={[
          {
            href: listHref,
            label: 'ドキュメント',
          },
          { label: doc.title },
        ]}
        breadcrumbsLabel="現在地"
        sticky
        tags={
          <TagRow>
            <StatusChip domain="document" status={doc.status} />
            {scheduled ? <Badge tone="warning">予約公開</Badge> : null}
            <ScopeChip
              scope={doc.scope === 'common' ? 'common' : 'tenant'}
              name={doc.scope === 'common' ? '共通' : 'テナント'}
            />
          </TagRow>
        }
        actions={
          canWriteDocument(role, doc.scope) ? (
            <Button
              type="button"
              onClick={() => window.location.assign(`/docs/${id}/edit?tenant=${tenantId}&workspace=${workspaceId}`)}
            >
              編集する
            </Button>
          ) : undefined
        }
      />
      <Panel title="分類と公開設定">
        <DefinitionList
          label="分類と公開設定"
          columns={2}
          items={[
            { term: 'カテゴリ', description: doc.category ?? '未分類' },
            { term: 'タグ', description: (doc.tags ?? []).length > 0 ? (doc.tags ?? []).join('、') : 'タグなし' },
            {
              term: '予約公開',
              description: doc.publish_at === null ? '設定なし' : <DateTimeText value={doc.publish_at} />,
              hint: scheduled ? '日次の予約公開処理で公開されます (最大24時間程度かかる場合があります)。' : undefined,
            },
            { term: '要約', description: doc.excerpt ?? '要約なし' },
            {
              term: '要約の設定',
              description: doc.excerpt_source === 'manual' ? '手動' : '本文から自動生成',
            },
            {
              term: 'サムネイルの設定',
              description: doc.thumbnail_source === 'manual' ? '手動' : '本文の最初の画像から自動設定',
            },
          ]}
        />
        {doc.thumbnail_url === null ? null : <Thumbnail src={doc.thumbnail_url} size="block" spacingBefore="section" />}
      </Panel>
      {/* 本文は遅延境界内でも共通 MarkdownView のみで描画する (DOCS-SEC7-101)。 */}
      <DocumentDetailContent
        bodyMarkdown={doc.body_markdown}
        category={doc.category}
        tags={doc.tags}
        excerpt={doc.excerpt}
      />
    </article>
  );
}
