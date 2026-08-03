'use client';

import type { DocumentDetail, DocumentScope } from '@harness-hub/schemas';
import { Alert, Button, Select, TextInput } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type FormEvent, type ReactNode, useState } from 'react';

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
        body: JSON.stringify({ scope, title, body_markdown: bodyMarkdown }),
      });
      if (!response.ok) throw new Error('作成できませんでした。');
      const created = (await response.json()) as DocumentDetail;
      window.location.assign(`/docs/${created.id}?tenant=${tenantId}&workspace=${workspaceId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '作成できませんでした。');
      setSaving(false);
    }
  };

  return (
    <form aria-label="ドキュメントの新規作成" onSubmit={(event) => void submit(event)}>
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
      <MarkdownEditor label="本文" value={bodyMarkdown} onValueChange={setBodyMarkdown} rows={16} />
      <Button type="submit" disabled={saving}>
        作成する
      </Button>
    </form>
  );
}
