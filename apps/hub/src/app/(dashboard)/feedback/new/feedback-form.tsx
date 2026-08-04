'use client';

import type { CreateFeedbackRequest, CreateFeedbackResponse } from '@harness-hub/schemas';
import { Alert, Button, Select, StatusChip, Textarea, TextInput } from '@harness-hub/ui';
import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';

interface FeedbackFormProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

const INITIAL_FORM: CreateFeedbackRequest = {
  project_id: '',
  type: 'improvement',
  priority: 'medium',
  body: '',
};

function requiredText(value: string): boolean {
  return value.trim().length > 0;
}

export function FeedbackForm({ tenantId, workspaceId }: FeedbackFormProps): ReactNode {
  const [form, setForm] = useState<CreateFeedbackRequest>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateFeedbackResponse | null>(null);

  const canSubmit = requiredText(form.project_id) && requiredText(form.body);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/feedback', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('送信できませんでした。入力内容と接続を確認してください。');
      const body = (await response.json()) as CreateFeedbackResponse;
      setCreated(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '送信できませんでした。');
    } finally {
      setSubmitting(false);
    }
  };

  if (created !== null) {
    return (
      <section aria-live="polite" aria-labelledby="receipt-heading">
        <h2 id="receipt-heading">受付が完了しました</h2>
        <Alert
          tone="success"
          title={created.code}
          description="AI 応答の生成をキューへ登録しました。完了を待たずに別の作業へ移れます。"
        />
        <p>
          状態: <StatusChip domain="feedback" status={created.status} />
        </p>
        <p>
          <a href={`/feedback/${created.id}?tenant=${tenantId}&workspace=${workspaceId}`}>詳細を見る</a>
          {' / '}
          <button type="button" onClick={() => setCreated(null)}>
            続けて報告
          </button>
        </p>
      </section>
    );
  }

  return (
    <form aria-label="改善要望フォーム" onSubmit={(event) => void submit(event)}>
      {error === null ? null : <Alert tone="danger" title="送信エラー" description={error} />}
      <TextInput
        label="プロジェクト ID"
        value={form.project_id}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setForm((current) => ({ ...current, project_id: event.target.value }))
        }
        required
      />
      <Select
        label="種別"
        value={form.type}
        onChange={(event) =>
          setForm((current) => ({ ...current, type: event.target.value as CreateFeedbackRequest['type'] }))
        }
        options={[
          { value: 'improvement', label: '改善要望' },
          { value: 'review', label: 'レビュー' },
          { value: 'bug', label: '不具合' },
        ]}
      />
      <Select
        label="優先度"
        value={form.priority}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            priority: event.target.value as CreateFeedbackRequest['priority'],
          }))
        }
        options={[
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ]}
      />
      <Textarea
        label="内容"
        description="具体的な要望・レビュー内容・不具合の再現手順などを記入してください。"
        value={form.body}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          setForm((current) => ({ ...current, body: event.target.value }))
        }
        required
      />
      <Button type="submit" disabled={submitting || !canSubmit}>
        送信する
      </Button>
    </form>
  );
}
