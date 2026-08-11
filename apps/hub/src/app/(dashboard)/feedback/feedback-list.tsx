'use client';

import type {
  FeedbackListItem,
  FeedbackListResponse,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType,
} from '@harness-hub/schemas';
import {
  Alert,
  Button,
  CursorPager,
  DataTable,
  type DataTableColumn,
  FilterBar,
  ListState,
  LiveStatus,
  Select,
  StatusChip,
} from '@harness-hub/ui';
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { type AppliedFilter, AppliedFilterChips } from '../../../components/filter/applied-filter-chips.js';
import { formatDateTime } from '../../../lib/format/datetime.js';
import { FILTER_STORAGE_KEYS, useRememberedFilters } from '../../../lib/list/remembered-filters.js';
import { feedbackPriorityLabels, feedbackSourceLabels, feedbackTypeLabels } from './feedback-labels.js';
import { ProjectReference, useProjectDirectory } from './project-directory.js';

interface FeedbackListProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

interface FeedbackFilters {
  readonly status: FeedbackStatus | '';
  readonly type: FeedbackType | '';
}

const EMPTY_FILTERS: FeedbackFilters = { status: '', type: '' };

/**
 * 並べ替えの基準となる順序。
 *
 * 状態も優先度も、表示ラベルの五十音で並べると業務上の意味と食い違う
 * (「高・中・低」を五十音で並べても、急ぐものが上に来ない)。対応の順番に並ぶ数値を持たせる。
 */
const STATUS_ORDER: Readonly<Record<FeedbackStatus, number>> = { open: 0, in_progress: 1, resolved: 2 };
const PRIORITY_ORDER: Readonly<Record<FeedbackPriority, number>> = { high: 0, medium: 1, low: 2 };
const STATUS_LABELS: Readonly<Record<FeedbackStatus, string>> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '対応済み',
};

export function FeedbackList({ tenantId, workspaceId }: FeedbackListProps): ReactNode {
  const [rows, setRows] = useState<readonly FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 絞り込み条件は詳細画面へ行って戻るまで覚えておく (毎回入れ直させない)
  const {
    filters,
    draft: draftFilters,
    setDraft: setDraftFilters,
    apply,
    restored,
  } = useRememberedFilters<FeedbackFilters>(FILTER_STORAGE_KEYS.feedback, EMPTY_FILTERS);
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

  // 覚えていた条件の復元が済むまで待つ。先に問い合わせると、空の条件で取った一覧が
  // 一瞬出てから条件付きの一覧に差し替わり、件数が目の前で変わって見える
  useEffect(() => {
    if (!restored) return;
    void load();
  }, [load, restored]);

  const { projectById, error: projectError, reload: reloadProjects } = useProjectDirectory(tenantId, workspaceId);

  // 0 件のときの言い方を分ける。絞り込み結果の 0 件に「まだありません」は誤解を生む
  const hasFilters = filters.status !== '' || filters.type !== '';
  const appliedFilters: readonly AppliedFilter[] = [
    ...(filters.status === '' ? [] : [{ label: '状態', value: STATUS_LABELS[filters.status] }]),
    ...(filters.type === '' ? [] : [{ label: '種別', value: feedbackTypeLabels[filters.type] }]),
  ];

  const applyFilters = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setCursor(null);
    setCursorHistory([]);
    apply(draftFilters);
  };

  /**
   * 列の並びは「どの声か → 急ぐか → 何の話か → どこから来たか」。
   *
   * 広い画面を表にするのは、届いた声を上から順に処理していくときに
   * 「未対応で優先度が高いもの」を行どうしで見比べる必要があるため (型の割当は docs/screen-inventory.md)。
   * カード表示では見比べができない代わりに、1 件を読み切れることを採る。
   */
  const columns = useMemo<readonly DataTableColumn<FeedbackListItem>[]>(
    () => [
      {
        key: 'code',
        header: '受付番号',
        sortable: true,
        // 行を名指しする列。横スクロールしても「どの声の行か」を画面に残す
        sticky: true,
        width: '10rem',
        value: (row) => row.code,
        render: (row) => <a href={`/feedback/${row.id}?tenant=${tenantId}&workspace=${workspaceId}`}>{row.code}</a>,
      },
      {
        key: 'status',
        header: '状態',
        sortable: true,
        width: '9rem',
        value: (row) => STATUS_ORDER[row.status],
        render: (row) => <StatusChip domain="feedback" status={row.status} />,
        salience: 'lead',
      },
      {
        key: 'priority',
        header: '優先度',
        sortable: true,
        width: '7rem',
        value: (row) => PRIORITY_ORDER[row.priority],
        render: (row) => feedbackPriorityLabels[row.priority],
        salience: 'lead',
      },
      {
        key: 'type',
        header: '種別',
        sortable: true,
        width: '10rem',
        value: (row) => feedbackTypeLabels[row.type],
        salience: 'context',
      },
      {
        key: 'source',
        header: '受付経路',
        width: '12rem',
        value: (row) => feedbackSourceLabels[row.source],
        salience: 'metadata',
      },
      {
        key: 'project',
        header: '対象プロジェクト',
        width: '12rem',
        value: (row) => projectById.get(row.project_id)?.name ?? row.project_id,
        render: (row) => <ProjectReference projectId={row.project_id} project={projectById.get(row.project_id)} />,
        salience: 'metadata',
      },
      {
        key: 'updated',
        header: '更新日時',
        sortable: true,
        width: '13rem',
        // 並べ替えは元の値で行う。整形した文字列で比較すると年をまたいだ順序が崩れる
        value: (row) => row.updated_at,
        // 同じ日に状態が何度も動く要望があるため、日付だけでは前後が読めない
        render: (row) => formatDateTime(row.updated_at),
        salience: 'context',
      },
    ],
    [projectById, tenantId, workspaceId],
  );

  return (
    <>
      <FilterBar
        label="フィードバックの絞り込み"
        sticky
        appliedChips={appliedFilters.length === 0 ? undefined : <AppliedFilterChips items={appliedFilters} />}
        onSubmit={applyFilters}
        actions={<Button type="submit">絞り込む</Button>}
      >
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
            { value: 'review', label: 'レビュー依頼' },
            { value: 'bug', label: '不具合報告' },
          ]}
        />
      </FilterBar>
      <div style={{ padding: 'var(--hh-space-4)' }}>
        {projectError === null ? null : (
          <Alert
            tone="warning"
            title="プロジェクト名を読み込めませんでした"
            description="フィードバックは識別子で表示しています。内容の閲覧と絞り込みは続けられます。"
            action={
              <Button type="button" variant="secondary" onClick={() => void reloadProjects()}>
                名前を再取得
              </Button>
            }
          />
        )}
        {/* 読み込めなかったときに件数を読み上げない (0 件と失敗の取り違えを声でも起こさない) */}
        <LiveStatus>
          {error !== null
            ? 'フィードバックを読み込めませんでした。'
            : loading
              ? 'フィードバックを読み込んでいます。'
              : `${rows.length} 件のフィードバックを表示中`}
        </LiveStatus>

        {/* 取得失敗・0 件・一覧の出し分けは共通の ListState に任せる */}
        <ListState
          error={error}
          onRetry={() => void load()}
          loading={loading}
          isEmpty={rows.length === 0}
          emptyTitle={hasFilters ? '条件に合うフィードバックがありません' : 'フィードバックはまだ届いていません'}
          emptyDescription={
            hasFilters
              ? '絞り込みの条件をゆるめるか、条件を外してもう一度お試しください。'
              : '業務ツールから送られた声と、この画面から報告された声がここに集まります。'
          }
        >
          <DataTable
            caption="フィードバック一覧"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            loading={loading}
            stickyHeader
            narrowAs="card-collection"
            // 並べ替えは取得済みの 25 件の中だけで効く。全件が並ぶと誤解されると
            // 「上位が抜けている」と読まれてしまうため、範囲を先に断っておく
            note="並べ替えはこのページに表示中の分が対象です (広い画面では列の見出しから、狭い画面では並び替えの選択欄から操作できます)。"
          />
        </ListState>
      </div>

      <CursorPager
        label="フィードバック一覧"
        disabled={loading}
        canGoBack={cursorHistory.length > 0}
        canGoForward={nextCursor !== null}
        onBack={() => {
          const previous = cursorHistory.at(-1);
          setCursor(previous ?? null);
          setCursorHistory((current) => current.slice(0, -1));
        }}
        onForward={() => {
          setCursorHistory((current) => [...current, cursor]);
          setCursor(nextCursor);
        }}
      />
    </>
  );
}
