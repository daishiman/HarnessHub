'use client';

/**
 * DOCS-SEC7-101 は本ファイル自身の source が MarkdownView を直接使うことを要求する (共通レンダラ以外での本文描画を禁じる)。
 * sheets 系画面のような server wrapper + client companion への分割は、その要求と両立しないためここでは採らない。
 */
import type { DocumentDetail } from '@harness-hub/schemas';
import { Alert, Badge, Button, LiveStatus, ScopeChip, ScreenHeader, StatusChip, TagRow } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, use, useCallback, useEffect, useState } from 'react';
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
      {/* 本文は遅延境界内でも共通 MarkdownView のみで描画する (DOCS-SEC7-101)。 */}
      <DocumentDetailContent detail={doc} scheduled={scheduled} />
    </article>
  );
}
