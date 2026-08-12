/**
 * ヒアリングシートの申請内容を「そのままコピペして次の作業に渡せるテキスト」へ変換する唯一の場所。
 *
 * DOM・クリップボード API に依存しない純粋関数群。テキストは Markdown 相当の見出し構造を持つが、
 * HTML としてはレンダリングしない (呼び出し側は `<pre>`/読み取り専用 textarea で表示する)。
 */
import type { HearingSheetFormSnapshot, SheetDetail } from '@harness-hub/schemas';

export type GeneratedSections = NonNullable<SheetDetail['generated_sections']>;

export interface BuildHandoffInput {
  readonly formSnapshot: HearingSheetFormSnapshot;
  readonly generatedSections: GeneratedSections | null;
}

const USAGE_PURPOSE_LABELS: Readonly<Record<HearingSheetFormSnapshot['usagePurpose'], string>> = {
  app_development: 'アプリ開発',
  harness_development: 'ハーネス開発',
  system_development: 'システム開発',
  other: 'その他',
};

const EXPERTISE_LABELS: Readonly<Record<HearingSheetFormSnapshot['expertise'], string>> = {
  novice: '非技術',
  intermediate: '中級',
  expert: '上級',
};

const ROLE_LABELS: Readonly<Record<HearingSheetFormSnapshot['role'], string>> = {
  individual: '個人事業主',
  employee: '会社員',
  executive: '経営者',
  creator: 'クリエイター',
};

const CONTEXT_LABELS: Readonly<Record<HearingSheetFormSnapshot['context'], string>> = {
  business: '業務',
  personal: '個人',
  study: '学習',
  hobby: '趣味',
};

const MOTIVATION_LABELS: Readonly<Record<HearingSheetFormSnapshot['motivation'], string>> = {
  efficiency: '効率化',
  quality: '品質',
  learning: '学習',
  branding: 'ブランディング',
};

const SHARING_INTENT_LABELS: Readonly<Record<HearingSheetFormSnapshot['sharingIntent'], string>> = {
  self: '自分のみ',
  small_group: '少人数',
  public: '不特定多数',
  customer: '顧客',
};

const CONSTRAINT_TAG_LABELS: Readonly<Record<HearingSheetFormSnapshot['constraintTags'][number], string>> = {
  time: '時間',
  budget: '予算',
  authority: '権限',
  knowledge: '知識',
};

const PRIORITY_LABELS: Readonly<Record<HearingSheetFormSnapshot['priority'], string>> = {
  high: '高',
  medium: '中',
  low: '低',
};

function formatConstraintTags(tags: HearingSheetFormSnapshot['constraintTags']): string {
  if (tags.length === 0) return 'なし';
  return tags.map((tag) => CONSTRAINT_TAG_LABELS[tag]).join('、');
}

function formatKnowledgeAssets(assets: readonly string[]): string {
  return assets.map((asset) => `- ${asset}`).join('\n');
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
 * 用途・真の課題・出力先・共有相手・ナレッジ資産・熟練度・制約・優先度・生成済みセクションを含める。
 */
export function buildHarnessCreatorHandoff({ formSnapshot, generatedSections }: BuildHandoffInput): string {
  const form = formSnapshot;
  return [
    '# HarnessCreator 引き渡し',
    '',
    `## 用途\n${USAGE_PURPOSE_LABELS[form.usagePurpose]}`,
    '',
    `## 真の課題\n${form.issue}`,
    '',
    `## 出力先\n${form.output}`,
    '',
    `## 共有相手\n${form.shareTarget}`,
    '',
    `## ナレッジ資産\n${formatKnowledgeAssets(form.knowledgeAssets)}`,
    '',
    `## 依頼者の熟練度\n${EXPERTISE_LABELS[form.expertise]}`,
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
    `## ほしい機能（画面・機能）\n${form.features}`,
    '',
    `## 希望する出力\n${form.output}`,
    '',
    `## 優先度\n${PRIORITY_LABELS[form.priority]}`,
    '',
    '## 用途プロファイル',
    `- 用途: ${USAGE_PURPOSE_LABELS[form.usagePurpose]}`,
    `- 熟練度: ${EXPERTISE_LABELS[form.expertise]}`,
    `- 役割: ${ROLE_LABELS[form.role]}`,
    `- 文脈（業務フロー上の位置づけ）: ${CONTEXT_LABELS[form.context]}`,
    `- 動機: ${MOTIVATION_LABELS[form.motivation]}`,
    `- 共有意図: ${SHARING_INTENT_LABELS[form.sharingIntent]}`,
    `- 制約: ${formatConstraintTags(form.constraintTags)}`,
    `- 共有相手: ${form.shareTarget}`,
    '',
    '## 生成済みセクション',
    formatGeneratedSections(generatedSections),
  ].join('\n');
}
