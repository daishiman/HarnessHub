'use client';

import type { HearingSheetStatus, SheetDetail } from '@harness-hub/schemas';
import {
  Alert,
  Button,
  DefinitionList,
  IdBadge,
  LiveStatus,
  Panel,
  ScreenHeader,
  Select,
  Stack,
  StatusChip,
  TagRow,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { DateTimeText } from '../../../../components/format/date-time-text.js';
import { HandoffTokensPanel } from '../../../../features/hearing-intake/components/handoff-tokens-panel.js';
import { ScreenshotsPanel } from '../../../../features/hearing-intake/components/screenshots-panel.js';
import {
  buildHarnessCreatorHandoff,
  buildSystemOrchestratorHandoff,
} from '../../../../features/hearing-intake/export-adapter/index.js';

const MarkdownView = dynamic(() => import('@harness-hub/ui').then((module) => module.MarkdownView), {
  loading: () => <p aria-live="polite">本文を読み込んでいます…</p>,
});
// 確認ダイアログは操作後にしか描画しないため、初期読み込みから外す (First Load JS 予算 120 KiB)。
// 同ファイルの MarkdownView と同じ遅延読み込みの型に揃えている。
const ConfirmDialog = dynamic(() => import('@harness-hub/ui').then((module) => module.ConfirmDialog));

interface HearingSheetDetailProps {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
}

const headers = (tenantId: string, workspaceId: string) => ({
  'content-type': 'application/json',
  'x-harness-tenant-id': tenantId,
  'x-harness-workspace-id': workspaceId,
});

const AI_JOB_STATUS_LABELS: Readonly<Record<NonNullable<SheetDetail['ai_job_status']>, string>> = {
  queued: '生成待ち',
  processing: '生成中',
  completed: '生成完了',
  failed: '生成に失敗（再試行待ち）',
  dead: '生成を完了できませんでした',
};

/**
 * 引き渡し用テキストの 1 ブロック。プレーンテキスト表示 (`<pre>`) のみで、
 * HTML としてはレンダリングしない (MarkdownView の sanitize 契約 HI-SEC7 に抵触しないため)。
 * クリップボード API が失敗しても例外を投げっぱなしにせず、エラー表示へフォールバックする。
 */
function HandoffBlock({ title, text }: { readonly title: string; readonly text: string }): ReactNode {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const copy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2_000);
    } catch {
      setCopyState('error');
    }
  }, [text]);

  return (
    <section aria-label={title}>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 'var(--hh-space-3)',
          justifyContent: 'space-between',
          marginBottom: 'var(--hh-space-2)',
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copyState === 'copied' ? 'コピーしました' : 'コピー'}
        </Button>
      </div>
      <div aria-live="polite">
        {copyState === 'error' ? (
          <Alert
            tone="danger"
            title="コピーに失敗しました"
            description="クリップボードへのアクセスが許可されていない可能性があります。下のテキストを選択して手動でコピーしてください。"
          />
        ) : null}
      </div>
      <pre
        style={{
          background: 'var(--hh-color-surface)',
          border: '1px solid var(--hh-color-border)',
          borderRadius: 'var(--hh-radius-sm)',
          overflowX: 'auto',
          padding: 'var(--hh-space-3)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </pre>
    </section>
  );
}

export function HearingSheetDetail({ id, tenantId, workspaceId }: HearingSheetDetailProps): ReactNode {
  const [sheet, setSheet] = useState<SheetDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completionNotice, setCompletionNotice] = useState(false);
  // 再生成は既存の本文を作り直す取り消しにくい操作なので、実行前に必ず確認を挟む (§P6)
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const previousStatus = useRef<SheetDetail['status'] | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/sheets/${id}`, {
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
      });
      if (!response.ok) throw new Error('シートを取得できませんでした。');
      const next = (await response.json()) as SheetDetail;
      if (previousStatus.current === 'generating' && (next.status === 'review' || next.status === 'completed')) {
        setCompletionNotice(true);
      }
      previousStatus.current = next.status;
      setSheet(next);
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'シートを取得できませんでした。');
    }
  }, [id, tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (sheet?.status !== 'generating') return;
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load, sheet?.status]);

  const patchStatus = async (status: HearingSheetStatus): Promise<void> => {
    setSaving(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/v1/sheets/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('状態を変更できませんでした。');
      setSheet((await response.json()) as SheetDetail);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '状態を変更できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async (): Promise<void> => {
    setRegenerateOpen(false);
    setSaving(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/v1/sheets/${id}/regenerate`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: headers(tenantId, workspaceId),
        body: '{}',
      });
      if (!response.ok) throw new Error('再生成を開始できませんでした。');
      setSheet((await response.json()) as SheetDetail);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : '再生成を開始できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const listHref = `/sheets?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`;

  if (sheet === null) {
    return (
      <article>
        <ScreenHeader
          title="ヒアリングシート詳細"
          breadcrumbs={[{ href: listHref, label: 'ヒアリングシート' }, { label: '詳細' }]}
          breadcrumbsLabel="現在地"
          sticky
        />
        {loadError === null ? (
          <LiveStatus>シートを読み込み中です。</LiveStatus>
        ) : (
          <Alert tone="danger" title="読み込みエラー" description={loadError} />
        )}
      </article>
    );
  }

  const sections = sheet.generated_sections;

  return (
    <article>
      <div data-print-exclude="">
        <ScreenHeader
          title={`${sheet.code} ${sheet.title}`}
          breadcrumbs={[{ href: listHref, label: 'ヒアリングシート' }, { label: sheet.code }]}
          breadcrumbsLabel="現在地"
          sticky
          tags={
            <TagRow label="このシートの状態">
              <StatusChip domain="sheet" status={sheet.status} />
            </TagRow>
          }
          actions={
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              印刷
            </Button>
          }
        />
      </div>

      <Stack gap={4}>
        {completionNotice ? (
          <Alert tone="success" title="生成完了" description={`${sheet.code} のシート本文が完成しました。`} />
        ) : null}
        {loadError === null ? null : <Alert tone="danger" title="更新エラー" description={loadError} />}
        {actionError === null ? null : <Alert tone="danger" title="操作エラー" description={actionError} />}
        {sheet.ai_job_status === 'dead' ? (
          <Alert
            tone="warning"
            title="生成を完了できませんでした"
            description="下の「管理者操作」から再生成できます。権限がない場合は管理者へご依頼ください。"
          />
        ) : null}

        <Panel title="申請と進行状況">
          <DefinitionList
            label="申請と進行状況"
            columns={2}
            items={[
              { term: '申請者', description: sheet.applicant.name },
              { term: '部門', description: sheet.department ?? '部門未登録' },
              { term: '申請日時', description: <DateTimeText value={sheet.created_at} /> },
              {
                term: '生成状態',
                description:
                  sheet.ai_job_status === null
                    ? '生成処理はまだ始まっていません'
                    : AI_JOB_STATUS_LABELS[sheet.ai_job_status],
              },
              {
                term: '対応 Build',
                description:
                  sheet.build_ref === null ? (
                    'まだ作成されていません'
                  ) : (
                    <span
                      style={{
                        alignItems: 'center',
                        display: 'inline-flex',
                        flexWrap: 'wrap',
                        gap: 'var(--hh-space-2)',
                      }}
                    >
                      <a
                        href={`/builds?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`}
                      >
                        工程ボードで確認
                      </a>
                      <IdBadge value={sheet.build_ref} label="Build ID" />
                    </span>
                  ),
              },
            ]}
          />
        </Panel>

        <Panel title="シート本文">
          <section aria-label="生成されたシート本文">
            {sections === null ? (
              <p>生成処理中です。完了すると内容がここに表示されます。</p>
            ) : (
              <>
                <MarkdownView content={sections.overview} />
                <MarkdownView content={sections.issue} />
                <MarkdownView
                  content={['## 推奨機能タグ', ...sections.feature_tags.map((tag) => `- ${tag}`)].join('\n')}
                />
                <MarkdownView content={sections.estimated_effect} />
              </>
            )}
          </section>
        </Panel>

        {/* 対象が 1 件なので比べる相手がおらず、表の列見出しは意味を持たない。
          定義リストにして狭い画面での横スクロールも無くす (§5-1 の写し方) */}
        <Panel
          title="申請時の入力と試算"
          description="申請を受け付けた時点の内容です。あとから申請内容が変わっても、ここは当時のまま残ります。"
        >
          <DefinitionList
            label="申請時の入力と試算"
            columns={2}
            items={[
              { term: '業務領域', description: sheet.form_snapshot.domain },
              { term: '月間工数', description: `${sheet.form_snapshot.hours} 時間` },
              { term: '対象人数', description: `${sheet.form_snapshot.people} 人` },
              {
                term: '年間で減らせる時間',
                description: `${sheet.estimate_snapshot.savedHoursPerYear.toLocaleString('ja-JP')} 時間`,
                hint: '申請内容をもとにした試算です。',
              },
              {
                term: '年間で減らせる金額',
                description: `${sheet.estimate_snapshot.savedAmountPerYear.toLocaleString('ja-JP')} 円`,
                hint: '見積係数設定の単価を掛けて算出しています。',
              },
            ]}
          />
        </Panel>

        <div data-print-exclude="">
          <Panel
            title="引き渡し用テキスト"
            description="次の作業へそのまま貼り付けられる形式でまとめています。プレーンテキストなのでコピー先の書式は崩れません。"
          >
            <Stack gap={4}>
              <HandoffBlock
                title="HarnessCreator 向け"
                text={buildHarnessCreatorHandoff({ formSnapshot: sheet.form_snapshot, generatedSections: sections })}
              />
              <HandoffBlock
                title="システム開発向け"
                text={buildSystemOrchestratorHandoff({
                  formSnapshot: sheet.form_snapshot,
                  generatedSections: sections,
                })}
              />
            </Stack>
          </Panel>
        </div>

        <div data-print-exclude="">
          <ScreenshotsPanel id={id} tenantId={tenantId} workspaceId={workspaceId} />
        </div>

        <div data-print-exclude="">
          <HandoffTokensPanel id={id} tenantId={tenantId} workspaceId={workspaceId} />
        </div>

        {sheet.can_manage ? (
          <div data-print-exclude="">
            <Panel title="管理者操作" description="レビューの進み具合を変えたり、本文を作り直したりできます。">
              {/* landmark として拾えるよう aside は残す。見出しは Panel 側が出す */}
              <aside
                aria-label="管理者操作"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                  gap: 'var(--hh-space-3)',
                }}
              >
                <Select
                  label="状態"
                  value={sheet.status === 'completed' ? 'completed' : 'review'}
                  onChange={(event) => void patchStatus(event.target.value as HearingSheetStatus)}
                  options={[
                    { value: 'review', label: 'レビュー待ち' },
                    { value: 'completed', label: '完了' },
                  ]}
                  disabled={saving}
                />
                <Button type="button" variant="secondary" onClick={() => setRegenerateOpen(true)} disabled={saving}>
                  再生成
                </Button>
              </aside>
            </Panel>

            <ConfirmDialog
              open={regenerateOpen}
              title="シート本文を再生成しますか？"
              description="いまの本文は破棄され、AI が最初から作り直します。元の本文には戻せません。"
              reversible={false}
              confirmLabel="再生成する"
              cancelLabel="やめる"
              onConfirm={() => void regenerate()}
              onCancel={() => setRegenerateOpen(false)}
            />
          </div>
        ) : null}
      </Stack>
    </article>
  );
}
