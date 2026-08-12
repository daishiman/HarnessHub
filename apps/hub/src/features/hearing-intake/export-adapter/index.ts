/**
 * ヒアリングシートの申請内容を「そのままコピペして次の作業に渡せるテキスト」へ変換する唯一の場所。
 *
 * DOM・クリップボード API に依存しない純粋関数群。テキストは Markdown 相当の見出し構造を持つが、
 * HTML としてはレンダリングしない (呼び出し側は `<pre>`/読み取り専用 textarea で表示する)。
 *
 * `buildHarnessCreatorHandoffInstruction`/`buildSystemOrchestratorHandoffInstruction` は
 * トークン付き共有 URL 方式 (feat-hearing-intake 追加要件) の instruction_text を作る短い誘導文。
 * 「取得しに行かせる誘導文」であって、詳細な引き渡しテキストそのもの (= 上の handoff 関数の出力) は
 * 依頼者が API を叩いて都度取得する設計にしてある (シート編集後の古い内容を配り続けない)。
 */
import type { HearingSheetFormSnapshot, SheetDetail } from '@harness-hub/schemas';

export type GeneratedSections = NonNullable<SheetDetail['generated_sections']>;

export interface BuildHandoffInput {
  readonly formSnapshot: HearingSheetFormSnapshot;
  readonly generatedSections: GeneratedSections | null;
}

const UNKNOWN_LABEL = '不明・わからない';
/** informationSources/trueProblem はまだウィザード UI が無く、null (未回答) のままのことが多い。 */
const UNANSWERED_LABEL = '未回答';

const USAGE_PURPOSE_LABELS: Readonly<Record<HearingSheetFormSnapshot['usagePurpose'], string>> = {
  app_development: 'アプリ開発',
  harness_development: 'ハーネス開発',
  system_development: 'システム開発',
  other: 'その他',
  unknown: UNKNOWN_LABEL,
};

const EXPERTISE_LABELS: Readonly<Record<HearingSheetFormSnapshot['expertise'], string>> = {
  novice: '非技術',
  intermediate: '中級',
  expert: '上級',
  unknown: UNKNOWN_LABEL,
};

const ROLE_LABELS: Readonly<Record<HearingSheetFormSnapshot['role'], string>> = {
  individual: '個人事業主',
  employee: '会社員',
  executive: '経営者',
  creator: 'クリエイター',
  unknown: UNKNOWN_LABEL,
};

const CONTEXT_LABELS: Readonly<Record<HearingSheetFormSnapshot['context'], string>> = {
  business: '業務',
  personal: '個人',
  study: '学習',
  hobby: '趣味',
  unknown: UNKNOWN_LABEL,
};

const MOTIVATION_LABELS: Readonly<Record<HearingSheetFormSnapshot['motivation'], string>> = {
  efficiency: '効率化',
  quality: '品質',
  learning: '学習',
  branding: 'ブランディング',
  unknown: UNKNOWN_LABEL,
};

const SHARING_INTENT_LABELS: Readonly<Record<HearingSheetFormSnapshot['sharingIntent'], string>> = {
  self: '自分のみ',
  small_group: '少人数',
  public: '不特定多数',
  customer: '顧客',
  unknown: UNKNOWN_LABEL,
};

const CONSTRAINT_TAG_LABELS: Readonly<Record<HearingSheetFormSnapshot['constraintTags'][number], string>> = {
  time: '時間',
  budget: '予算',
  authority: '権限',
  knowledge: '知識',
  unknown: UNKNOWN_LABEL,
};

const PRIORITY_LABELS: Readonly<Record<HearingSheetFormSnapshot['priority'], string>> = {
  high: '高',
  medium: '中',
  low: '低',
};

const REQUEST_PATTERN_LABELS: Readonly<Record<HearingSheetFormSnapshot['requestPatterns'][number], string>> = {
  integration: '連携したい',
  automation: '自動化したい',
  data_digitization: 'データを仕組み化したい',
  unknown: UNKNOWN_LABEL,
};

const INTEGRATION_TOOL_LABELS: Readonly<Record<HearingSheetFormSnapshot['integrationTools'][number], string>> = {
  slack: 'Slack',
  notion: 'Notion',
  gmail: 'Gmail',
  google_calendar: 'Google カレンダー',
  chat_tool_other: 'チャットツール（その他）',
  file_storage: 'ファイルストレージ',
  other: 'その他',
};

const EXISTING_DATA_SOURCE_LABELS: Readonly<Record<HearingSheetFormSnapshot['existingDataSources'][number], string>> = {
  spreadsheet: 'スプレッドシート',
  paper_documents: '紙の書類',
  email: 'メール',
  database: 'データベース',
  none: 'なし',
  other: 'その他',
};

function formatConstraintTags(tags: HearingSheetFormSnapshot['constraintTags']): string {
  if (tags.length === 0) return 'なし';
  return tags.map((tag) => CONSTRAINT_TAG_LABELS[tag]).join('、');
}

function formatKnowledgeAssets(assets: readonly string[]): string {
  if (assets.length === 0) return 'なし';
  return assets.map((asset) => `- ${asset}`).join('\n');
}

/** informationSources はまだウィザード UI が無いため、null (未回答) を明示的に表示する。 */
function formatOptionalList(entries: readonly string[] | null): string {
  if (entries === null) return UNANSWERED_LABEL;
  if (entries.length === 0) return 'なし';
  return entries.map((entry) => `- ${entry}`).join('\n');
}

/** trueProblem はまだウィザード UI が無いため、null (未回答) を明示的に表示する。 */
function formatOptionalText(value: string | null): string {
  return value === null ? UNANSWERED_LABEL : value;
}

function formatMultiSelect<T extends string>(
  values: readonly T[],
  labels: Readonly<Record<T, string>>,
  otherText?: string | null,
): string {
  if (values.length === 0) return 'なし';
  const rendered = values.map((value) => {
    if (value === 'other' && otherText !== undefined && otherText !== null && otherText.trim().length > 0) {
      return `${labels[value]}（${otherText.trim()}）`;
    }
    return labels[value];
  });
  return rendered.join('、');
}

function formatReferenceUrls(urls: HearingSheetFormSnapshot['referenceUrls']): string {
  if (urls.length === 0) return 'なし';
  return urls.map((entry) => (entry.note ? `- ${entry.url}（${entry.note}）` : `- ${entry.url}`)).join('\n');
}

function formatRequestPatternDetails(form: HearingSheetFormSnapshot): string {
  const lines: string[] = [];
  if (form.requestPatterns.includes('integration')) {
    lines.push(
      `- 連携したいツール: ${formatMultiSelect(form.integrationTools, INTEGRATION_TOOL_LABELS, form.integrationToolsOther)}`,
    );
  }
  if (form.requestPatterns.includes('automation')) {
    lines.push(`- 自動化したい内容: ${form.automationDescription?.trim() || '（未記入）'}`);
  }
  if (form.requestPatterns.includes('data_digitization')) {
    lines.push(
      `- 既存データの所在: ${formatMultiSelect(form.existingDataSources, EXISTING_DATA_SOURCE_LABELS, form.existingDataSourcesOther)}`,
    );
  }
  return lines.length === 0 ? 'なし' : lines.join('\n');
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
 * `'unknown'` が選ばれている項目 (単一選択 enum が `'unknown'`、または多肢選択配列が
 * `['unknown']` のみ) を集計する。依頼者要件: 未回答を後から追跡できるようにするため、
 * 「■ 要ヒアリング項目 (未回答・要確認)」セクションで一覧提示する。
 */
function collectUnknownFields(form: HearingSheetFormSnapshot): readonly string[] {
  const unknowns: string[] = [];
  if (form.usagePurpose === 'unknown') unknowns.push('用途');
  if (form.expertise === 'unknown') unknowns.push('依頼者の熟練度');
  if (form.role === 'unknown') unknowns.push('役割');
  if (form.context === 'unknown') unknowns.push('文脈（業務フロー上の位置づけ）');
  if (form.motivation === 'unknown') unknowns.push('動機');
  if (form.sharingIntent === 'unknown') unknowns.push('共有意図');
  if (form.constraintTags.length === 1 && form.constraintTags[0] === 'unknown') unknowns.push('制約');
  if (form.requestPatterns.length === 1 && form.requestPatterns[0] === 'unknown') unknowns.push('よくある要望パターン');
  return unknowns;
}

function formatUnknownSection(form: HearingSheetFormSnapshot): string {
  const unknowns = collectUnknownFields(form);
  if (unknowns.length === 0) return '';
  return `\n\n## ■ 要ヒアリング項目（未回答・要確認）\n${unknowns.map((field) => `- ${field}`).join('\n')}`;
}

/**
 * HarnessCreator へそのまま貼り付けてハーネス構築に着手できるテキストを組み立てる。
 * 用途・真の課題・情報源・出力先・共有相手・ナレッジ資産・熟練度・制約・優先度・要望パターン・
 * 連携ツール・自動化内容・既存データ・参考URL・生成済みセクションを含める。
 */
export function buildHarnessCreatorHandoff({ formSnapshot, generatedSections }: BuildHandoffInput): string {
  const form = formSnapshot;
  return (
    [
      '# HarnessCreator 引き渡し',
      '',
      `## 用途\n${USAGE_PURPOSE_LABELS[form.usagePurpose]}`,
      '',
      `## 現在の困りごと\n${form.issue}`,
      '',
      `## 真の課題\n${formatOptionalText(form.trueProblem)}`,
      '',
      `## 情報源\n${formatOptionalList(form.informationSources)}`,
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
      `## よくある要望パターン\n${formatMultiSelect(form.requestPatterns, REQUEST_PATTERN_LABELS)}`,
      '',
      `## 要望パターンの詳細\n${formatRequestPatternDetails(form)}`,
      '',
      `## 参考URL\n${formatReferenceUrls(form.referenceUrls)}`,
      '',
      '## 生成済みセクション',
      formatGeneratedSections(generatedSections),
    ].join('\n') + formatUnknownSection(form)
  );
}

/**
 * app-orchestrator / システムプランナー (システム開発エージェント) へそのまま渡せるテキストを組み立てる。
 * 業務名・会社名・業務領域・課題・真の課題・情報源・ほしい機能・希望する出力・優先度・用途プロファイル一式・
 * 要望パターン・連携ツール・自動化内容・既存データ・参考URLを含める。
 */
export function buildSystemOrchestratorHandoff({ formSnapshot, generatedSections }: BuildHandoffInput): string {
  const form = formSnapshot;
  return (
    [
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
      `## 真の課題\n${formatOptionalText(form.trueProblem)}`,
      '',
      `## 情報源\n${formatOptionalList(form.informationSources)}`,
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
      `## よくある要望パターン\n${formatMultiSelect(form.requestPatterns, REQUEST_PATTERN_LABELS)}`,
      '',
      `## 要望パターンの詳細\n${formatRequestPatternDetails(form)}`,
      '',
      `## 参考URL\n${formatReferenceUrls(form.referenceUrls)}`,
      '',
      '## 生成済みセクション',
      formatGeneratedSections(generatedSections),
    ].join('\n') + formatUnknownSection(form)
  );
}

export interface BuildHandoffInstructionInput {
  readonly shareUrl: string;
}

/**
 * Claude Code へそのまま貼り付ける短い誘導文 (HarnessCreator 向け)。
 * instruction は「取得しに行かせる誘導文」、詳細な引き渡しテキストは
 * `handoff_text` (= `buildHarnessCreatorHandoff` の出力、API 応答側) が担う。
 */
export function buildHarnessCreatorHandoffInstruction({ shareUrl }: BuildHandoffInstructionInput): string {
  return [
    '以下の API からヒアリング内容を取得し、その内容をもとに HarnessCreator でハーネスを構築してください。',
    '',
    `API: ${shareUrl}`,
  ].join('\n');
}

/**
 * Claude Code へそのまま貼り付ける短い誘導文 (システム開発向け)。
 */
export function buildSystemOrchestratorHandoffInstruction({ shareUrl }: BuildHandoffInstructionInput): string {
  return [
    '以下の API からヒアリング内容を取得し、その内容をもとにアプリ/システムの開発計画を立ててください。',
    '',
    `API: ${shareUrl}`,
  ].join('\n');
}
