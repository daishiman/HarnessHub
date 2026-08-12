'use client';

import type { FeedbackDetail as FeedbackDetailDto, FeedbackStatus } from '@harness-hub/schemas';
import {
  Alert,
  DefinitionList,
  LiveStatus,
  Panel,
  ScreenHeader,
  Select,
  Stack,
  StatusChip,
  TagRow,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { feedbackPriorityLabels, feedbackSourceLabels, feedbackTypeLabels } from '../feedback-labels.js';
import { ProjectReference, useProjectDirectory } from '../project-directory.js';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/feedback/${id}`, {
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('フィードバックを取得できませんでした。');
      setFeedback((await response.json()) as FeedbackDetailDto);
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'フィードバックを取得できませんでした。');
    }
  }, [id, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const { projectById, error: projectError } = useProjectDirectory(tenantId, workspaceId);

  const patchStatus = async (status: FeedbackStatus): Promise<void> => {
    setSaving(true);
    setActionError(null);
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
      setActionError(cause instanceof Error ? cause.message : '状態を変更できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const listHref = `/feedback?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`;

  if (feedback === null) {
    return (
      <article>
        <ScreenHeader
          title="フィードバック詳細"
          breadcrumbs={[{ href: listHref, label: '改善要望' }, { label: '詳細' }]}
          breadcrumbsLabel="現在地"
          sticky
        />
        {loadError === null ? (
          <LiveStatus>フィードバックを読み込み中です。</LiveStatus>
        ) : (
          <Alert tone="danger" title="読み込みエラー" description={loadError} />
        )}
      </article>
    );
  }

  const options = nextStatusOptions(feedback.status);

  return (
    <article>
      <ScreenHeader
        title={feedback.code}
        breadcrumbs={[
          {
            href: listHref,
            label: '改善要望',
          },
          { label: feedback.code },
        ]}
        breadcrumbsLabel="現在地"
        sticky
        tags={
          <TagRow>
            <StatusChip domain="feedback" status={feedback.status} />
          </TagRow>
        }
      />

      <Stack gap={4}>
        {loadError === null ? null : <Alert tone="danger" title="更新エラー" description={loadError} />}
        {actionError === null ? null : <Alert tone="danger" title="操作エラー" description={actionError} />}
        {projectError === null ? null : (
          <Alert
            tone="warning"
            title="プロジェクト名を読み込めませんでした"
            description="報告内容はそのまま表示し、対象プロジェクトは識別子で示しています。"
          />
        )}

        {/* 属性は「ラベル: 値 / ラベル: 値」を 1 行に詰めていたため、
            どこまでが 1 項目か読み取りづらかった。対象が 1 件なので定義リストにする */}
        <Panel title="この報告について">
          <DefinitionList
            label="報告の属性"
            columns={2}
            items={[
              { term: '種別', description: feedbackTypeLabels[feedback.type] },
              { term: '優先度', description: feedbackPriorityLabels[feedback.priority] },
              { term: '受付経路', description: feedbackSourceLabels[feedback.source] },
              {
                term: '対象プロジェクト',
                description: (
                  <ProjectReference projectId={feedback.project_id} project={projectById.get(feedback.project_id)} />
                ),
                hint: '名称を主表示し、識別子は確認・コピー用に併記します。',
              },
            ]}
          />
        </Panel>

        <Panel title="報告内容">
          <section aria-label="報告内容">
            <MarkdownView content={feedback.body} />
          </section>
        </Panel>

        <Panel title="AI からの応答">
          <section aria-label="AI 応答">
            {feedback.ai_response === null ? (
              <p style={{ margin: 0 }}>まだ応答はありません。届き次第この欄に表示されます。</p>
            ) : (
              <MarkdownView content={feedback.ai_response} />
            )}
          </section>
        </Panel>

        {feedback.can_manage && options.length > 0 ? (
          <Panel title="管理者操作" description="この報告の状態を次の段階へ進められます。">
            {/* landmark として拾えるよう aside は残す。見出しは Panel 側が出す */}
            <aside aria-label="管理者操作">
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
          </Panel>
        ) : null}
      </Stack>
    </article>
  );
}
