'use client';

/**
 * DOCS-SEC7-101 は本ファイル自身の source が MarkdownView を直接使うことを要求する (共通レンダラ以外での本文描画を禁じる)。
 * sheets 系画面のような server wrapper + client companion への分割は、その要求と両立しないためここでは採らない。
 */
import type { DocumentDetail } from '@harness-hub/schemas';
import {
  Alert,
  Button,
  DefinitionList,
  LiveStatus,
  Panel,
  ScopeChip,
  ScreenHeader,
  StatusChip,
  TagRow,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, use, useCallback, useEffect, useState } from 'react';
import { canWriteDocument, extractErrorMessage } from '../../../../features/docs-cms/client-errors.js';
import { scopeFromQuery } from '../../../../lib/routing/dashboard-scope-helpers.js';
import { useDashboardScope, useSessionRole } from '../../dashboard-scope-context.js';

const MarkdownView = dynamic(() => import('@harness-hub/ui').then((module) => module.MarkdownView), {
  loading: () => <p aria-live="polite">本文を読み込んでいます…</p>,
});

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
      {/* 状態とスコープは見出し帯 (sticky) の中に置いた。本文が長い運用手順書でも
          「どのテナントの、公開済みか下書きか」を見失わないようにするため */}
      <Panel title="分類と公開設定">
        <DefinitionList
          label="分類と公開設定"
          columns={2}
          items={[
            { term: '分類', description: doc.category ?? '未分類' },
            { term: 'タグ', description: doc.tags.length > 0 ? doc.tags.join('、') : 'タグなし' },
            {
              term: '予約公開',
              description: doc.publish_at === null ? '設定なし' : new Date(doc.publish_at).toLocaleString('ja-JP'),
              hint:
                doc.publish_at === null || doc.status === 'published'
                  ? undefined
                  : '毎日の予約公開処理で反映されます (最大24時間程度かかることがあります)。',
            },
          ]}
        />
        {doc.eyecatch_image_url === null ? null : (
          // biome-ignore lint/performance/noImgElement: 任意の外部 URL を許すアイキャッチ画像で、next/image の最適化ドメイン許可リストに載せる対象ではない
          <img
            src={doc.eyecatch_image_url}
            alt=""
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 'var(--hh-radius-sm)',
              marginTop: 'var(--hh-space-3)',
            }}
          />
        )}
      </Panel>
      <Panel>
        <MarkdownView content={doc.body_markdown} />
      </Panel>
    </article>
  );
}
