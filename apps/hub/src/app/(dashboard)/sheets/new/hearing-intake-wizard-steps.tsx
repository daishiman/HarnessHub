import { Alert, Button, Panel, Select, Stack, Textarea, TextInput, type WizardStep } from '@harness-hub/ui';
import type { ReactNode } from 'react';
import type { StagedAttachmentsState } from './hearing-intake-wizard-attachments.js';
import { AttachmentStagingPanel } from './hearing-intake-wizard-attachments-panel.js';
import {
  CONSTRAINT_TAG_OPTIONS,
  CONTEXT_OPTIONS,
  EXISTING_DATA_SOURCE_OPTIONS,
  EXPERTISE_OPTIONS,
  INTEGRATION_TOOL_OPTIONS,
  MOTIVATION_OPTIONS,
  PRIORITY_OPTIONS,
  REQUEST_PATTERN_OPTIONS,
  ROLE_OPTIONS,
  SHARING_INTENT_OPTIONS,
  USAGE_PURPOSE_OPTIONS,
} from './hearing-intake-wizard-model.js';
import { ReviewAndConfirmStep } from './hearing-intake-wizard-review-step.js';
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

/** 7段の順序と内容を一か所で固定し、各入力の状態・操作は単一model objectから読む。 */
export function buildHearingIntakeSteps(
  state: HearingWizardFormState,
  attachmentsState: StagedAttachmentsState,
): readonly WizardStep[] {
  const {
    addReferenceUrl,
    form,
    informationSourcesText,
    knowledgeAssetsText,
    referenceNoteDraft,
    referenceUrlDraft,
    referenceUrlError,
    removeReferenceUrl,
    setInformationSources,
    setKnowledgeAssets,
    setNumber,
    setPriority,
    setReferenceNoteDraft,
    setReferenceUrlDraft,
    setSelect,
    setText,
    setTrueProblem,
    toggleConstraintTag,
    toggleExistingDataSource,
    toggleIntegrationTool,
    toggleRequestPattern,
  } = state;

  return [
    {
      id: 'basic',
      title: '基本情報',
      content: (
        <Stack gap={4}>
          <p>誰が・どの会社・どの業務領域からの依頼かを特定するための基本情報です。</p>
          <Panel title="申請者情報" headingLevel={3}>
            <Stack gap={3}>
              <TextInput label="業務名" value={form.taskName} onChange={setText('taskName')} required />
              <TextInput label="会社名" value={form.company} onChange={setText('company')} required />
              <TextInput label="申請者" value={form.applicant} onChange={setText('applicant')} required />
              <TextInput label="業務領域" value={form.domain} onChange={setText('domain')} required />
            </Stack>
          </Panel>
        </Stack>
      ),
    },
    {
      id: 'current',
      title: '現状',
      content: (
        <Stack gap={4}>
          <p>現在どんな課題があり、どのくらいの工数がかかっているかを教えてください。</p>
          <Panel title="課題" headingLevel={3}>
            <Stack gap={3}>
              <Textarea label="現在の課題" value={form.issue} onChange={setText('issue')} required />
              <Textarea
                label="本当の課題（深掘り・任意）"
                description="「現在の課題」の背景にある、より本質的な問題があれば記入してください（任意）。"
                value={form.trueProblem ?? ''}
                onChange={setTrueProblem}
              />
              <Textarea label="利用中のツール" value={form.tools} onChange={setText('tools')} required />
            </Stack>
          </Panel>
          <Panel title="工数の目安" headingLevel={3}>
            <Stack gap={3}>
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
            </Stack>
          </Panel>
        </Stack>
      ),
    },
    {
      id: 'profile',
      title: '用途プロファイル',
      content: (
        <Stack gap={4}>
          <p>誰が・何のために使うのか、共有範囲はどこまでかを教えてください。</p>
          <Panel title="誰が・何のために" headingLevel={3}>
            <Stack gap={3}>
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
            </Stack>
          </Panel>
          <Panel title="共有・ナレッジ" headingLevel={3}>
            <Stack gap={3}>
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
              <Textarea
                label="情報源（任意）"
                description="判断のもとになった情報源（会議・チケット・ヒアリングメモなど）があれば 1 行に 1 件で入力してください（任意）。"
                value={informationSourcesText}
                onChange={setInformationSources}
              />
            </Stack>
          </Panel>
        </Stack>
      ),
    },
    {
      id: 'request-pattern',
      title: 'よくある要望パターン',
      content: (
        <Stack gap={4}>
          <p>
            ありがちな要望パターンに当てはまるものがあれば選んでください。選んだ内容に応じて追加の質問が表示されます。
          </p>
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
        </Stack>
      ),
    },
    {
      id: 'reference',
      title: '参考URL・添付',
      content: (
        <Stack gap={4}>
          <p>
            関連する参考URLや、画面の様子が分かる画像・動画・データファイルがあれば追加してください。いずれも任意です。
          </p>
          <Panel title="参考URL" headingLevel={3} description="最大10件まで追加できます。">
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
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
          </Panel>
          <Panel title="添付ファイル" headingLevel={3}>
            <AttachmentStagingPanel state={attachmentsState} />
          </Panel>
        </Stack>
      ),
    },
    {
      id: 'request',
      title: '要望',
      content: (
        <Stack gap={4}>
          <p>実現したいこと・優先度を教えてください。</p>
          <Panel title="要望内容" headingLevel={3}>
            <Stack gap={3}>
              <Textarea label="ほしい機能" value={form.features} onChange={setText('features')} required />
              <Textarea label="希望する出力" value={form.output} onChange={setText('output')} required />
              <Select label="優先度" value={form.priority} onChange={setPriority} options={PRIORITY_OPTIONS} required />
            </Stack>
          </Panel>
        </Stack>
      ),
    },
    {
      id: 'review',
      title: '整理・確認',
      content: <ReviewAndConfirmStep state={state} />,
    },
  ];
}
