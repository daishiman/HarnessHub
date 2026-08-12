'use client';

/**
 * DOCS-SEC7-102 は遅延読込先を含む編集画面が MarkdownView を使うことを要求する。
 * 編集タブのプレビューは MarkdownEditor 内部の MarkdownView 経路で既に sanitize されているが、
 * それとは別に「現在保存されている内容」を MarkdownView でそのまま並べて表示し、
 * 未保存の下書きとの差分を確認できるようにする。
 */
import type { DocumentDetail, DocumentStatus } from '@harness-hub/schemas';
import {
  Alert,
  Button,
  LiveStatus,
  type MarkdownImageUploadResult,
  Panel,
  Select,
  Stack,
  TextInput,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, use, useCallback, useEffect, useState } from 'react';
import { usePendingDocumentImages } from '../../../../../components/docs/use-pending-document-images.js';
import { NotionOpenLink } from '../../../../../components/notion/notion-open-link.js';
import { extractApiErrorMessage } from '../../../../../features/docs-cms/api-error.js';
import { canWriteDocument } from '../../../../../features/docs-cms/client-errors.js';
import { parsePublishAtInput, publishAtToInput } from '../../../../../features/docs-cms/form-fields.js';
import { parseTagsInput, tagsToInputValue } from '../../../../../features/docs-cms/tags.js';
import { scopeFromQuery } from '../../../../../lib/routing/dashboard-scope-helpers.js';
import { useDashboardScope, useSessionRole } from '../../../dashboard-scope-context.js';

const MarkdownEditor = dynamic(
  () => import('../../../../../components/docs/markdown-editor.js').then((module) => module.DocsMarkdownEditor),
  {
    loading: () => <p aria-live="polite">Markdown エディタを読み込んでいます…</p>,
  },
);

const MarkdownView = dynamic(
  () => import('../../../../../components/docs/markdown-view.js').then((module) => module.DocsMarkdownView),
  {
    loading: () => <p aria-live="polite">本文を読み込んでいます…</p>,
  },
);

const ScreenHeader = dynamic(
  () => import('../../../../../components/docs/screen-header.js').then((module) => module.DocsScreenHeader),
  {
    ssr: false,
    loading: () => <p aria-live="polite">編集画面を読み込んでいます…</p>,
  },
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

export default function DocumentEditPage({ params, searchParams }: PageProps): ReactNode {
  const { id } = use(params);
  const query = use(searchParams);
  const scope = useDashboardScope();
  const role = useSessionRole();
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  const { register: registerPendingImage, settleAfterSave: settlePendingImages } = usePendingDocumentImages(
    tenantId,
    workspaceId,
  );

  const [saved, setSaved] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [status, setStatus] = useState<DocumentStatus>('draft');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [publishAtInput, setPublishAtInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/docs/${id}`, {
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error(await extractApiErrorMessage(response, 'ドキュメントを取得できませんでした。'));
      const doc = (await response.json()) as DocumentDetail;
      setSaved(doc);
      setTitle(doc.title);
      setBodyMarkdown(doc.body_markdown);
      setStatus(doc.status);
      setCategory(doc.category ?? '');
      setTagsInput(tagsToInputValue(doc.tags));
      setThumbnailUrl(doc.thumbnail_url ?? '');
      setExcerpt(doc.excerpt ?? '');
      setPublishAtInput(publishAtToInput(doc.publish_at));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ドキュメントを取得できませんでした。');
    }
  }, [id, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  // 編集画面では対象ドキュメントの id が既にあるため、画像アップロード用の
  // 「暗黙の下書き作成」(新規作成画面側) は不要で、そのまま images エンドポイントへ投げられる
  const uploadImage = useCallback(
    async (file: File): Promise<MarkdownImageUploadResult> => {
      const response = await fetch(`/api/v1/docs/${id}/images`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': file.type === '' ? 'application/octet-stream' : file.type,
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
        body: file,
      });
      if (!response.ok)
        throw new Error(
          await extractApiErrorMessage(response, '画像のアップロードに失敗しました。もう一度お試しください。'),
        );
      const uploaded = (await response.json()) as { readonly image_id: string; readonly url: string };
      registerPendingImage({ documentId: id, imageId: uploaded.image_id, url: uploaded.url });
      return { url: uploaded.url };
    },
    [id, tenantId, workspaceId, registerPendingImage],
  );

  const save = async (): Promise<void> => {
    const trimmedTitle = title.trim();
    if (trimmedTitle === '') {
      setError('タイトルを入力してください。');
      return;
    }

    setSaving(true);
    try {
      if (saved === null) throw new Error('ドキュメントを取得できませんでした。');
      const body: Record<string, unknown> = {};
      if (trimmedTitle !== saved.title) body.title = trimmedTitle;
      if (bodyMarkdown !== saved.body_markdown) body.body_markdown = bodyMarkdown;
      if (status !== saved.status) body.status = status;

      const normalizedCategory = category.trim() === '' ? null : category.trim();
      if (normalizedCategory !== saved.category) body.category = normalizedCategory;

      const tags = parseTagsInput(tagsInput);
      const savedTags = saved.tags ?? [];
      const nextTags = tags ?? [];
      if (nextTags.length !== savedTags.length || nextTags.some((tag, index) => tag !== savedTags[index])) {
        body.tags = tags;
      }

      const normalizedThumbnailUrl = thumbnailUrl.trim() === '' ? null : thumbnailUrl.trim();
      if (normalizedThumbnailUrl !== saved.thumbnail_url) body.thumbnail_url = normalizedThumbnailUrl;

      const normalizedExcerpt = excerpt.trim() === '' ? null : excerpt.trim();
      if (normalizedExcerpt !== saved.excerpt) body.excerpt = normalizedExcerpt;

      // 未変更の予約日時は送らない。全保存で再送すると、title/body の実変更で予約を解除する
      // repository 契約を「同時に再予約した」と誤認させるため、利用者が日時を触った場合だけ明示する。
      if (publishAtInput !== publishAtToInput(saved.publish_at)) {
        const publishAt = parsePublishAtInput(publishAtInput);
        if (!publishAt.ok) throw new Error(publishAt.message);
        body.publish_at = status === 'published' ? null : publishAt.value;
      }

      if (Object.keys(body).length === 0) {
        window.location.assign(`/docs/${id}?tenant=${tenantId}&workspace=${workspaceId}`);
        return;
      }
      const response = await fetch(`/api/v1/docs/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await extractApiErrorMessage(response, '保存できませんでした。'));
      const doc = (await response.json()) as DocumentDetail;
      setSaved(doc);
      setError(null);
      await settlePendingImages(doc.body_markdown);
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
            <TextInput label="タイトル" required value={title} onChange={(event) => setTitle(event.target.value)} />
            <Select
              label="状態"
              description="公開済みにすると予約日時は解除されます。予約日時を設定すると下書きになります。"
              value={status}
              onChange={(event) => {
                const next = event.target.value as DocumentStatus;
                setStatus(next);
                if (next === 'published') setPublishAtInput('');
              }}
              options={[
                { value: 'draft', label: '下書き' },
                { value: 'published', label: '公開済み' },
              ]}
            />
            <TextInput
              label="カテゴリ"
              description="1つの分類名を入力します。空欄なら未分類です。"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <TextInput
              label="タグ"
              description="カンマ区切りで複数入力できます。"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
            />
            <TextInput
              label="サムネイル画像 URL"
              description="空欄なら本文の最初の画像を自動採用します。本文への画像追加は下のエディタから行えます。"
              value={thumbnailUrl}
              onChange={(event) => setThumbnailUrl(event.target.value)}
            />
            <TextInput
              label="要約"
              description="空欄なら本文から自動生成します。"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
            />
            <TextInput
              label="予約公開日時"
              description="未来の日時を指定すると下書きになり、日次処理で公開されます。"
              type="datetime-local"
              value={publishAtInput}
              onChange={(event) => {
                setPublishAtInput(event.target.value);
                if (event.target.value !== '') setStatus('draft');
              }}
            />
            <MarkdownEditor
              label="本文"
              value={bodyMarkdown}
              onValueChange={setBodyMarkdown}
              rows={16}
              onImageUpload={uploadImage}
            />
          </Stack>
        </Panel>

        <Panel title="いま保存されている内容" description="上の編集欄と見比べて、変更点を確認できます。">
          <MarkdownView content={saved.body_markdown} />
        </Panel>
      </Stack>
    </article>
  );
}
