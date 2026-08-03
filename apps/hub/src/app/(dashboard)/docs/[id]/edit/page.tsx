'use client';

/**
 * DOCS-SEC7-102 は本ファイル自身の source が MarkdownView を直接使うことを要求する。
 * 編集タブのプレビューは MarkdownEditor 内部の MarkdownView 経路で既に sanitize されているが、
 * それとは別に「現在保存されている内容」を MarkdownView でそのまま並べて表示し、
 * 未保存の下書きとの差分を確認できるようにする。
 */
import type { DocumentDetail, DocumentStatus } from '@harness-hub/schemas';
import { Alert, Button, Select, TextInput } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, use, useCallback, useEffect, useState } from 'react';

const MarkdownEditor = dynamic(() => import('@harness-hub/ui').then((module) => module.MarkdownEditor), {
  loading: () => <p aria-live="polite">Markdown エディタを読み込んでいます…</p>,
});

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

export default function DocumentEditPage({ params, searchParams }: PageProps): ReactNode {
  const { id } = use(params);
  const query = use(searchParams);
  const tenantId = query.tenant ?? '';
  const workspaceId = query.workspace ?? '';

  const [saved, setSaved] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [status, setStatus] = useState<DocumentStatus>('draft');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/docs/${id}`, {
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('ドキュメントを取得できませんでした。');
      const doc = (await response.json()) as DocumentDetail;
      setSaved(doc);
      setTitle(doc.title);
      setBodyMarkdown(doc.body_markdown);
      setStatus(doc.status);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ドキュメントを取得できませんでした。');
    }
  }, [id, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/docs/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
        body: JSON.stringify({ title, body_markdown: bodyMarkdown, status }),
      });
      if (!response.ok) throw new Error('保存できませんでした。');
      const doc = (await response.json()) as DocumentDetail;
      setSaved(doc);
      setError(null);
      window.location.assign(`/docs/${id}?tenant=${tenantId}&workspace=${workspaceId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  if (error !== null && saved === null) return <Alert tone="danger" title="読み込みエラー" description={error} />;
  if (saved === null) return <p aria-live="polite">読み込み中です…</p>;

  return (
    <article>
      <h1>ドキュメントを編集</h1>
      {error === null ? null : <Alert tone="danger" title="操作エラー" description={error} />}

      <TextInput label="タイトル" value={title} onChange={(event) => setTitle(event.target.value)} />
      <Select
        label="状態"
        value={status}
        onChange={(event) => setStatus(event.target.value as DocumentStatus)}
        options={[
          { value: 'draft', label: '下書き' },
          { value: 'published', label: '公開済み' },
        ]}
      />
      <MarkdownEditor label="本文" value={bodyMarkdown} onValueChange={setBodyMarkdown} rows={16} />

      <section aria-label="保存済みの内容">
        <h2>保存済みの内容 (プレビュー)</h2>
        <MarkdownView content={saved.body_markdown} />
      </section>

      <p>
        <Button type="button" onClick={() => void save()} disabled={saving}>
          保存する
        </Button>
      </p>
    </article>
  );
}
