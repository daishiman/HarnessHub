'use client';

/**
 * DOCS-SEC7-101 は本ファイル自身の source が MarkdownView を直接使うことを要求する (共通レンダラ以外での本文描画を禁じる)。
 * sheets 系画面のような server wrapper + client companion への分割は、その要求と両立しないためここでは採らない。
 */
import type { DocumentDetail } from '@harness-hub/schemas';
import {
  Alert,
  Button,
  LiveStatus,
  mediaUp,
  Panel,
  ScopeChip,
  ScreenHeader,
  StatusChip,
  TagRow,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, use, useCallback, useEffect, useMemo, useState } from 'react';
import { extractHeadingOutline } from '../../../../features/docs-cms/content-analysis.js';
import { scopeFromQuery } from '../../../../lib/routing/dashboard-scope-helpers.js';
import { useDashboardScope } from '../../dashboard-scope-context.js';
import { TableOfContents } from './table-of-contents.js';

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
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/docs/${id}`, {
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('ドキュメントを取得できませんでした。');
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
  // 早期 return (doc === null) より前に置き、hooks の呼び出し順を保つ
  const headingOutline = useMemo(() => extractHeadingOutline(doc?.body_markdown ?? ''), [doc?.body_markdown]);

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
          <Button
            type="button"
            onClick={() => window.location.assign(`/docs/${id}/edit?tenant=${tenantId}&workspace=${workspaceId}`)}
          >
            編集する
          </Button>
        }
      />
      {/* 状態とスコープは見出し帯 (sticky) の中に置いた。本文が長い運用手順書でも
          「どのテナントの、公開済みか下書きか」を見失わないようにするため */}
      {/* 目次は広い画面 (lg 以上) では本文の右にサイドバーとして常時表示し、
          狭い画面では折りたたみ式に切り替える (レイアウトの出し分けは TableOfContents 内の @media)。
          本文と目次の 2 カラムは、本文が短く目次が空の文書 (TableOfContents が null を返す) でも
          レイアウトが崩れないよう flex に任せる */}
      {/* lg 未満はモバイル目次パネルが本文の上に積まれるよう縦並びにする (横並びのままだと、
          折りたたみ式の目次ボタンが本文の隣に窮屈に並んでしまう) */}
      <style>{`
        [data-hh-doc-layout] { display: flex; flex-direction: column; gap: var(--hh-space-4); }
        ${mediaUp('lg')} { [data-hh-doc-layout] { flex-direction: row; align-items: flex-start; } }
      `}</style>
      <div data-hh-doc-layout="">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Panel>
            <MarkdownView content={doc.body_markdown} />
          </Panel>
        </div>
        <TableOfContents entries={headingOutline} />
      </div>
    </article>
  );
}
