'use client';

import {
  type CreateSheetResponse,
  HEARING_SHEET_FORM_LIMITS,
  type HearingConstraintTag,
  type HearingSheetFormInput,
} from '@harness-hub/schemas';
import {
  Alert,
  Button,
  Panel,
  Select,
  Stack,
  StatusChip,
  StepWizard,
  TagRow,
  Textarea,
  TextInput,
  type WizardStep,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CONSTRAINT_TAG_OPTIONS,
  CONTEXT_OPTIONS,
  EXPERTISE_OPTIONS,
  MOTIVATION_OPTIONS,
  ROLE_OPTIONS,
  SHARING_INTENT_OPTIONS,
  USAGE_PURPOSE_LABELS,
  USAGE_PURPOSE_OPTIONS,
} from '../../../../features/hearing-intake/profile-options.js';
import {
  hearingIntakeStepIsValid,
  informationSourcesValidationError,
  knowledgeAssetsValidationError,
} from '../../../../features/hearing-intake/wizard-validation.js';
import {
  DEFAULT_SHEET_REDUCTION_RATE,
  previewMonthlySavedHours,
} from '../../../../shared/estimation/wizard-preview.js';

// 確認ダイアログは操作後にしか描画しないため、初期読み込みから外す (First Load JS 予算 120 KiB)
const ConfirmDialog = dynamic(() => import('@harness-hub/ui').then((module) => module.ConfirmDialog));

const STORAGE_KEY = 'harness-hub:hearing-intake:draft:v2';

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
  usagePurpose: null,
  expertise: null,
  role: null,
  context: null,
  motivation: null,
  sharingIntent: null,
  constraintTags: null,
  shareTarget: null,
  informationSources: null,
  trueProblem: null,
  knowledgeAssets: null,
};

interface HearingIntakeWizardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

/**
 * 制約タグの複数選択。`Select` は単一選択にしか使えないため、選択肢ごとの
 * トグルボタン (`aria-pressed` で選択状態を伝える) を並べるローカル部品にした。
 */
function ConstraintTagPicker({
  value,
  onToggle,
  onSetNone,
}: {
  readonly value: readonly HearingConstraintTag[] | null;
  readonly onToggle: (tag: HearingConstraintTag) => void;
  readonly onSetNone: () => void;
}): ReactNode {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
      <legend style={{ fontSize: 'var(--hh-font-size-md)', marginBottom: 'var(--hh-space-2)', padding: 0 }}>
        制約（あてはまるものを選択、複数可）
      </legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--hh-space-2)' }}>
        {CONSTRAINT_TAG_OPTIONS.map((option) => {
          const pressed = value?.includes(option.value) ?? false;
          return (
            <Button
              key={option.value}
              type="button"
              variant={pressed ? 'primary' : 'secondary'}
              aria-pressed={pressed}
              onClick={() => onToggle(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
        <Button
          type="button"
          variant={value?.length === 0 ? 'primary' : 'secondary'}
          aria-pressed={value?.length === 0}
          onClick={onSetNone}
        >
          特になし
        </Button>
      </div>
    </fieldset>
  );
}

export function HearingIntakeWizard({ tenantId, workspaceId }: HearingIntakeWizardProps): ReactNode {
  const draftStorageKey = `${STORAGE_KEY}:${tenantId}:${workspaceId}`;
  const [form, setForm] = useState<HearingSheetFormInput>(INITIAL_FORM);
  // 複数入力は「改行区切りテキスト」で入力させ、送信用配列を導出する。
  // form の配列から毎回逆生成すると末尾の空行が消えるため、生テキストは別管理する。
  const [informationSourcesText, setInformationSourcesText] = useState(
    INITIAL_FORM.informationSources?.join('\n') ?? '',
  );
  const [knowledgeAssetsText, setKnowledgeAssetsText] = useState(INITIAL_FORM.knowledgeAssets?.join('\n') ?? '');
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
        const parsed = JSON.parse(saved) as Partial<HearingSheetFormInput>;
        setForm({ ...INITIAL_FORM, ...parsed });
        if (Array.isArray(parsed.informationSources)) {
          setInformationSourcesText(parsed.informationSources.join('\n'));
        }
        if (Array.isArray(parsed.knowledgeAssets)) setKnowledgeAssetsText(parsed.knowledgeAssets.join('\n'));
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
  const setOptionalText = useCallback(
    (key: 'shareTarget' | 'trueProblem') =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        setForm((current) => ({ ...current, [key]: event.target.value === '' ? null : event.target.value }));
      },
    [],
  );
  const setNumber = useCallback(
    (key: 'hours' | 'people' | 'salary') =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        setForm((current) => ({
          ...current,
          [key]: Number(event.target.value),
        }));
      },
    [],
  );
  const setSelect = useCallback(
    (key: 'usagePurpose' | 'expertise' | 'role' | 'context' | 'motivation' | 'sharingIntent') =>
      (event: ChangeEvent<HTMLSelectElement>): void => {
        setForm(
          (current) =>
            ({ ...current, [key]: event.target.value === '' ? null : event.target.value }) as HearingSheetFormInput,
        );
      },
    [],
  );
  const toggleConstraintTag = useCallback((tag: HearingConstraintTag): void => {
    setForm((current) => ({
      ...current,
      constraintTags: (current.constraintTags ?? []).includes(tag)
        ? (current.constraintTags ?? []).filter((existing) => existing !== tag)
        : [...(current.constraintTags ?? []), tag],
    }));
  }, []);
  const setNoConstraintTags = useCallback((): void => {
    setForm((current) => ({ ...current, constraintTags: [] }));
  }, []);
  const setInformationSources = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    const text = event.target.value;
    setInformationSourcesText(text);
    setForm((current) => ({
      ...current,
      informationSources: text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    }));
  }, []);
  const setKnowledgeAssets = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    const text = event.target.value;
    setKnowledgeAssetsText(text);
    setForm((current) => ({
      ...current,
      knowledgeAssets: text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    }));
  }, []);

  const informationSourcesError = informationSourcesValidationError(form.informationSources);
  const knowledgeAssetsError = knowledgeAssetsValidationError(form.knowledgeAssets);

  const steps = useMemo<readonly WizardStep[]>(
    () => [
      {
        id: 'basic',
        title: '基本情報',
        content: (
          <>
            <TextInput
              label="業務名"
              value={form.taskName}
              onChange={setText('taskName')}
              maxLength={HEARING_SHEET_FORM_LIMITS.shortTextLength}
              required
            />
            <TextInput
              label="会社名"
              value={form.company}
              onChange={setText('company')}
              maxLength={HEARING_SHEET_FORM_LIMITS.shortTextLength}
              required
            />
            <TextInput
              label="申請者"
              value={form.applicant}
              onChange={setText('applicant')}
              maxLength={HEARING_SHEET_FORM_LIMITS.shortTextLength}
              required
            />
            <TextInput
              label="業務領域"
              value={form.domain}
              onChange={setText('domain')}
              maxLength={HEARING_SHEET_FORM_LIMITS.shortTextLength}
              required
            />
          </>
        ),
      },
      {
        id: 'current',
        title: '現状',
        content: (
          <>
            <Textarea
              label="現在の課題"
              value={form.issue}
              onChange={setText('issue')}
              maxLength={HEARING_SHEET_FORM_LIMITS.requiredTextLength}
              required
            />
            <Textarea
              label="利用中のツール"
              value={form.tools}
              onChange={setText('tools')}
              maxLength={HEARING_SHEET_FORM_LIMITS.requiredTextLength}
              required
            />
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
        id: 'profile',
        title: '用途プロファイル',
        content: (
          <>
            <Select
              label="用途"
              value={form.usagePurpose ?? ''}
              onChange={setSelect('usagePurpose')}
              options={USAGE_PURPOSE_OPTIONS}
              placeholder="未回答"
            />
            <Select
              label="熟練度"
              value={form.expertise ?? ''}
              onChange={setSelect('expertise')}
              options={EXPERTISE_OPTIONS}
              placeholder="未回答"
            />
            <Select
              label="役割"
              value={form.role ?? ''}
              onChange={setSelect('role')}
              options={ROLE_OPTIONS}
              placeholder="未回答"
            />
            <Select
              label="文脈"
              value={form.context ?? ''}
              onChange={setSelect('context')}
              options={CONTEXT_OPTIONS}
              placeholder="未回答"
            />
            <Select
              label="動機"
              value={form.motivation ?? ''}
              onChange={setSelect('motivation')}
              options={MOTIVATION_OPTIONS}
              placeholder="未回答"
            />
            <Select
              label="共有意図"
              value={form.sharingIntent ?? ''}
              onChange={setSelect('sharingIntent')}
              options={SHARING_INTENT_OPTIONS}
              placeholder="未回答"
            />
            <ConstraintTagPicker
              value={form.constraintTags}
              onToggle={toggleConstraintTag}
              onSetNone={setNoConstraintTags}
            />
            <TextInput
              label="共有相手"
              description="任意。例: 自分のみ / チーム内 / 顧客への納品物"
              placeholder="自分のみ / チーム内 / 顧客への納品物"
              value={form.shareTarget ?? ''}
              onChange={setOptionalText('shareTarget')}
              maxLength={HEARING_SHEET_FORM_LIMITS.shortTextLength}
            />
            <Textarea
              label="情報源"
              description={`任意。現在参照しているシステム・資料・Web サイトなどを 1 行に 1 件で入力してください（0〜${HEARING_SHEET_FORM_LIMITS.informationSources} 件、1 件 ${HEARING_SHEET_FORM_LIMITS.shortTextLength} 文字以内）。`}
              value={informationSourcesText}
              onChange={setInformationSources}
              error={informationSourcesError}
            />
            <Textarea
              label="真の課題"
              description="任意。表面的な困りごとの奥で、今もっとも困っている根本的な問題を入力してください。"
              value={form.trueProblem ?? ''}
              onChange={setOptionalText('trueProblem')}
              maxLength={HEARING_SHEET_FORM_LIMITS.requiredTextLength}
            />
            <Textarea
              label="ナレッジ資産"
              description={`任意。利用できる社内資料・過去の対応記録・テンプレートなどを 1 行に 1 件で入力してください（0〜${HEARING_SHEET_FORM_LIMITS.knowledgeAssets} 件、1 件 ${HEARING_SHEET_FORM_LIMITS.shortTextLength} 文字以内）。`}
              value={knowledgeAssetsText}
              onChange={setKnowledgeAssets}
              error={knowledgeAssetsError}
            />
          </>
        ),
      },
      {
        id: 'request',
        title: '要望',
        content: (
          <>
            <Textarea
              label="ほしい機能"
              value={form.features}
              onChange={setText('features')}
              maxLength={HEARING_SHEET_FORM_LIMITS.requiredTextLength}
              required
            />
            <Textarea
              label="希望する出力"
              value={form.output}
              onChange={setText('output')}
              maxLength={HEARING_SHEET_FORM_LIMITS.requiredTextLength}
              required
            />
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
            <p>用途: {form.usagePurpose === null ? '未回答' : USAGE_PURPOSE_LABELS[form.usagePurpose]}</p>
            <p>
              削減時間の目安: 月あたり約 {previewMonthlySavedHours(form, DEFAULT_SHEET_REDUCTION_RATE).toFixed(1)} 時間
            </p>
            <p>
              この目安は既定の前提 (工数の {Math.round(DEFAULT_SHEET_REDUCTION_RATE * 100)}% を削減)
              で計算しています。正式な削減時間と金額は、送信後にテナントの設定にもとづいてサーバで計算します。
            </p>
          </section>
        ),
      },
    ],
    [
      form,
      informationSourcesError,
      informationSourcesText,
      knowledgeAssetsError,
      knowledgeAssetsText,
      setInformationSources,
      setKnowledgeAssets,
      setNumber,
      setNoConstraintTags,
      setOptionalText,
      setSelect,
      setText,
      toggleConstraintTag,
    ],
  );

  const canProceed = hearingIntakeStepIsValid(form, activeIndex);

  const submit = async (): Promise<void> => {
    if (!hearingIntakeStepIsValid(form, 4)) {
      setError('入力内容に上限超過または未入力があります。各ステップを確認してください。');
      return;
    }
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
            {/* 生の <button> は見た目も押せる幅も画面ごとにばらつくため共通の Button に寄せる */}
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
