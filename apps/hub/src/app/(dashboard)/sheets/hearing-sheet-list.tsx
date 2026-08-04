'use client';

import type { HearingSheetStatus, SheetListItem, SheetListResponse } from '@harness-hub/schemas';
import { Alert, Button, DataTable, Select, StatusChip, TextInput } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface HearingSheetListProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

interface SheetFilters {
  readonly status: HearingSheetStatus | '';
  readonly department: string;
  readonly query: string;
}

const EMPTY_FILTERS: SheetFilters = { status: '', department: '', query: '' };

export function HearingSheetList({ tenantId, workspaceId }: HearingSheetListProps): ReactNode {
  const [rows, setRows] = useState<readonly SheetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<SheetFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<SheetFilters>(EMPTY_FILTERS);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<readonly (string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const previousStatuses = useRef(new Map<string, SheetListItem['status']>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '25' });
      if (filters.status !== '') query.set('status', filters.status);
      if (filters.department !== '') query.set('department', filters.department);
      if (filters.query !== '') query.set('q', filters.query);
      if (cursor !== null) query.set('cursor', cursor);
      const response = await fetch(`/api/v1/sheets?${query.toString()}`, {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error('一覧を取得できませんでした。');
      const body = (await response.json()) as SheetListResponse;
      const completed = body.items.find(
        (row) =>
          previousStatuses.current.get(row.id) === 'generating' &&
          (row.status === 'review' || row.status === 'completed'),
      );
      if (completed !== undefined) setCompletionNotice(`${completed.code} の生成が完了しました。`);
      previousStatuses.current = new Map(body.items.map((row) => [row.id, row.status]));
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

  useEffect(() => {
    if (!rows.some((row) => row.status === 'generating')) return;
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load, rows]);

  const columns = useMemo(
    () => [
      {
        key: 'status',
        header: '状態',
        render: (row: SheetListItem) => (
          <span aria-live="polite">
            <StatusChip domain="sheet" status={row.status} />
          </span>
        ),
      },
      {
        key: 'code',
        header: 'HS コード / 業務名',
        render: (row: SheetListItem) => (
          <a href={`/sheets/${row.id}?tenant=${tenantId}&workspace=${workspaceId}`}>
            {row.code} {row.title}
          </a>
        ),
        value: (row: SheetListItem) => `${row.code} ${row.title}`,
      },
      {
        key: 'domain',
        header: '領域 / 部署',
        value: (row: SheetListItem) => `${row.domain} / ${row.department ?? '—'}`,
      },
      { key: 'scale', header: '人数 / 工数', value: (row: SheetListItem) => `${row.people} 人 / ${row.hours} h` },
      { key: 'applicant', header: '申請者', value: (row: SheetListItem) => row.applicant.name },
      {
        key: 'updated',
        header: '更新日',
        value: (row: SheetListItem) => new Date(row.updated_at).toLocaleDateString('ja-JP'),
      },
    ],
    [tenantId, workspaceId],
  );

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    setFilters({
      status: draftFilters.status,
      department: draftFilters.department.trim(),
      query: draftFilters.query.trim(),
    });
  };

  return (
    <>
      {completionNotice === null ? null : <Alert tone="success" title="生成完了" description={completionNotice} />}
      {error === null ? null : <Alert tone="danger" title="読み込みエラー" description={error} />}
      <form aria-label="シートの絞り込み" onSubmit={applyFilters}>
        <Select
          label="状態"
          value={draftFilters.status}
          onChange={(event) =>
            setDraftFilters((current) => ({
              ...current,
              status: event.target.value as HearingSheetStatus | '',
            }))
          }
          options={[
            { value: '', label: 'すべて' },
            { value: 'received', label: '受付' },
            { value: 'generating', label: '生成中' },
            { value: 'review', label: 'レビュー待ち' },
            { value: 'completed', label: '完了' },
          ]}
        />
        <TextInput
          label="部署"
          value={draftFilters.department}
          onChange={(event) => setDraftFilters((current) => ({ ...current, department: event.target.value }))}
        />
        <TextInput
          label="全文検索"
          description="HS コード、業務名、業務領域などを検索します。"
          value={draftFilters.query}
          onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
        />
        <Button type="submit">絞り込む</Button>
      </form>
      <DataTable
        caption="ヒアリングシート一覧"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="ヒアリングシートはまだありません。"
      />
      <nav aria-label="シート一覧のページ送り">
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
