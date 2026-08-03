'use client';

import type { CreateSheetResponse, HearingSheetFormInput } from '@harness-hub/schemas';
import { Alert, Select, StatusChip, StepWizard, Textarea, TextInput, type WizardStep } from '@harness-hub/ui';
import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'harness-hub:hearing-intake:draft:v1';

const INITIAL_FORM: HearingSheetFormInput = {
  taskName: '',
  company: '',
  applicant: '',
  domain: '',
  issue: '',
  tools: '',
  hours: 1,
  people: 1,
  salary: 0,
  features: '',
  output: '',
  priority: 'medium',
};

interface HearingIntakeWizardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

function requiredText(value: string): boolean {
  return value.trim().length > 0;
}

export function HearingIntakeWizard({ tenantId, workspaceId }: HearingIntakeWizardProps): ReactNode {
  const draftStorageKey = `${STORAGE_KEY}:${tenantId}:${workspaceId}`;
  const [form, setForm] = useState<HearingSheetFormInput>(INITIAL_FORM);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateSheetResponse | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(draftStorageKey);
    if (saved !== null) {
      try {
        setForm({ ...INITIAL_FORM, ...(JSON.parse(saved) as Partial<HearingSheetFormInput>) });
      } catch {
        sessionStorage.removeItem(draftStorageKey);
      }
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (created === null) sessionStorage.setItem(draftStorageKey, JSON.stringify(form));
  }, [created, draftStorageKey, form]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (created === null && JSON.stringify(form) !== JSON.stringify(INITIAL_FORM)) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [created, form]);

  const setText = useCallback(
    (key: keyof HearingSheetFormInput) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
      },
    [],
  );
  const setNumber = useCallback(
    (key: 'hours' | 'people' | 'salary') =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        setForm((current) => ({ ...current, [key]: Number(event.target.value) }));
      },
    [],
  );

  const steps = useMemo<readonly WizardStep[]>(
    () => [
      {
        id: 'basic',
        title: '基本情報',
        content: (
          <>
            <TextInput label="業務名" value={form.taskName} onChange={setText('taskName')} required />
            <TextInput label="会社名" value={form.company} onChange={setText('company')} required />
            <TextInput label="申請者" value={form.applicant} onChange={setText('applicant')} required />
            <TextInput label="業務領域" value={form.domain} onChange={setText('domain')} required />
          </>
        ),
      },
      {
        id: 'current',
        title: '現状',
        content: (
          <>
            <Textarea label="現在の課題" value={form.issue} onChange={setText('issue')} required />
            <Textarea label="利用中のツール" value={form.tools} onChange={setText('tools')} required />
            <TextInput
              label="月間工数（時間）"
              type="number"
              min={1}
              max={160}
              value={form.hours}
              onChange={setNumber('hours')}
              required
            />
            <TextInput
              label="対象人数"
              type="number"
              min={1}
              max={500}
              value={form.people}
              onChange={setNumber('people')}
              required
            />
            <TextInput
              label="想定年収（円）"
              description="試算だけに使い、シートや AI キューには保存しません。"
              type="number"
              min={0}
              max={100_000_000}
              value={form.salary}
              onChange={setNumber('salary')}
              required
            />
          </>
        ),
      },
      {
        id: 'request',
        title: '要望',
        content: (
          <>
            <Textarea label="ほしい機能" value={form.features} onChange={setText('features')} required />
            <Textarea label="希望する出力" value={form.output} onChange={setText('output')} required />
            <Select
              label="優先度"
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as HearingSheetFormInput['priority'],
                }))
              }
              options={[
                { value: 'high', label: '高' },
                { value: 'medium', label: '中' },
                { value: 'low', label: '低' },
              ]}
              required
            />
          </>
        ),
      },
      {
        id: 'confirm',
        title: '確認',
        content: (
          <section aria-label="入力内容の確認">
            <p>業務名: {form.taskName}</p>
            <p>課題: {form.issue}</p>
            <p>削減時間の参考値: 月あたり約 {(form.hours * form.people * 0.35).toFixed(1)} 時間</p>
            <p>金額は送信後にサーバで安全に計算します。</p>
          </section>
        ),
      },
    ],
    [form, setNumber, setText],
  );

  const canProceed =
    [
      [form.taskName, form.company, form.applicant, form.domain].every(requiredText),
      requiredText(form.issue) &&
        requiredText(form.tools) &&
        Number.isInteger(form.hours) &&
        form.hours >= 1 &&
        form.hours <= 160 &&
        Number.isInteger(form.people) &&
        form.people >= 1 &&
        form.people <= 500 &&
        Number.isInteger(form.salary) &&
        form.salary >= 0,
      requiredText(form.features) && requiredText(form.output),
      true,
    ][activeIndex] ?? false;

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
      <section aria-live="polite" aria-labelledby="receipt-heading">
        <h2 id="receipt-heading">受付が完了しました</h2>
        <Alert
          tone="success"
          title={created.code}
          description="生成処理をキューへ登録しました。完了を待たずに別の作業へ移れます。"
        />
        <p>
          状態: <StatusChip domain="sheet" status={created.status} />
        </p>
        <p>
          <a href={`/sheets/${created.id}?tenant=${tenantId}&workspace=${workspaceId}`}>シートを見る</a>
          {' / '}
          <button type="button" onClick={() => setCreated(null)}>
            続けて作成
          </button>
        </p>
      </section>
    );
  }

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="送信エラー" description={error} />}
      <StepWizard
        label="ヒアリングシート作成"
        steps={steps}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        canProceed={canProceed && !submitting}
        onComplete={() => void submit()}
      />
    </>
  );
}
