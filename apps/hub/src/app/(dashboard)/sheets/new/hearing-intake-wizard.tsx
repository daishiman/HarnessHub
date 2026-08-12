'use client';

import type { CreateSheetResponse, HearingSheetFormInput } from '@harness-hub/schemas';
import { Alert, Button, Panel, Stack, StatusChip, StepWizard, TagRow } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ReactNode, useEffect, useState } from 'react';

import { canProceedAtStep, INITIAL_HEARING_FORM } from './hearing-intake-wizard-model.js';
import { useHearingWizardFormState } from './hearing-intake-wizard-state.js';
import { buildHearingIntakeSteps } from './hearing-intake-wizard-steps.js';

// 確認ダイアログは操作後にしか描画しないため、初期読み込みから外す (First Load JS 予算 120 KiB)
const ConfirmDialog = dynamic(() => import('@harness-hub/ui').then((module) => module.ConfirmDialog));

const STORAGE_KEY = 'harness-hub:hearing-intake:draft:v1';

interface HearingIntakeWizardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

export function HearingIntakeWizard({ tenantId, workspaceId }: HearingIntakeWizardProps): ReactNode {
  const draftStorageKey = `${STORAGE_KEY}:${tenantId}:${workspaceId}`;
  const formState = useHearingWizardFormState();
  const { form, restoreDraft } = formState;
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateSheetResponse | null>(null);
  // 入力途中で離脱すると下書きが消えるため、確認を挟んでから一覧へ戻す (§P6 / qa-013)
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(draftStorageKey);
    if (saved !== null) {
      try {
        restoreDraft(JSON.parse(saved) as Partial<HearingSheetFormInput>);
      } catch {
        sessionStorage.removeItem(draftStorageKey);
      }
    }
  }, [draftStorageKey, restoreDraft]);

  useEffect(() => {
    if (created === null) sessionStorage.setItem(draftStorageKey, JSON.stringify(form));
  }, [created, draftStorageKey, form]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (created === null && JSON.stringify(form) !== JSON.stringify(INITIAL_HEARING_FORM)) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [created, form]);

  const steps = buildHearingIntakeSteps(formState);
  const canProceed = canProceedAtStep(form, activeIndex);

  const submit = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/sheets', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('送信できませんでした。入力内容と接続を確認してください。');
      const body = (await response.json()) as CreateSheetResponse;
      setCreated(body);
      sessionStorage.removeItem(draftStorageKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '送信できませんでした。');
    } finally {
      setSubmitting(false);
    }
  };

  if (created !== null) {
    return (
      <Panel>
        <section aria-live="polite" aria-labelledby="receipt-heading">
          <Stack gap={3}>
            <h2 id="receipt-heading" style={{ margin: 0 }}>
              受付が完了しました
            </h2>
            <Alert
              tone="success"
              title={`シート番号 ${created.code}`}
              description="シート本文の作成を開始しました。完了を待たずに別の作業へ移れます。"
            />
            <TagRow label="受付したシートの状態">
              <StatusChip domain="sheet" status={created.status} />
            </TagRow>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--hh-space-3)', alignItems: 'center' }}>
              <a href={`/sheets/${created.id}?tenant=${tenantId}&workspace=${workspaceId}`}>このシートを見る</a>
              <Button type="button" variant="secondary" onClick={() => setCreated(null)}>
                続けてもう 1 件作成する
              </Button>
            </div>
          </Stack>
        </section>
      </Panel>
    );
  }

  const listHref = `/sheets?tenant=${encodeURIComponent(tenantId)}&workspace=${encodeURIComponent(workspaceId)}`;

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="送信エラー" description={error} />}
      <Panel
        actions={
          <Button type="button" variant="secondary" onClick={() => setExitOpen(true)}>
            入力をやめる
          </Button>
        }
      >
        <StepWizard
          label="ヒアリングシート作成"
          steps={steps}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          canProceed={canProceed && !submitting}
          onComplete={() => void submit()}
        />
      </Panel>

      <ConfirmDialog
        open={exitOpen}
        title="入力をやめますか？"
        description="ここまでの入力内容は削除され、次回は最初から入力し直します。"
        reversible={false}
        confirmLabel="やめて一覧へ戻る"
        cancelLabel="入力を続ける"
        onConfirm={() => {
          sessionStorage.removeItem(draftStorageKey);
          window.location.assign(listHref);
        }}
        onCancel={() => setExitOpen(false)}
      />
    </>
  );
}
