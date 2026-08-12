/**
 * ヒアリングシートの申請内容を「そのままコピペして次の作業に渡せるテキスト」へ変換する唯一の場所。
 *
 * DOM・クリップボード API に依存しない純粋関数群。テキストは Markdown 相当の見出し構造を持つが、
 * HTML としてはレンダリングしない (呼び出し側は `<pre>`/読み取り専用 textarea で表示する)。
 */
import type { HearingSheetFormSnapshot, SheetDetail } from '@harness-hub/schemas';

import {
  CONSTRAINT_TAG_LABELS,
  CONTEXT_LABELS,
  EXPERTISE_LABELS,
  MOTIVATION_LABELS,
  PROFILE_UNANSWERED_LABEL,
  ROLE_LABELS,
  SHARING_INTENT_LABELS,
  USAGE_PURPOSE_LABELS,
} from '../profile-options.js';

export type GeneratedSections = NonNullable<SheetDetail['generated_sections']>;

export interface BuildHandoffInput {
  readonly formSnapshot: HearingSheetFormSnapshot;
  readonly generatedSections: GeneratedSections | null;
}

const PRIORITY_LABELS: Readonly<Record<HearingSheetFormSnapshot['priority'], string>> = {
  high: '高',
  medium: '中',
  low: '低',
};

function formatConstraintTags(tags: HearingSheetFormSnapshot['constraintTags']): string {
  if (tags === null) return PROFILE_UNANSWERED_LABEL;
  if (tags.length === 0) return 'なし';
  return tags.map((tag) => CONSTRAINT_TAG_LABELS[tag]).join('、');
}

function formatProfileList(entries: readonly string[] | null): string {
  if (entries === null) return PROFILE_UNANSWERED_LABEL;
  if (entries.length === 0) return 'なし';
  return entries.map((entry) => `- ${entry}`).join('\n');
}

function formatProfileAnswer<T extends string>(value: T | null, labels: Readonly<Record<T, string>>): string {
  return value === null ? PROFILE_UNANSWERED_LABEL : labels[value];
}

function formatProfileText(value: string | null): string {
  return value ?? PROFILE_UNANSWERED_LABEL;
}

function formatGeneratedSections(sections: GeneratedSections | null): string {
  if (sections === null) return '（未生成）';
  return [
    `### 概要\n${sections.overview}`,
    `### 現在の課題\n${sections.issue}`,
    `### 推奨機能タグ\n${sections.feature_tags.map((tag) => `- ${tag}`).join('\n')}`,
    `### 想定削減効果\n${sections.estimated_effect}`,
  ].join('\n\n');
}

/**
 * HarnessCreator へそのまま貼り付けてハーネス構築に着手できるテキストを組み立てる。
 * 5 軸（出力先・情報源・共有相手・真の課題・ナレッジ資産）と用途プロファイルを、別の見出しで混ぜずに含める。
 */
export function buildHarnessCreatorHandoff({ formSnapshot, generatedSections }: BuildHandoffInput): string {
  const form = formSnapshot;
  return [
    '# HarnessCreator 引き渡し',
    '',
    `## 用途\n${formatProfileAnswer(form.usagePurpose, USAGE_PURPOSE_LABELS)}`,
    '',
    `## 現在の困りごと\n${form.issue}`,
    '',
    `## 真の課題\n${formatProfileText(form.trueProblem)}`,
    '',
    `## 情報源\n${formatProfileList(form.informationSources)}`,
    '',
    `## 出力先\n${form.output}`,
    '',
    `## 共有相手\n${formatProfileText(form.shareTarget)}`,
    '',
    `## ナレッジ資産\n${formatProfileList(form.knowledgeAssets)}`,
    '',
    `## 依頼者の熟練度\n${formatProfileAnswer(form.expertise, EXPERTISE_LABELS)}`,
    '',
    `## 制約\n${formatConstraintTags(form.constraintTags)}`,
    '',
    `## 優先度\n${PRIORITY_LABELS[form.priority]}`,
    '',
    '## 生成済みセクション',
    formatGeneratedSections(generatedSections),
  ].join('\n');
}

/**
 * app-orchestrator / システムプランナー (システム開発エージェント) へそのまま渡せるテキストを組み立てる。
 * 業務名・会社名・業務領域・課題・ほしい機能・希望する出力・優先度・用途プロファイル一式を含める。
 */
export function buildSystemOrchestratorHandoff({ formSnapshot, generatedSections }: BuildHandoffInput): string {
  const form = formSnapshot;
  return [
    '# システム開発 引き渡し',
    '',
    `## 業務名\n${form.taskName}`,
    '',
    `## 会社名\n${form.company}`,
    '',
    `## 業務領域\n${form.domain}`,
    '',
    `## 課題\n${form.issue}`,
    '',
    `## 真の課題\n${formatProfileText(form.trueProblem)}`,
    '',
    `## 情報源\n${formatProfileList(form.informationSources)}`,
    '',
    `## ほしい機能（画面・機能）\n${form.features}`,
    '',
    `## 希望する出力\n${form.output}`,
    '',
    `## 共有相手\n${formatProfileText(form.shareTarget)}`,
    '',
    `## ナレッジ資産\n${formatProfileList(form.knowledgeAssets)}`,
    '',
    `## 優先度\n${PRIORITY_LABELS[form.priority]}`,
    '',
    '## 用途プロファイル',
    `- 用途: ${formatProfileAnswer(form.usagePurpose, USAGE_PURPOSE_LABELS)}`,
    `- 熟練度: ${formatProfileAnswer(form.expertise, EXPERTISE_LABELS)}`,
    `- 役割: ${formatProfileAnswer(form.role, ROLE_LABELS)}`,
    `- 文脈（業務フロー上の位置づけ）: ${formatProfileAnswer(form.context, CONTEXT_LABELS)}`,
    `- 動機: ${formatProfileAnswer(form.motivation, MOTIVATION_LABELS)}`,
    `- 共有意図: ${formatProfileAnswer(form.sharingIntent, SHARING_INTENT_LABELS)}`,
    `- 制約: ${formatConstraintTags(form.constraintTags)}`,
    '',
    '## 生成済みセクション',
    formatGeneratedSections(generatedSections),
  ].join('\n');
}
