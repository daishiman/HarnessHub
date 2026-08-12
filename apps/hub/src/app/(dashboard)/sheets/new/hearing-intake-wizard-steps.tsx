import { Alert, Button, Select, Stack, Textarea, TextInput, type WizardStep } from '@harness-hub/ui';
import type { ReactNode } from 'react';

import {
  DEFAULT_SHEET_REDUCTION_RATE,
  previewMonthlySavedHours,
} from '../../../../shared/estimation/wizard-preview.js';
import {
  CONSTRAINT_TAG_LABELS,
  CONSTRAINT_TAG_OPTIONS,
  CONTEXT_LABELS,
  CONTEXT_OPTIONS,
  EXISTING_DATA_SOURCE_OPTIONS,
  EXPERTISE_LABELS,
  EXPERTISE_OPTIONS,
  INTEGRATION_TOOL_OPTIONS,
  MOTIVATION_LABELS,
  MOTIVATION_OPTIONS,
  REQUEST_PATTERN_LABELS,
  REQUEST_PATTERN_OPTIONS,
  ROLE_LABELS,
  ROLE_OPTIONS,
  SHARING_INTENT_LABELS,
  SHARING_INTENT_OPTIONS,
  USAGE_PURPOSE_LABELS,
  USAGE_PURPOSE_OPTIONS,
} from './hearing-intake-wizard-model.js';
import type { HearingWizardFormState } from './hearing-intake-wizard-state.js';

function TogglePicker<T extends string>({
  legend,
  options,
  value,
  onToggle,
}: {
  readonly legend: string;
  readonly options: readonly { value: T; label: string }[];
  readonly value: readonly T[];
  readonly onToggle: (option: T) => void;
}): ReactNode {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
      <legend style={{ fontSize: 'var(--hh-font-size-md)', marginBottom: 'var(--hh-space-2)', padding: 0 }}>
        {legend}
      </legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--hh-space-2)' }}>
        {options.map((option) => {
          const pressed = value.includes(option.value);
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
      </div>
    </fieldset>
  );
}

/** 8段の順序と内容を一か所で固定し、各入力の状態・操作は単一model objectから読む。 */
export function buildHearingIntakeSteps(state: HearingWizardFormState): readonly WizardStep[] {
  const {
    addReferenceUrl,
    form,
    knowledgeAssetsText,
    referenceNoteDraft,
    referenceUrlDraft,
    referenceUrlError,
    removeReferenceUrl,
    setKnowledgeAssets,
    setNumber,
    setPriority,
    setReferenceNoteDraft,
    setReferenceUrlDraft,
    setSelect,
    setText,
    toggleConstraintTag,
    toggleExistingDataSource,
    toggleIntegrationTool,
    toggleRequestPattern,
    unknownFields,
  } = state;

  return [
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
      id: 'profile',
      title: '用途プロファイル',
      content: (
        <>
          <Select
            label="用途"
            value={form.usagePurpose}
            onChange={setSelect('usagePurpose')}
            options={USAGE_PURPOSE_OPTIONS}
            required
          />
          <Select
            label="熟練度"
            value={form.expertise}
            onChange={setSelect('expertise')}
            options={EXPERTISE_OPTIONS}
            required
          />
          <Select label="役割" value={form.role} onChange={setSelect('role')} options={ROLE_OPTIONS} required />
          <Select
            label="文脈"
            value={form.context}
            onChange={setSelect('context')}
            options={CONTEXT_OPTIONS}
            required
          />
          <Select
            label="動機"
            value={form.motivation}
            onChange={setSelect('motivation')}
            options={MOTIVATION_OPTIONS}
            required
          />
          <Select
            label="共有意図"
            value={form.sharingIntent}
            onChange={setSelect('sharingIntent')}
            options={SHARING_INTENT_OPTIONS}
            required
          />
          <TogglePicker
            legend="制約（あてはまるものを選択、複数可。「不明」は他と排他）"
            options={CONSTRAINT_TAG_OPTIONS}
            value={form.constraintTags}
            onToggle={toggleConstraintTag}
          />
          <TextInput
            label="共有相手"
            description="例: 自分のみ / チーム内 / 顧客への納品物"
            placeholder="自分のみ / チーム内 / 顧客への納品物"
            value={form.shareTarget}
            onChange={setText('shareTarget')}
            required
          />
          <Textarea
            label="ナレッジ資産"
            description="関連する社内資料・過去の対応記録・テンプレートなどを 1 行に 1 件で入力してください（1 件以上必須）。"
            value={knowledgeAssetsText}
            onChange={setKnowledgeAssets}
            required
          />
        </>
      ),
    },
    {
      id: 'request-pattern',
      title: 'よくある要望パターン',
      content: (
        <>
          <TogglePicker
            legend="よくある要望パターン（複数可。「わからない」は他と排他）"
            options={REQUEST_PATTERN_OPTIONS}
            value={form.requestPatterns}
            onToggle={toggleRequestPattern}
          />
          {form.requestPatterns.includes('integration') ? (
            <>
              <TogglePicker
                legend="連携したいツール"
                options={INTEGRATION_TOOL_OPTIONS}
                value={form.integrationTools}
                onToggle={toggleIntegrationTool}
              />
              {form.integrationTools.includes('other') ? (
                <TextInput
                  label="連携したいツール（その他・自由記述）"
                  value={form.integrationToolsOther ?? ''}
                  onChange={setText('integrationToolsOther')}
                />
              ) : null}
            </>
          ) : null}
          {form.requestPatterns.includes('automation') ? (
            <Textarea
              label="自動化したい内容"
              description="どんな作業を自動化したいか、具体的に記入してください。"
              value={form.automationDescription ?? ''}
              onChange={setText('automationDescription')}
            />
          ) : null}
          {form.requestPatterns.includes('data_digitization') ? (
            <>
              <TogglePicker
                legend="既存データの所在"
                options={EXISTING_DATA_SOURCE_OPTIONS}
                value={form.existingDataSources}
                onToggle={toggleExistingDataSource}
              />
              {form.existingDataSources.includes('other') ? (
                <TextInput
                  label="既存データの所在（その他・自由記述）"
                  value={form.existingDataSourcesOther ?? ''}
                  onChange={setText('existingDataSourcesOther')}
                />
              ) : null}
            </>
          ) : null}
        </>
      ),
    },
    {
      id: 'reference',
      title: '参考URL・添付',
      content: (
        <>
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend style={{ fontSize: 'var(--hh-font-size-md)', marginBottom: 'var(--hh-space-2)', padding: 0 }}>
              参考URL（最大10件）
            </legend>
            <Stack gap={2}>
              <TextInput
                label="URL"
                placeholder="https://example.com/doc"
                value={referenceUrlDraft}
                onChange={(event) => setReferenceUrlDraft(event.target.value)}
              />
              <TextInput
                label="メモ（任意）"
                value={referenceNoteDraft}
                onChange={(event) => setReferenceNoteDraft(event.target.value)}
              />
              {referenceUrlError === null ? null : (
                <Alert tone="danger" title="URL エラー" description={referenceUrlError} />
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={addReferenceUrl}
                disabled={referenceUrlDraft.trim().length === 0 || form.referenceUrls.length >= 10}
              >
                追加
              </Button>
              {form.referenceUrls.length === 0 ? (
                <p>まだ参考URLは追加されていません。</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 'var(--hh-space-4)' }}>
                  {form.referenceUrls.map((entry, index) => (
                    <li key={entry.url} style={{ marginBottom: 'var(--hh-space-2)' }}>
                      <span>{entry.url}</span>
                      {entry.note ? <span> — {entry.note}</span> : null}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => removeReferenceUrl(index)}
                        style={{ marginLeft: 'var(--hh-space-2)' }}
                      >
                        削除
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </fieldset>
          <Alert
            tone="info"
            title="スクリーンショットについて"
            description="スクリーンショットの添付は、この提出フォームの送信後にシート詳細画面から追加できます。"
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
            onChange={setPriority}
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
      id: 'review',
      title: '整理・まとめ',
      content: (
        <section aria-label="入力内容の整理・まとめ">
          <Stack gap={3}>
            {unknownFields.length === 0 ? null : (
              <Alert
                tone="warning"
                title="要ヒアリング項目"
                description={`「不明・わからない」が選ばれている項目: ${unknownFields.join('、')}`}
              />
            )}
            <div>
              <h3>基本情報</h3>
              <p>業務名: {form.taskName}</p>
              <p>会社名: {form.company}</p>
              <p>申請者: {form.applicant}</p>
              <p>業務領域: {form.domain}</p>
            </div>
            <div>
              <h3>現状</h3>
              <p>課題: {form.issue}</p>
              <p>利用中のツール: {form.tools}</p>
              <p>
                月間工数: {form.hours} 時間 / 対象人数: {form.people} 人
              </p>
            </div>
            <div>
              <h3>用途プロファイル</h3>
              <p>用途: {USAGE_PURPOSE_LABELS[form.usagePurpose]}</p>
              <p>熟練度: {EXPERTISE_LABELS[form.expertise]}</p>
              <p>役割: {ROLE_LABELS[form.role]}</p>
              <p>文脈: {CONTEXT_LABELS[form.context]}</p>
              <p>動機: {MOTIVATION_LABELS[form.motivation]}</p>
              <p>共有意図: {SHARING_INTENT_LABELS[form.sharingIntent]}</p>
              <p>
                制約:{' '}
                {form.constraintTags.length === 0
                  ? 'なし'
                  : form.constraintTags.map((tag) => CONSTRAINT_TAG_LABELS[tag]).join('、')}
              </p>
              <p>共有相手: {form.shareTarget}</p>
            </div>
            <div>
              <h3>よくある要望パターン</h3>
              <p>
                {form.requestPatterns.length === 0
                  ? 'なし'
                  : form.requestPatterns.map((pattern) => REQUEST_PATTERN_LABELS[pattern]).join('、')}
              </p>
              {form.integrationTools.length === 0 ? null : <p>連携ツール: {form.integrationTools.join('、')}</p>}
              {form.automationDescription ? <p>自動化したい内容: {form.automationDescription}</p> : null}
              {form.existingDataSources.length === 0 ? null : <p>既存データ: {form.existingDataSources.join('、')}</p>}
            </div>
            <div>
              <h3>参考URL</h3>
              {form.referenceUrls.length === 0 ? (
                <p>なし</p>
              ) : (
                <ul>
                  {form.referenceUrls.map((entry) => (
                    <li key={entry.url}>{entry.url}</li>
                  ))}
                </ul>
              )}
            </div>
            <p>この内容で確定する場合は、次の「確認」ステップへ進んでください。</p>
          </Stack>
        </section>
      ),
    },
    {
      id: 'confirm',
      title: '確認',
      content: (
        <section aria-label="入力内容の確認">
          <p>業務名: {form.taskName}</p>
          <p>課題: {form.issue}</p>
          <p>用途: {USAGE_PURPOSE_LABELS[form.usagePurpose]}</p>
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
  ];
}
