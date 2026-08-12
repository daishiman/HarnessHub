import { Alert, Panel, Stack } from '@harness-hub/ui';
import type { ReactNode } from 'react';

import {
  DEFAULT_SHEET_REDUCTION_RATE,
  previewMonthlySavedHours,
} from '../../../../shared/estimation/wizard-preview.js';
import {
  CONSTRAINT_TAG_LABELS,
  CONTEXT_LABELS,
  EXPERTISE_LABELS,
  MOTIVATION_LABELS,
  REQUEST_PATTERN_LABELS,
  ROLE_LABELS,
  SHARING_INTENT_LABELS,
  USAGE_PURPOSE_LABELS,
} from './hearing-intake-wizard-model.js';
import type { HearingWizardFormState } from './hearing-intake-wizard-state.js';

/**
 * 元は「整理・まとめ」「確認」の2ステップに分かれていたが、内容がほぼ重複していたため
 * 1ステップへ統合した (依頼者要件 F: 重複ステップの削除)。入力の見直しと送信前の最終確認を
 * 同じ画面で完結できるようにする。
 */
export function ReviewAndConfirmStep({ state }: { readonly state: HearingWizardFormState }): ReactNode {
  const { form, unknownFields } = state;
  const estimatedMonthlyHours = previewMonthlySavedHours(form, DEFAULT_SHEET_REDUCTION_RATE);

  return (
    <section aria-label="入力内容の整理・最終確認">
      <Stack gap={3}>
        <p>これまでの入力内容を確認し、問題なければ送信してください。</p>
        {unknownFields.length === 0 ? null : (
          <Alert
            tone="warning"
            title="要ヒアリング項目"
            description={`「不明・わからない」が選ばれている項目: ${unknownFields.join('、')}`}
          />
        )}

        <Panel title="基本情報" headingLevel={3}>
          <p>業務名: {form.taskName}</p>
          <p>会社名: {form.company}</p>
          <p>申請者: {form.applicant}</p>
          <p>業務領域: {form.domain}</p>
        </Panel>

        <Panel title="現状" headingLevel={3}>
          <p>課題: {form.issue}</p>
          {form.trueProblem ? <p>本当の課題（深掘り）: {form.trueProblem}</p> : null}
          <p>利用中のツール: {form.tools}</p>
          <p>
            月間工数: {form.hours} 時間 / 対象人数: {form.people} 人
          </p>
        </Panel>

        <Panel title="用途プロファイル" headingLevel={3}>
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
          <p>
            情報源:{' '}
            {form.informationSources && form.informationSources.length > 0
              ? form.informationSources.join('、')
              : 'なし'}
          </p>
        </Panel>

        <Panel title="よくある要望パターン" headingLevel={3}>
          <p>
            {form.requestPatterns.length === 0
              ? 'なし'
              : form.requestPatterns.map((pattern) => REQUEST_PATTERN_LABELS[pattern]).join('、')}
          </p>
          {form.integrationTools.length === 0 ? null : <p>連携ツール: {form.integrationTools.join('、')}</p>}
          {form.automationDescription ? <p>自動化したい内容: {form.automationDescription}</p> : null}
          {form.existingDataSources.length === 0 ? null : <p>既存データ: {form.existingDataSources.join('、')}</p>}
        </Panel>

        <Panel title="参考URL・添付" headingLevel={3}>
          {form.referenceUrls.length === 0 ? (
            <p>参考URL: なし</p>
          ) : (
            <ul>
              {form.referenceUrls.map((entry) => (
                <li key={entry.url}>{entry.url}</li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="要望" headingLevel={3}>
          <p>ほしい機能: {form.features}</p>
          <p>希望する出力: {form.output}</p>
        </Panel>

        <Panel title="削減時間の目安" headingLevel={3}>
          <p>月あたり約 {estimatedMonthlyHours.toFixed(1)} 時間</p>
          <p>
            この目安は既定の前提 (工数の {Math.round(DEFAULT_SHEET_REDUCTION_RATE * 100)}% を削減)
            で計算しています。正式な削減時間と金額は、送信後にテナントの設定にもとづいてサーバで計算します。
          </p>
        </Panel>
      </Stack>
    </section>
  );
}
