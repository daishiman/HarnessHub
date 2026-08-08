'use client';

import type { HearingSheetStatus, SheetDetail } from '@harness-hub/schemas';
import { Alert, Button, Panel, ScreenHeader, Select, StatusChip } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

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

export function HearingSheetDetail({ id, tenantId, workspaceId }: HearingSheetDetailProps): ReactNode {
  const [sheet, setSheet] = useState<SheetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'シートを取得できませんでした。');
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
      setError(cause instanceof Error ? cause.message : '状態を変更できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async (): Promise<void> => {
    setRegenerateOpen(false);
    setSaving(true);
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
      setError(cause instanceof Error ? cause.message : '再生成を開始できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  if (error !== null && sheet === null) return <Alert tone="danger" title="読み込みエラー" description={error} />;
  if (sheet === null) return <p aria-live="polite">読み込み中です…</p>;

  const sections = sheet.generated_sections;
  const listHref = `/sheets?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`;

  return (
    <article>
      <div data-print-exclude="">
        <ScreenHeader
          title={`${sheet.code} ${sheet.title}`}
          breadcrumbs={[{ href: listHref, label: 'ヒアリングシート' }, { label: sheet.code }]}
          breadcrumbsLabel="現在地"
          actions={
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              印刷
            </Button>
          }
        />
      </div>
      {completionNotice ? (
        <Alert tone="success" title="生成完了" description={`${sheet.code} のシート本文が完成しました。`} />
      ) : null}
      {error === null ? null : <Alert tone="danger" title="操作エラー" description={error} />}
      <p aria-live="polite">
        <StatusChip domain="sheet" status={sheet.status} />
      </p>
      {sheet.ai_job_status === 'dead' ? (
        <Alert tone="warning" title="生成を完了できませんでした" description="管理者が再生成できます。" />
      ) : null}

      <Panel title="シート本文" style={{ marginBlockStart: 'var(--hh-space-4)' }}>
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

      <Panel title="元入力とサーバ試算" flush style={{ marginBlockStart: 'var(--hh-space-4)' }}>
        <table>
          <caption>元入力とサーバ試算の snapshot</caption>
          <tbody>
            <tr>
              <th scope="row">業務領域</th>
              <td>{sheet.form_snapshot.domain}</td>
            </tr>
            <tr>
              <th scope="row">月間工数</th>
              <td>{sheet.form_snapshot.hours} 時間</td>
            </tr>
            <tr>
              <th scope="row">対象人数</th>
              <td>{sheet.form_snapshot.people} 人</td>
            </tr>
            <tr>
              <th scope="row">年間削減時間</th>
              <td>{sheet.estimate_snapshot.savedHoursPerYear.toLocaleString('ja-JP')} 時間</td>
            </tr>
            <tr>
              <th scope="row">年間削減額</th>
              <td>{sheet.estimate_snapshot.savedAmountPerYear.toLocaleString('ja-JP')} 円</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      {sheet.can_manage ? (
        <div data-print-exclude="">
          <Panel title="管理者操作" style={{ marginBlockStart: 'var(--hh-space-4)' }}>
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
    </article>
  );
}
