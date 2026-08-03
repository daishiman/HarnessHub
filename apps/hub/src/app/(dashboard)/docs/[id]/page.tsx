'use client';

/**
 * DOCS-SEC7-101 は本ファイル自身の source が MarkdownView を直接使うことを要求する (共通レンダラ以外での本文描画を禁じる)。
 * sheets 系画面のような server wrapper + client companion への分割は、その要求と両立しないためここでは採らない。
 */
import type { DocumentDetail } from '@harness-hub/schemas';
import { Alert, Button, MarkdownView, ScopeChip, StatusChip } from '@harness-hub/ui';
import { type ReactNode, use, useCallback, useEffect, useState } from 'react';

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
  const tenantId = query.tenant ?? '';
  const workspaceId = query.workspace ?? '';

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

  if (error !== null && doc === null) return <Alert tone="danger" title="読み込みエラー" description={error} />;
  if (doc === null) return <p aria-live="polite">読み込み中です…</p>;

  return (
    <article>
      <header>
        <h1>{doc.title}</h1>
        <p>
          <StatusChip domain="document" status={doc.status} />{' '}
          <ScopeChip scope={doc.scope === 'common' ? 'common' : 'tenant'} name={doc.scope === 'common' ? '共通' : 'テナント'} />
        </p>
      </header>
      <MarkdownView content={doc.body_markdown} />
      <p>
        <Button type="button" onClick={() => window.location.assign(`/docs/${id}/edit?tenant=${tenantId}&workspace=${workspaceId}`)}>
          編集する
        </Button>
      </p>
    </article>
  );
}
