'use client';

import type { FeedbackListItem, FeedbackListResponse, FeedbackStatus, FeedbackType } from '@harness-hub/schemas';
import { Alert, Button, DataTable, Select, StatusChip } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

interface FeedbackListProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

interface FeedbackFilters {
  readonly status: FeedbackStatus | '';
  readonly type: FeedbackType | '';
}

const EMPTY_FILTERS: FeedbackFilters = { status: '', type: '' };

export function FeedbackList({ tenantId, workspaceId }: FeedbackListProps): ReactNode {
  const [rows, setRows] = useState<readonly FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<FeedbackFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<FeedbackFilters>(EMPTY_FILTERS);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<readonly (string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '25' });
      if (filters.status !== '') query.set('status', filters.status);
      if (filters.type !== '') query.set('type', filters.type);
      if (cursor !== null) query.set('cursor', cursor);
      const response = await fetch(`/api/v1/feedback?${query.toString()}`, {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error('一覧を取得できませんでした。');
      const body = (await response.json()) as FeedbackListResponse;
      setRows(body.items);
      setNextCursor(body.next_cursor);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '一覧を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [cursor, filters, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        key: 'status',
        header: '状態',
        render: (row: FeedbackListItem) => (
          <span aria-live="polite">
            <StatusChip domain="feedback" status={row.status} />
          </span>
        ),
      },
      {
        key: 'code',
        header: 'FR コード',
        render: (row: FeedbackListItem) => (
          <a href={`/feedback/${row.id}?tenant=${tenantId}&workspace=${workspaceId}`}>{row.code}</a>
        ),
        value: (row: FeedbackListItem) => row.code,
      },
      { key: 'type', header: '種別', value: (row: FeedbackListItem) => row.type },
      { key: 'priority', header: '優先度', value: (row: FeedbackListItem) => row.priority },
      { key: 'project', header: 'プロジェクト', value: (row: FeedbackListItem) => row.project_id },
      { key: 'source', header: '経路', value: (row: FeedbackListItem) => row.source },
      {
        key: 'updated',
        header: '更新日',
        value: (row: FeedbackListItem) => new Date(row.updated_at).toLocaleDateString('ja-JP'),
      },
    ],
    [tenantId, workspaceId],
  );

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    setFilters(draftFilters);
  };

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="読み込みエラー" description={error} />}
      <form aria-label="フィードバックの絞り込み" onSubmit={applyFilters}>
        <Select
          label="状態"
          value={draftFilters.status}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              status: event.target.value as FeedbackStatus | '',
            }))
          }
          options={[
            { value: '', label: 'すべて' },
            { value: 'open', label: '未対応' },
            { value: 'in_progress', label: '対応中' },
            { value: 'resolved', label: '対応済み' },
          ]}
        />
        <Select
          label="種別"
          value={draftFilters.type}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              type: event.target.value as FeedbackType | '',
            }))
          }
          options={[
            { value: '', label: 'すべて' },
            { value: 'improvement', label: '改善要望' },
            { value: 'review', label: 'レビュー' },
            { value: 'bug', label: '不具合' },
          ]}
        />
        <Button type="submit">絞り込む</Button>
      </form>
      <DataTable
        caption="改善要望フィードバック一覧"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="フィードバックはまだありません。"
      />
      <nav aria-label="フィードバック一覧のページ送り">
        <Button
          type="button"
          variant="secondary"
          disabled={loading || cursorHistory.length === 0}
          onClick={() => {
            const previous = cursorHistory.at(-1);
            setCursor(previous ?? null);
            setCursorHistory((current) => current.slice(0, -1));
          }}
        >
          前へ
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || nextCursor === null}
          onClick={() => {
            setCursorHistory((current) => [...current, cursor]);
            setCursor(nextCursor);
          }}
        >
          次へ
        </Button>
      </nav>
    </>
  );
}
