'use client';

import type { DocumentDetail, DocumentScope } from '@harness-hub/schemas';
import { Alert, Button, Select, Stack, TextInput } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type FormEvent, type ReactNode, useState } from 'react';
import { extractErrorMessage } from '../../../../features/docs-cms/client-errors.js';
import { parseTagsInput, publishAtInputToEpochMs } from '../../../../features/docs-cms/form-fields.js';

const MarkdownEditor = dynamic(() => import('@harness-hub/ui').then((module) => module.MarkdownEditor), {
  loading: () => <p aria-live="polite">Markdown エディタを読み込んでいます…</p>,
});

interface DocumentCreateFormProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /** `docs.write_common` を持つ role のときだけ「共通」スコープを選べる。 */
  readonly canWriteCommon: boolean;
}

export function DocumentCreateForm({ tenantId, workspaceId, canWriteCommon }: DocumentCreateFormProps): ReactNode {
  const [scope, setScope] = useState<DocumentScope>('tenant');
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [eyecatchImageUrl, setEyecatchImageUrl] = useState('');
  const [publishAtInput, setPublishAtInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/v1/docs', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          scope,
          title,
          body_markdown: bodyMarkdown,
          category: category.trim().length > 0 ? category.trim() : null,
          tags: parseTagsInput(tagsInput),
          eyecatch_image_url: eyecatchImageUrl.trim().length > 0 ? eyecatchImageUrl.trim() : null,
          publish_at: publishAtInputToEpochMs(publishAtInput),
        }),
      });
      if (!response.ok) throw new Error(await extractErrorMessage(response, '作成できませんでした。'));
      const created = (await response.json()) as DocumentDetail;
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
                  { value: 'common', label: '共通 (要 provider-admin 権限)' },
                ]
              : [{ value: 'tenant', label: 'テナント' }]
          }
        />
        <TextInput label="タイトル" value={title} onChange={(event) => setTitle(event.target.value)} />
        <TextInput
          label="分類"
          description="1つだけ選べます (例: release-note)。空欄のままなら未分類として保存されます。"
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
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? '作成しています…' : '作成する'}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
