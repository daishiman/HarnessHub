'use client';

/**
 * 配色の利用状況 (provider-admin 限定)。
 *
 * 数えているのは「切り替えボタンが押された回数」ではなく、**利用者ごとの現在設定 1 行**。
 * 押した回数だと試し押しや選び直しが重複票になり、「実際に使っている人が多い配色」が
 * 分からなくなる。`user_settings` は利用者 1 人 1 行なので、1 人 = 1 票になる。
 *
 * API は人数・構成比・計測率だけを返す (個人を特定できる値は含まない)。
 */

import type { AppearanceUsageResponse } from '@harness-hub/schemas';
import { Alert, DataTable, LiveStatus, Panel, Stack } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

const PALETTE_LABELS: Readonly<Record<string, string>> = {
  gray: 'グレー',
  blue: 'ブルー',
  beige: 'ベージュ',
  green: 'グリーン',
  navy: 'ネイビー',
};

const THEME_LABELS: Readonly<Record<string, string>> = {
  system: '自動 (OS設定)',
  light: 'Light',
  dark: 'Dark',
};

const RESOLVED_LABELS: Readonly<Record<string, string>> = {
  light: 'Light',
  dark: 'Dark',
};

/** 未知の値でも「—」に潰さず生の値を出す。配色を増やした直後に集計が空欄になるのを避ける。 */
function label(table: Readonly<Record<string, string>>, value: string): string {
  return table[value] ?? value;
}

/** 構成比は小数第 4 位まで来るので、画面では 0.1% 刻みに丸める。 */
function percent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

interface UsageRow {
  readonly key: string;
  readonly name: string;
  readonly users: number;
  readonly share: number;
}

export function AppearanceUsagePanel({ tenantId }: { readonly tenantId: string }): ReactNode {
  const [usage, setUsage] = useState<AppearanceUsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/appearance-usage', {
        credentials: 'same-origin',
        headers: { 'x-harness-tenant-id': tenantId },
      });
      if (!response.ok) {
        throw new Error(
          response.status === 403 ? 'この画面を表示する権限がありません。' : '配色の利用状況を取得できませんでした。',
        );
      }
      setUsage((await response.json()) as AppearanceUsageResponse);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '配色の利用状況を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const paletteRows = useMemo(
    (): readonly UsageRow[] =>
      (usage?.by_palette ?? []).map((row) => ({
        key: row.palette,
        name: label(PALETTE_LABELS, row.palette),
        users: row.users,
        share: row.share,
      })),
    [usage],
  );

  const combinationRows = useMemo(
    (): readonly UsageRow[] =>
      (usage?.by_palette_theme ?? []).map((row) => ({
        key: `${row.palette}/${row.theme}`,
        name: `${label(PALETTE_LABELS, row.palette)} × ${label(THEME_LABELS, row.theme)}`,
        users: row.users,
        share: row.share,
      })),
    [usage],
  );

  const resolvedRows = useMemo(
    (): readonly UsageRow[] =>
      (usage?.by_resolved_theme ?? []).map((row) => ({
        key: row.resolved_theme,
        name: label(RESOLVED_LABELS, row.resolved_theme),
        users: row.users,
        share: row.share,
      })),
    [usage],
  );

  const columns = useMemo(
    () => [
      { key: 'name', header: '設定', value: (row: UsageRow) => row.name },
      { key: 'users', header: '人数', align: 'end' as const, value: (row: UsageRow) => row.users, sortable: true },
      {
        key: 'share',
        header: '構成比',
        align: 'end' as const,
        value: (row: UsageRow) => row.share,
        render: (row: UsageRow) => percent(row.share),
      },
    ],
    [],
  );

  if (loading) return <LiveStatus>配色の利用状況を読み込み中です。</LiveStatus>;
  if (error !== null || usage === null) {
    return (
      <Panel>
        <Alert tone="danger" title="表示できませんでした" description={error ?? '配色の利用状況がありません。'} />
      </Panel>
    );
  }

  return (
    <Stack gap={4}>
      <Panel
        title="計測の範囲"
        description="外観を一度でも保存した利用者だけが分母に入ります。未保存の利用者は既定の配色で表示されていますが、選んだ結果ではないため数えません。"
      >
        <dl style={{ display: 'grid', gap: 'var(--hh-space-2)', margin: 0 }}>
          <div>
            <dt style={{ fontSize: 'var(--hh-font-size-sm)', color: 'var(--hh-color-text-muted)' }}>利用者数</dt>
            <dd style={{ margin: 0 }}>{usage.total_users} 人</dd>
          </div>
          <div>
            <dt style={{ fontSize: 'var(--hh-font-size-sm)', color: 'var(--hh-color-text-muted)' }}>計測できた人数</dt>
            <dd style={{ margin: 0 }}>{usage.measured_users} 人</dd>
          </div>
          <div>
            <dt style={{ fontSize: 'var(--hh-font-size-sm)', color: 'var(--hh-color-text-muted)' }}>計測率</dt>
            <dd style={{ margin: 0 }}>{percent(usage.measurement_rate)}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="配色ごとの採用">
        <DataTable
          caption="配色ごとの現在の採用人数と構成比"
          columns={columns}
          rows={paletteRows}
          rowKey={(row) => row.key}
          emptyMessage="まだ誰も外観を保存していません。"
          note="構成比の分母は「計測できた人数」です。"
        />
      </Panel>

      <Panel title="配色 × 明るさ">
        <DataTable
          caption="配色と明るさの組み合わせごとの採用人数と構成比"
          columns={columns}
          rows={combinationRows}
          rowKey={(row) => row.key}
          emptyMessage="まだ誰も外観を保存していません。"
          narrowAs="card-collection"
        />
      </Panel>

      <Panel title="実際の表示 (Light / Dark)">
        <DataTable
          caption="実際に表示されている明るさごとの人数と構成比"
          columns={columns}
          rows={resolvedRows}
          rowKey={(row) => row.key}
          emptyMessage="まだ誰も外観を保存していません。"
          note="「自動」を選んだ利用者は、保存時点の OS 設定でどちらかに数えられます。"
        />
      </Panel>
    </Stack>
  );
}
