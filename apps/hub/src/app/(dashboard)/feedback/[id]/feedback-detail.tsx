'use client';

import type { FeedbackDetail as FeedbackDetailDto, FeedbackStatus } from '@harness-hub/schemas';
import { Alert, Select, StatusChip } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

const MarkdownView = dynamic(() => import('@harness-hub/ui').then((module) => module.MarkdownView), {
  loading: () => <p aria-live="polite">本文を読み込んでいます…</p>,
});

interface FeedbackDetailProps {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
}

const headers = (tenantId: string, workspaceId: string) => ({
  'content-type': 'application/json',
  'x-harness-tenant-id': tenantId,
  'x-harness-workspace-id': workspaceId,
});

/**
 * `open → in_progress` / `in_progress → resolved` の隣接遷移だけを選択肢として提示する (SEC6)。
 * 実際の遷移可否検証は API 層 (isValidFeedbackStatusTransition) が正本であり、ここは UI 側の親切表示に過ぎない。
 */
function nextStatusOptions(status: FeedbackStatus): readonly { value: FeedbackStatus; label: string }[] {
  if (status === 'open') return [{ value: 'in_progress', label: '対応中にする' }];
  if (status === 'in_progress') return [{ value: 'resolved', label: '対応済みにする' }];
  return [];
}

export function FeedbackDetail({ id, tenantId, workspaceId }: FeedbackDetailProps): ReactNode {
  const [feedback, setFeedback] = useState<FeedbackDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/feedback/${id}`, {
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('フィードバックを取得できませんでした。');
      setFeedback((await response.json()) as FeedbackDetailDto);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'フィードバックを取得できませんでした。');
    }
  }, [id, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchStatus = async (status: FeedbackStatus): Promise<void> => {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/feedback/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('状態を変更できませんでした。');
      setFeedback((await response.json()) as FeedbackDetailDto);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '状態を変更できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  if (error !== null && feedback === null) return <Alert tone="danger" title="読み込みエラー" description={error} />;
  if (feedback === null) return <p aria-live="polite">読み込み中です…</p>;

  const options = nextStatusOptions(feedback.status);

  return (
    <article>
      {error === null ? null : <Alert tone="danger" title="操作エラー" description={error} />}
      <header>
        <h1>{feedback.code}</h1>
        <p aria-live="polite">
          <StatusChip domain="feedback" status={feedback.status} />
        </p>
        <p>
          種別: {feedback.type} / 優先度: {feedback.priority} / プロジェクト: {feedback.project_id} / 経路:{' '}
          {feedback.source}
        </p>
      </header>

      <section aria-label="報告内容">
        <h2>報告内容</h2>
        <MarkdownView content={feedback.body} />
      </section>

      <section aria-label="AI 応答">
        <h2>AI からの応答</h2>
        {feedback.ai_response === null ? (
          <p>まだ応答はありません。</p>
        ) : (
          <MarkdownView content={feedback.ai_response} />
        )}
      </section>

      {feedback.can_manage && options.length > 0 ? (
        <aside aria-label="管理者操作">
          <h2>管理者操作</h2>
          <Select
            label="状態を進める"
            value=""
            onChange={(event) => {
              if (event.target.value === '') return;
              void patchStatus(event.target.value as FeedbackStatus);
            }}
            options={[{ value: '', label: '選択してください' }, ...options]}
            disabled={saving}
          />
        </aside>
      ) : null}
    </article>
  );
}
