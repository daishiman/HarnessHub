'use client';

import type { DocumentListItem, DocumentListResponse, DocumentScope, DocumentStatus } from '@harness-hub/schemas';
import { Alert, Button, DataTable, ScopeChip, Select, StatusChip } from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

interface DocumentListProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

interface DocumentFilters {
  readonly scope: DocumentScope | '';
  readonly status: DocumentStatus | '';
}

const EMPTY_FILTERS: DocumentFilters = { scope: '', status: '' };

export function DocumentList({ tenantId, workspaceId }: DocumentListProps): ReactNode {
  const [rows, setRows] = useState<readonly DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<DocumentFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<readonly (string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: '25' });
      if (filters.scope !== '') query.set('scope', filters.scope);
      if (filters.status !== '') query.set('status', filters.status);
      if (cursor !== null) query.set('cursor', cursor);
      const response = await fetch(`/api/v1/docs?${query.toString()}`, {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error('一覧を取得できませんでした。');
      const body = (await response.json()) as DocumentListResponse;
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
        render: (row: DocumentListItem) => <StatusChip domain="document" status={row.status} />,
      },
      {
        key: 'scope',
        header: 'スコープ',
        render: (row: DocumentListItem) => (
          <ScopeChip
            scope={row.scope === 'common' ? 'common' : 'tenant'}
            name={row.scope === 'common' ? '共通' : 'テナント'}
          />
        ),
      },
      {
        key: 'title',
        header: 'タイトル',
        render: (row: DocumentListItem) => (
          <a href={`/docs/${row.id}?tenant=${tenantId}&workspace=${workspaceId}`}>{row.title}</a>
        ),
        value: (row: DocumentListItem) => row.title,
      },
      {
        key: 'updated',
        header: '更新日',
        value: (row: DocumentListItem) => new Date(row.updated_at).toLocaleDateString('ja-JP'),
      },
    ],
    [tenantId, workspaceId],
  );

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    setFilters({ scope: draftFilters.scope, status: draftFilters.status });
  };

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="読み込みエラー" description={error} />}
      <form aria-label="ドキュメントの絞り込み" onSubmit={applyFilters}>
        <Select
          label="スコープ"
          value={draftFilters.scope}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, scope: event.target.value as DocumentScope | '' }))
          }
          options={[
            { value: '', label: 'すべて' },
            { value: 'common', label: '共通' },
            { value: 'tenant', label: 'テナント' },
          ]}
        />
        <Select
          label="状態"
          value={draftFilters.status}
          onChange={(event) =>
            setDraftFilters((current) => ({ ...current, status: event.target.value as DocumentStatus | '' }))
          }
          options={[
            { value: '', label: 'すべて' },
            { value: 'draft', label: '下書き' },
            { value: 'published', label: '公開済み' },
          ]}
        />
        <Button type="submit">絞り込む</Button>
      </form>
      <DataTable
        caption="ドキュメント一覧"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="ドキュメントはまだありません。"
      />
      <nav aria-label="ドキュメント一覧のページ送り">
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
