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
import { NotionOpenLink } from '../../../../../components/notion/notion-open-link.js';
import { canWriteDocument, extractErrorMessage } from '../../../../../features/docs-cms/client-errors.js';
import {
  parseTagsInput,
  publishAtInputToEpochMs,
  publishAtToInput,
  tagsToInput,
} from '../../../../../features/docs-cms/form-fields.js';
import { scopeFromQuery } from '../../../../../lib/routing/dashboard-scope-helpers.js';
import { useDashboardScope, useSessionRole } from '../../../dashboard-scope-context.js';

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
  const role = useSessionRole();
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);

  const [saved, setSaved] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [status, setStatus] = useState<DocumentStatus>('draft');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [eyecatchImageUrl, setEyecatchImageUrl] = useState('');
  const [publishAtInput, setPublishAtInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/docs/${id}`, {
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error(await extractErrorMessage(response, 'ドキュメントを取得できませんでした。'));
      const doc = (await response.json()) as DocumentDetail;
      setSaved(doc);
      setTitle(doc.title);
      setBodyMarkdown(doc.body_markdown);
      setStatus(doc.status);
      setCategory(doc.category ?? '');
      setTagsInput(tagsToInput(doc.tags));
      setEyecatchImageUrl(doc.eyecatch_image_url ?? '');
      setPublishAtInput(publishAtToInput(doc.publish_at));
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
        body: JSON.stringify({
          title,
          body_markdown: bodyMarkdown,
          status,
          category: category.trim().length > 0 ? category.trim() : null,
          tags: parseTagsInput(tagsInput),
          eyecatch_image_url: eyecatchImageUrl.trim().length > 0 ? eyecatchImageUrl.trim() : null,
          publish_at: publishAtInputToEpochMs(publishAtInput),
        }),
      });
      if (!response.ok) throw new Error(await extractErrorMessage(response, '保存できませんでした。'));
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
  if (!canWriteDocument(role, saved.scope)) {
    return (
      <Alert
        tone="danger"
        title="編集できません"
        description="このドキュメントを編集する権限がありません (workspace-admin 以上、共通スコープは provider-admin が必要です)。"
      />
    );
  }

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

        {/* 連携済みなら編集画面からも Notion を開けるようにする (S18 Notion連携) */}
        <NotionOpenLink tenantId={tenantId} workspaceId={workspaceId} />

        <Panel title="編集">
          <Stack gap={4}>
            <TextInput label="タイトル" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Select
              label="状態"
              description="予約公開日時を設定していても、状態は保存時点のまま変わりません。予約日時が来ると自動で「公開済み」に切り替わります。"
              value={status}
              onChange={(event) => setStatus(event.target.value as DocumentStatus)}
              options={[
                { value: 'draft', label: '下書き' },
                { value: 'published', label: '公開済み' },
              ]}
            />
            <TextInput
              label="分類"
              description="1つだけ選べます (例: release-note)。空欄なら未分類として保存されます。"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <TextInput
              label="タグ"
              description="カンマ区切りで複数入力できます (例: 手順書, 社内向け)。"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
            />
            <TextInput
              label="アイキャッチ画像 URL"
              description="一覧・詳細に表示するサムネイル画像の URL です (画像アップロードには対応していません)。"
              type="url"
              value={eyecatchImageUrl}
              onChange={(event) => setEyecatchImageUrl(event.target.value)}
            />
            <TextInput
              label="予約公開日時"
              description="指定すると、下書きのままこの日時以降に自動で公開されます (最大24時間程度の遅れが生じることがあります)。空欄なら予約しません。"
              type="datetime-local"
              value={publishAtInput}
              onChange={(event) => setPublishAtInput(event.target.value)}
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
