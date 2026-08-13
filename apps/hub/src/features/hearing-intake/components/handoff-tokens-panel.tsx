'use client';

import type {
  HearingShareTokenAudience,
  HearingShareTokenListItem,
  IssueHearingShareTokenResponse,
} from '@harness-hub/schemas';
import { Alert, Button, DataTable, type DataTableColumn, Panel, Stack, Textarea } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { DateTimeText } from '../../../components/format/date-time-text.js';
import type { HearingSharePanelProps } from './screenshots-panel.js';

const ConfirmDialog = dynamic(() => import('@harness-hub/ui').then((module) => module.ConfirmDialog));

const AUDIENCE_OPTIONS: readonly { readonly value: HearingShareTokenAudience; readonly label: string }[] = [
  { value: 'harness_creator', label: 'HarnessCreator 向け' },
  { value: 'system_orchestrator', label: 'システム開発向け' },
];

const AUDIENCE_LABELS: Readonly<Record<HearingShareTokenAudience, string>> = {
  harness_creator: 'HarnessCreator 向け',
  system_orchestrator: 'システム開発向け',
};

const tenantHeaders = (tenantId: string, workspaceId: string) => ({
  'x-harness-tenant-id': tenantId,
  'x-harness-workspace-id': workspaceId,
});

export type HearingShareTokenState = '有効' | '期限切れ' | '失効済み';

export function hearingShareTokenState(row: HearingShareTokenListItem, now = Date.now()): HearingShareTokenState {
  if (row.revoked_at !== null) return '失効済み';
  return row.expires_at <= now ? '期限切れ' : '有効';
}

/** 発行応答に一度だけ含まれる、トークン付き指示文のコピー領域。 */
function IssuedTokenBlock({ issued }: { readonly issued: IssueHearingShareTokenResponse }): ReactNode {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const copy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(issued.instruction_text);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2_000);
    } catch {
      setCopyState('error');
    }
  }, [issued.instruction_text]);

  return (
    <section aria-label="発行された引き渡しリンク">
      <Alert
        tone="warning"
        title="このリンクは今だけ表示されます"
        description="安全のため、トークンを含む指示文は再表示できません。今すぐコピーして Claude Code に貼り付けてください。"
      />
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 'var(--hh-space-3)',
          justifyContent: 'space-between',
          margin: 'var(--hh-space-2) 0',
        }}
      >
        <h4 style={{ margin: 0 }}>{AUDIENCE_LABELS[issued.audience]} の指示文</h4>
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copyState === 'copied' ? 'コピーしました' : 'コピー'}
        </Button>
      </div>
      {copyState === 'error' ? (
        <Alert
          tone="danger"
          title="コピーに失敗しました"
          description="クリップボードへアクセスできません。下のテキストを選択して手動でコピーしてください。"
        />
      ) : null}
      {/* 共通の Textarea に寄せる。素の <textarea> を書き起こしていたぶん見た目が
          他の入力欄とずれていたうえ、ラベルが無く支援技術から名前を読めなかった。 */}
      <Textarea label="引き継ぎ指示文" hideLabel readOnly value={issued.instruction_text} rows={6} />
    </section>
  );
}

/** Claude Code 用の期限付き共有リンクを発行・失効するパネル。 */
export function HandoffTokensPanel({ id: sheetId, tenantId, workspaceId }: HearingSharePanelProps): ReactNode {
  const [audience, setAudience] = useState<HearingShareTokenAudience>('harness_creator');
  const [tokens, setTokens] = useState<readonly HearingShareTokenListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssueHearingShareTokenResponse | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<HearingShareTokenListItem | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/sheets/${sheetId}/handoff-tokens`, {
        credentials: 'same-origin',
        headers: tenantHeaders(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('引き渡しリンクの一覧を取得できませんでした。');
      const body = (await response.json()) as { items: readonly HearingShareTokenListItem[] };
      setTokens(body.items);
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : '引き渡しリンクの一覧を取得できませんでした。');
    }
  }, [sheetId, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const issue = async (): Promise<void> => {
    setIssuing(true);
    setOperationError(null);
    try {
      const response = await fetch(`/api/v1/sheets/${sheetId}/handoff-tokens`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { ...tenantHeaders(tenantId, workspaceId), 'content-type': 'application/json' },
        body: JSON.stringify({ audience }),
      });
      if (!response.ok) throw new Error('引き渡しリンクを発行できませんでした。');
      setIssued((await response.json()) as IssueHearingShareTokenResponse);
      await load();
    } catch (cause) {
      setOperationError(cause instanceof Error ? cause.message : '引き渡しリンクを発行できませんでした。');
    } finally {
      setIssuing(false);
    }
  };

  const revoke = async (target: HearingShareTokenListItem): Promise<void> => {
    setRevokeTarget(null);
    setOperationError(null);
    try {
      const response = await fetch(`/api/v1/sheets/${sheetId}/handoff-tokens/${target.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { ...tenantHeaders(tenantId, workspaceId), 'content-type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error('引き渡しリンクを無効化できませんでした。');
      if (issued?.id === target.id) setIssued(null);
      await load();
    } catch (cause) {
      setOperationError(cause instanceof Error ? cause.message : '引き渡しリンクを無効化できませんでした。');
    }
  };

  const columns: readonly DataTableColumn<HearingShareTokenListItem>[] = [
    { key: 'audience', header: '向け先', render: (row) => AUDIENCE_LABELS[row.audience] },
    { key: 'expires_at', header: '有効期限', render: (row) => <DateTimeText value={row.expires_at} /> },
    {
      key: 'last_accessed_at',
      header: '最終アクセス',
      render: (row) => (row.last_accessed_at === null ? '未アクセス' : <DateTimeText value={row.last_accessed_at} />),
    },
    { key: 'access_count', header: 'アクセス回数', value: (row) => row.access_count },
    { key: 'status', header: '状態', render: (row) => hearingShareTokenState(row) },
    {
      key: 'actions',
      header: '操作',
      render: (row) =>
        hearingShareTokenState(row) === '有効' ? (
          <Button type="button" variant="secondary" onClick={() => setRevokeTarget(row)}>
            無効化
          </Button>
        ) : null,
    },
  ];

  return (
    <Panel
      title="Claude Code への引き渡し"
      description="期限付きリンクと貼り付け用の指示文を発行します。利用状況を確認でき、期限前でも無効化できます。"
    >
      <Stack gap={4}>
        {loadError === null ? null : <Alert tone="danger" title="読み込みエラー" description={loadError} />}
        {operationError === null ? null : <Alert tone="danger" title="操作エラー" description={operationError} />}

        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
          <legend style={{ fontSize: 'var(--hh-font-size-md)', marginBottom: 'var(--hh-space-2)', padding: 0 }}>
            向け先
          </legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--hh-space-2)' }}>
            {AUDIENCE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={audience === option.value ? 'primary' : 'secondary'}
                aria-pressed={audience === option.value}
                onClick={() => setAudience(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <Button type="button" onClick={() => void issue()} disabled={issuing}>
          {issuing ? '発行中…' : '引き渡しリンクを発行'}
        </Button>

        {issued === null ? null : <IssuedTokenBlock issued={issued} />}

        <DataTable
          caption="発行済みの引き渡しリンク"
          columns={columns}
          rows={tokens}
          rowKey={(row) => row.id}
          emptyMessage="まだ引き渡しリンクは発行されていません。"
        />

        <ConfirmDialog
          open={revokeTarget !== null}
          title="引き渡しリンクを無効化しますか？"
          description="無効化すると、このリンクからはヒアリング内容を取得できなくなります。元には戻せません。"
          reversible={false}
          confirmLabel="無効化する"
          cancelLabel="やめる"
          onConfirm={() => {
            if (revokeTarget !== null) void revoke(revokeTarget);
          }}
          onCancel={() => setRevokeTarget(null)}
        />
      </Stack>
    </Panel>
  );
}
