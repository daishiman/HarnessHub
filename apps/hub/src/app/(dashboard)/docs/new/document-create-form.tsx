'use client';

import type { DocumentDetail, DocumentScope } from '@harness-hub/schemas';
import { Alert, Button, type MarkdownImageUploadResult, Select, Stack, TextInput } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type FormEvent, type ReactNode, useCallback, useRef, useState } from 'react';
import { usePendingDocumentImages } from '../../../../components/docs/use-pending-document-images.js';
import { extractApiErrorMessage } from '../../../../features/docs-cms/api-error.js';
import { parsePublishAtInput } from '../../../../features/docs-cms/form-fields.js';
import { parseTagsInput } from '../../../../features/docs-cms/tags.js';

const MarkdownEditor = dynamic(
  () => import('../../../../components/docs/markdown-editor.js').then((module) => module.DocsMarkdownEditor),
  {
    loading: () => <p aria-live="polite">Markdown エディタを読み込んでいます…</p>,
  },
);

interface DocumentCreateFormProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /** `docs.write_common` を持つ role のときだけ「共通」スコープを選べる。 */
  readonly canWriteCommon: boolean;
}

export function DocumentCreateForm({ tenantId, workspaceId, canWriteCommon }: DocumentCreateFormProps): ReactNode {
  const { register: registerPendingImage, settleAfterSave: settlePendingImages } = usePendingDocumentImages(
    tenantId,
    workspaceId,
  );
  const [scope, setScope] = useState<DocumentScope>('tenant');
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [publishAtInput, setPublishAtInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 画像を先に足された場合の暗黙下書き作成 (ensureDraftId) が払い出した id。
  // ref にするのは、連続してすばやく画像を貼ったときに 2 重に下書きを作らせないため
  // (state の更新は非同期なので、直後の 2 回目の呼び出しにまだ反映されない)
  const draftIdRef = useRef<string | null>(null);
  const draftCreationRef = useRef<Promise<string> | null>(null);

  const createDocument = useCallback(
    async (body: Record<string, unknown>): Promise<DocumentDetail> => {
      const response = await fetch('/api/v1/docs', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await extractApiErrorMessage(response, '作成できませんでした。'));
      return (await response.json()) as DocumentDetail;
    },
    [tenantId, workspaceId],
  );

  /**
   * まだ本文を書いている途中で最初の画像を足したときは、その場でタイトル無しの下書きを
   * 作ってしまい、以後はそちらへ画像を積み増す。「画像を貼るには先にタイトルと保存が要る」
   * という順序を利用者に強いない (原則: 画像追加はいつでも・迷わず にできる)。
   */
  const ensureDraftId = useCallback(async (): Promise<string> => {
    if (draftIdRef.current !== null) return draftIdRef.current;
    if (draftCreationRef.current !== null) return draftCreationRef.current;

    const creation = createDocument({
      scope,
      title: title.trim() === '' ? '無題のドキュメント' : title,
      body_markdown: bodyMarkdown,
    }).then((created) => {
      draftIdRef.current = created.id;
      return created.id;
    });
    draftCreationRef.current = creation;
    try {
      return await creation;
    } finally {
      draftCreationRef.current = null;
    }
  }, [createDocument, scope, title, bodyMarkdown]);

  const uploadImage = useCallback(
    async (file: File): Promise<MarkdownImageUploadResult> => {
      const id = await ensureDraftId();
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
    [ensureDraftId, tenantId, workspaceId, registerPendingImage],
  );

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    // タイトルは API 側も必須 (min 1 文字) だが、trim していない生の値をそのまま送ると
    // 「空白だけのタイトル」で 400 になり、原因の分からない「作成できませんでした」が出るだけだった。
    // ここで先に弾いて、画像を貼らずに直接送信した場合でも次の一手が分かるようにする。
    const trimmedTitle = title.trim();
    if (trimmedTitle === '') {
      setError('タイトルを入力してください。');
      return;
    }

    setSaving(true);
    try {
      const publishAt = parsePublishAtInput(publishAtInput);
      if (!publishAt.ok) throw new Error(publishAt.message);
      const metadata = {
        category: category.trim() === '' ? null : category.trim(),
        tags: parseTagsInput(tagsInput),
        thumbnail_url: thumbnailUrl.trim() === '' ? null : thumbnailUrl.trim(),
        excerpt: excerpt.trim() === '' ? null : excerpt.trim(),
        publish_at: publishAt.value,
      };
      // 画像追加のタイミングで下書きが既にできているなら、それを更新する
      // (ここで新規作成すると、画像だけが古い下書きに残ったまま孤立する)
      const created =
        draftIdRef.current === null
          ? await createDocument({ scope, title: trimmedTitle, body_markdown: bodyMarkdown, ...metadata })
          : await (async () => {
              const response = await fetch(`/api/v1/docs/${draftIdRef.current}`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                  'content-type': 'application/json',
                  'x-harness-tenant-id': tenantId,
                  'x-harness-workspace-id': workspaceId,
                },
                body: JSON.stringify({ title: trimmedTitle, body_markdown: bodyMarkdown, ...metadata }),
              });
              if (!response.ok) throw new Error(await extractApiErrorMessage(response, '作成できませんでした。'));
              return (await response.json()) as DocumentDetail;
            })();
      await settlePendingImages(created.body_markdown);
      window.location.assign(`/docs/${created.id}?tenant=${tenantId}&workspace=${workspaceId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '作成できませんでした。');
      setSaving(false);
    }
  };

  return (
    <form aria-label="ドキュメントの新規作成" onSubmit={(event) => void submit(event)}>
      {/* 入力欄どうしの間隔は Stack に任せる。各画面で margin を書くと欄の密度がばらつく */}
      <Stack gap={4}>
        {error === null ? null : <Alert tone="danger" title="作成エラー" description={error} />}
        <Select
          label="スコープ"
          value={scope}
          onChange={(event) => setScope(event.target.value as DocumentScope)}
          options={
            canWriteCommon
              ? [
                  { value: 'tenant', label: 'テナント' },
                  { value: 'common', label: '共通 (provider-admin)' },
                ]
              : [{ value: 'tenant', label: 'テナント' }]
          }
        />
        <TextInput label="タイトル" required value={title} onChange={(event) => setTitle(event.target.value)} />
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
          description="未来の日時を指定すると、下書きとして保存され、日次処理で公開されます。空欄なら予約しません。"
          type="datetime-local"
          value={publishAtInput}
          onChange={(event) => setPublishAtInput(event.target.value)}
        />
        <MarkdownEditor
          label="本文"
          value={bodyMarkdown}
          onValueChange={setBodyMarkdown}
          rows={16}
          onImageUpload={uploadImage}
        />
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? '作成しています…' : '作成する'}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
