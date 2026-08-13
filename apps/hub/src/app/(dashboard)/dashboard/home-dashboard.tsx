'use client';

import { ActionLink, ListState, Panel, Stack, StatusChip } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { DateTimeText } from '../../../components/format/date-time-text.js';
import { extractApiErrorMessage } from '../../../features/home-dashboard/client-error.js';
import type { HomeSummaryResponse } from '../../../features/home-dashboard/dto.js';

interface HomeDashboardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

interface TimelineEntry {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly meta: ReactNode;
  readonly updatedAt: number;
}

/**
 * 3 機能の recent_items を「最近の動き」1本のタイムラインへ束ねる。
 * builds には詳細画面が無い (工程ボードが唯一の画面) ため、遷移先はボードにする。
 */
function buildTimeline(scope: string, summary: HomeSummaryResponse): readonly TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...(summary.sheets.visible ? summary.sheets.recent_items : []).map((item) => ({
      key: `sheet-${item.id}`,
      href: `/sheets/${item.id}${scope}`,
      label: `${item.code} ${item.title}`,
      meta: <StatusChip domain="sheet" status={item.status} />,
      updatedAt: item.updated_at,
    })),
    ...(summary.feedback.visible ? summary.feedback.recent_items : []).map((item) => ({
      key: `feedback-${item.id}`,
      href: `/feedback/${item.id}${scope}`,
      label: `${item.code}`,
      meta: <StatusChip domain="feedback" status={item.status} />,
      updatedAt: item.updated_at,
    })),
    ...(summary.builds.visible ? summary.builds.recent_items : []).map((item) => ({
      key: `build-${item.id}`,
      href: `/builds${scope}`,
      label: item.title,
      meta: <StatusChip domain="buildStage" status={item.stage} />,
      updatedAt: item.updated_at,
    })),
  ];
  return entries.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
}

export function HomeDashboard({ tenantId, workspaceId }: HomeDashboardProps): ReactNode {
  const [summary, setSummary] = useState<HomeSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/dashboard/summary', {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error(await extractApiErrorMessage(response, 'ホームの情報を取得できませんでした。'));
      setSummary((await response.json()) as HomeSummaryResponse);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ホームの情報を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const scope = `?tenant=${tenantId}&workspace=${workspaceId}`;

  // 権限が無い機能は home からも省く。0 として出すと「あなたの分は 0 件」に見えてしまい、
  // 実際には他人のシートが隠れているだけの状態(権限混入の言い換え)になる。
  const sections =
    summary === null
      ? []
      : (
          [
            { key: 'sheets', label: 'ヒアリングシート', section: summary.sheets, href: `/sheets${scope}` },
            { key: 'feedback', label: '改善要望', section: summary.feedback, href: `/feedback${scope}` },
            { key: 'builds', label: '構築案件', section: summary.builds, href: `/builds${scope}` },
          ] as const
        ).filter((row) => row.section.visible);

  const totalActionable = sections.reduce((sum, row) => sum + row.section.actionable_count, 0);
  const timeline = summary === null ? [] : buildTimeline(scope, summary);

  return (
    <ListState error={error} onRetry={() => void load()} loading={loading} isEmpty={summary === null && !loading}>
      {summary === null ? null : (
        <Stack gap={5}>
          <Panel title="要対応" description="放置すると業務が止まるものだけを挙げます。" headingLevel={2}>
            {totalActionable === 0 ? (
              <p>いま対応が必要なものはありません。順調です。</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
                {sections
                  .filter((row) => row.section.actionable_count > 0)
                  .map((row) => (
                    <li key={row.key}>
                      <a href={row.href}>
                        {row.label}: {row.section.actionable_count}件が対応待ちです
                      </a>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>

          <Panel title="業務を始める" description="いつもの画面へ移動します。" headingLevel={2}>
            <Stack direction="horizontal" gap={3}>
              <ActionLink href={`/sheets/new${scope}`} variant="primary">
                ヒアリングシートを新しく作成
              </ActionLink>
              <ActionLink href={`/catalog${scope}`} variant="secondary">
                業務ツール
              </ActionLink>
              <ActionLink href={`/docs${scope}`} variant="secondary">
                ドキュメント
              </ActionLink>
              <ActionLink href={`/feedback${scope}`} variant="secondary">
                改善要望
              </ActionLink>
            </Stack>
          </Panel>

          <Panel title="最近の動き" headingLevel={2}>
            {timeline.length === 0 ? (
              <p>まだ動きはありません。</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
                {timeline.map((entry) => (
                  <li key={entry.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <a href={entry.href}>{entry.label}</a>
                    <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {entry.meta}
                      <DateTimeText value={entry.updatedAt} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </Stack>
      )}
    </ListState>
  );
}
