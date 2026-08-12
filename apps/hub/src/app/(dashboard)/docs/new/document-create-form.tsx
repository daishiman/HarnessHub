'use client';

import type { DocumentDetail, DocumentScope } from '@harness-hub/schemas';
import { Alert, Button, type MarkdownImageUploadResult, Select, Stack, TextInput } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type FormEvent, type ReactNode, useCallback, useRef, useState } from 'react';

const MarkdownEditor = dynamic(() => import('@harness-hub/ui').then((module) => module.MarkdownEditor), {
  loading: () => <p aria-live="polite">Markdown エディタを読み込んでいます…</p>,
});

interface DocumentCreateFormProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

export function DocumentCreateForm({ tenantId, workspaceId }: DocumentCreateFormProps): ReactNode {
  const [scope, setScope] = useState<DocumentScope>('tenant');
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
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
      if (!response.ok) throw new Error('作成できませんでした。');
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
      if (!response.ok) throw new Error('画像をアップロードできませんでした。');
      const uploaded = (await response.json()) as { readonly url: string };
      return { url: uploaded.url };
    },
    [ensureDraftId, tenantId, workspaceId],
  );

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    try {
      // 画像追加のタイミングで下書きが既にできているなら、それを更新する
      // (ここで新規作成すると、画像だけが古い下書きに残ったまま孤立する)
      const created =
        draftIdRef.current === null
          ? await createDocument({ scope, title, body_markdown: bodyMarkdown })
          : await (async () => {
              const response = await fetch(`/api/v1/docs/${draftIdRef.current}`, {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: {
                  'content-type': 'application/json',
                  'x-harness-tenant-id': tenantId,
                  'x-harness-workspace-id': workspaceId,
                },
                body: JSON.stringify({ title, body_markdown: bodyMarkdown }),
              });
              if (!response.ok) throw new Error('作成できませんでした。');
              return (await response.json()) as DocumentDetail;
            })();
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
          options={[
            { value: 'tenant', label: 'テナント' },
            { value: 'common', label: '共通 (要 provider-admin 権限)' },
          ]}
        />
        <TextInput label="タイトル" value={title} onChange={(event) => setTitle(event.target.value)} />
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
