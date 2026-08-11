'use client';

import type { CreateFeedbackRequest, CreateFeedbackResponse } from '@harness-hub/schemas';
import { Alert, Button, Select, Stack, StatusChip, TagRow, Textarea } from '@harness-hub/ui';
import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import { useProjectDirectory } from '../project-directory.js';

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
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    reload: reloadProjects,
  } = useProjectDirectory(tenantId, workspaceId);

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
        <Stack gap={3}>
          <h2 id="receipt-heading" style={{ margin: 0 }}>
            受付が完了しました
          </h2>
          <Alert
            tone="success"
            title={`受付番号 ${created.code}`}
            description="AI からの返答を作成しています。完了を待たずに別の作業へ移れます。"
          />
          <TagRow label="受付した報告の状態">
            <StatusChip domain="feedback" status={created.status} />
          </TagRow>
          {/* 生の <button> だと見た目も押せる幅も画面ごとに変わるため、共通の Button に寄せる */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--hh-space-3)', alignItems: 'center' }}>
            <a href={`/feedback/${created.id}?tenant=${tenantId}&workspace=${workspaceId}`}>この報告の詳細を見る</a>
            <Button type="button" variant="secondary" onClick={() => setCreated(null)}>
              続けてもう 1 件報告する
            </Button>
          </div>
        </Stack>
      </section>
    );
  }

  return (
    <form aria-label="改善要望フォーム" onSubmit={(event) => void submit(event)}>
      <Stack gap={3}>
        {error === null ? null : <Alert tone="danger" title="送信エラー" description={error} />}
        {projectsError === null ? null : (
          <Alert
            tone="warning"
            title="プロジェクトを選択できません"
            description="一覧を再取得してから、対象プロジェクトを選んでください。入力済みの内容は保持されます。"
            action={
              <Button type="button" variant="secondary" onClick={() => void reloadProjects()}>
                再取得
              </Button>
            }
          />
        )}
        <Select
          label="対象プロジェクト"
          description="報告対象の業務ツールを名称で選びます。"
          value={form.project_id}
          onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          placeholder={projectsLoading ? 'プロジェクトを読み込み中…' : '選択してください'}
          disabled={projectsLoading || projectsError !== null || projects.length === 0}
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
            { value: 'review', label: 'レビュー依頼' },
            { value: 'bug', label: '不具合報告' },
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
        <div>
          <Button type="submit" disabled={submitting || !canSubmit}>
            {submitting ? '送信しています…' : '送信する'}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
