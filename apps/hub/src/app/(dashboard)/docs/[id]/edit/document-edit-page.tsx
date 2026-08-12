'use client';

/**
 * DOCS-SEC7-102 は遅延読込先を含む編集画面が MarkdownView を使うことを要求する。
 * 編集タブのプレビューは MarkdownEditor 内部の MarkdownView 経路で既に sanitize されているが、
 * それとは別に「現在保存されている内容」を MarkdownView でそのまま並べて表示し、
 * 未保存の下書きとの差分を確認できるようにする。
 */
import type { DocumentDetail, DocumentStatus } from '@harness-hub/schemas';
import { Alert, Button, LiveStatus, Panel, Select, Stack, TextInput } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, use, useCallback, useEffect, useState } from 'react';
import { scopeFromQuery } from '../../../../../lib/routing/dashboard-scope-helpers.js';
import { useDashboardScope } from '../../../dashboard-scope-context.js';

const MarkdownEditor = dynamic(() => import('@harness-hub/ui').then((module) => module.MarkdownEditor), {
  loading: () => <p aria-live="polite">Markdown エディタを読み込んでいます…</p>,
});

const MarkdownView = dynamic(() => import('@harness-hub/ui').then((module) => module.MarkdownView), {
  loading: () => <p aria-live="polite">本文を読み込んでいます…</p>,
});

const ScreenHeader = dynamic(() => import('@harness-hub/ui').then((module) => module.ScreenHeader), {
  ssr: false,
  loading: () => <p aria-live="polite">編集画面を読み込んでいます…</p>,
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
  const scope = useDashboardScope();
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);

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
  if (saved === null) return <LiveStatus>ドキュメントを読み込み中です。</LiveStatus>;

  return (
    <article>
      {/* 見出し・パンくず・主要操作の並びは他画面と同じ ScreenHeader に揃える。
          ここだけ生の h1 とページ下部のボタンだったため、
          「編集をやめて戻る」導線と保存ボタンの位置が他画面と食い違っていた */}
      <ScreenHeader
        title="ドキュメントを編集"
        description="保存すると、この内容が閲覧画面に反映されます。"
        breadcrumbs={[
          {
            href: `/docs?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`,
            label: 'ドキュメント',
          },
          {
            href: `/docs/${id}?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`,
            label: saved.title,
          },
          { label: '編集' },
        ]}
        breadcrumbsLabel="現在地"
        sticky
        actions={
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? '保存しています…' : '保存する'}
          </Button>
        }
      />

      <Stack gap={4}>
        {error === null ? null : <Alert tone="danger" title="操作エラー" description={error} />}

        <Panel title="編集">
          <Stack gap={4}>
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
          </Stack>
        </Panel>

        <Panel title="いま保存されている内容" description="上の編集欄と見比べて、変更点を確認できます。">
          <MarkdownView content={saved.body_markdown} />
        </Panel>
      </Stack>
    </article>
  );
}
