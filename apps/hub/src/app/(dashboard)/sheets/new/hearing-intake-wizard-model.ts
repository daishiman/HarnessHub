import type {
  HearingConstraintTag,
  HearingExistingDataSource,
  HearingIntegrationTool,
  HearingRequestPattern,
  HearingSheetFormInput,
} from '@harness-hub/schemas';

// 実在する回答を初期値で捏造しない。選択式は明示的な「不明」から始める。
export const INITIAL_HEARING_FORM: HearingSheetFormInput = {
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
  usagePurpose: 'unknown',
  expertise: 'unknown',
  role: 'unknown',
  context: 'unknown',
  motivation: 'unknown',
  sharingIntent: 'unknown',
  constraintTags: ['unknown'],
  shareTarget: '',
  informationSources: null,
  trueProblem: null,
  knowledgeAssets: [],
  requestPatterns: ['unknown'],
  integrationTools: [],
  existingDataSources: [],
  referenceUrls: [],
};

export const UNKNOWN_OPTION = { value: 'unknown', label: '不明・わからない' } as const;

export const CONSTRAINT_TAG_OPTIONS: readonly { value: HearingConstraintTag; label: string }[] = [
  { value: 'time', label: '時間' },
  { value: 'budget', label: '予算' },
  { value: 'authority', label: '権限' },
  { value: 'knowledge', label: '知識' },
  UNKNOWN_OPTION,
];

export const REQUEST_PATTERN_OPTIONS: readonly { value: HearingRequestPattern; label: string }[] = [
  { value: 'integration', label: '連携したい' },
  { value: 'automation', label: '自動化したい' },
  { value: 'data_digitization', label: 'データを仕組み化したい' },
  UNKNOWN_OPTION,
];

export const INTEGRATION_TOOL_OPTIONS: readonly { value: HearingIntegrationTool; label: string }[] = [
  { value: 'slack', label: 'Slack' },
  { value: 'notion', label: 'Notion' },
  { value: 'gmail', label: 'Gmail' },
  { value: 'google_calendar', label: 'Google カレンダー' },
  { value: 'chat_tool_other', label: 'チャットツール（その他）' },
  { value: 'file_storage', label: 'ファイルストレージ' },
  { value: 'other', label: 'その他' },
];

export const EXISTING_DATA_SOURCE_OPTIONS: readonly { value: HearingExistingDataSource; label: string }[] = [
  { value: 'spreadsheet', label: 'スプレッドシート' },
  { value: 'paper_documents', label: '紙の書類' },
  { value: 'email', label: 'メール' },
  { value: 'database', label: 'データベース' },
  { value: 'none', label: 'なし' },
  { value: 'other', label: 'その他' },
];

interface SelectOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

function labelsFromOptions<T extends string>(options: readonly SelectOption<T>[]): Readonly<Record<T, string>> {
  return Object.fromEntries(options.map((option) => [option.value, option.label])) as Readonly<Record<T, string>>;
}

export const USAGE_PURPOSE_OPTIONS: readonly SelectOption<HearingSheetFormInput['usagePurpose']>[] = [
  { value: 'app_development', label: 'アプリ開発' },
  { value: 'harness_development', label: 'ハーネス開発' },
  { value: 'system_development', label: 'システム開発' },
  { value: 'other', label: 'その他' },
  UNKNOWN_OPTION,
];

export const EXPERTISE_OPTIONS: readonly SelectOption<HearingSheetFormInput['expertise']>[] = [
  { value: 'novice', label: '非技術' },
  { value: 'intermediate', label: '中級' },
  { value: 'expert', label: '上級' },
  UNKNOWN_OPTION,
];

export const ROLE_OPTIONS: readonly SelectOption<HearingSheetFormInput['role']>[] = [
  { value: 'individual', label: '個人事業主' },
  { value: 'employee', label: '会社員' },
  { value: 'executive', label: '経営者' },
  { value: 'creator', label: 'クリエイター' },
  UNKNOWN_OPTION,
];

export const CONTEXT_OPTIONS: readonly SelectOption<HearingSheetFormInput['context']>[] = [
  { value: 'business', label: '業務' },
  { value: 'personal', label: '個人' },
  { value: 'study', label: '学習' },
  { value: 'hobby', label: '趣味' },
  UNKNOWN_OPTION,
];

export const MOTIVATION_OPTIONS: readonly SelectOption<HearingSheetFormInput['motivation']>[] = [
  { value: 'efficiency', label: '効率化' },
  { value: 'quality', label: '品質' },
  { value: 'learning', label: '学習' },
  { value: 'branding', label: 'ブランディング' },
  UNKNOWN_OPTION,
];

export const SHARING_INTENT_OPTIONS: readonly SelectOption<HearingSheetFormInput['sharingIntent']>[] = [
  { value: 'self', label: '自分のみ' },
  { value: 'small_group', label: '少人数' },
  { value: 'public', label: '不特定多数' },
  { value: 'customer', label: '顧客' },
  UNKNOWN_OPTION,
];

export const USAGE_PURPOSE_LABELS = labelsFromOptions(USAGE_PURPOSE_OPTIONS);
export const EXPERTISE_LABELS = labelsFromOptions(EXPERTISE_OPTIONS);
export const ROLE_LABELS = labelsFromOptions(ROLE_OPTIONS);
export const CONTEXT_LABELS = labelsFromOptions(CONTEXT_OPTIONS);
export const MOTIVATION_LABELS = labelsFromOptions(MOTIVATION_OPTIONS);
export const SHARING_INTENT_LABELS = labelsFromOptions(SHARING_INTENT_OPTIONS);
export const CONSTRAINT_TAG_LABELS = labelsFromOptions(CONSTRAINT_TAG_OPTIONS);
export const REQUEST_PATTERN_LABELS = labelsFromOptions(REQUEST_PATTERN_OPTIONS);

export function toggleWithExclusiveValue<T extends string>(current: readonly T[], next: T, exclusiveValue: T): T[] {
  if (next === exclusiveValue) return current.includes(exclusiveValue) ? [] : [exclusiveValue];
  const withoutExclusiveValue = current.filter((item) => item !== exclusiveValue);
  return withoutExclusiveValue.includes(next)
    ? withoutExclusiveValue.filter((item) => item !== next)
    : [...withoutExclusiveValue, next];
}

/** 親の選択を外した時点で、非表示になった子項目も破棄して送信値を一貫させる。 */
export function toggleRequestPatternOnForm(
  form: HearingSheetFormInput,
  pattern: HearingRequestPattern,
): HearingSheetFormInput {
  const requestPatterns = toggleWithExclusiveValue(form.requestPatterns, pattern, 'unknown');
  return {
    ...form,
    requestPatterns,
    ...(!requestPatterns.includes('integration') ? { integrationTools: [], integrationToolsOther: undefined } : {}),
    ...(!requestPatterns.includes('automation') ? { automationDescription: undefined } : {}),
    ...(!requestPatterns.includes('data_digitization')
      ? { existingDataSources: [], existingDataSourcesOther: undefined }
      : {}),
  };
}

/** 「その他」の補足は、その選択肢を外した時点で送信値からも除く。 */
export function toggleIntegrationToolOnForm(
  form: HearingSheetFormInput,
  tool: HearingIntegrationTool,
): HearingSheetFormInput {
  const integrationTools = form.integrationTools.includes(tool)
    ? form.integrationTools.filter((existing) => existing !== tool)
    : [...form.integrationTools, tool];
  return {
    ...form,
    integrationTools,
    ...(!integrationTools.includes('other') ? { integrationToolsOther: undefined } : {}),
  };
}

/** 「なし」を他のデータ種別と排他にし、非表示の「その他」補足を残さない。 */
export function toggleExistingDataSourceOnForm(
  form: HearingSheetFormInput,
  source: HearingExistingDataSource,
): HearingSheetFormInput {
  const existingDataSources = toggleWithExclusiveValue(form.existingDataSources, source, 'none');
  return {
    ...form,
    existingDataSources,
    ...(!existingDataSources.includes('other') ? { existingDataSourcesOther: undefined } : {}),
  };
}

export function collectUnknownFields(form: HearingSheetFormInput): readonly string[] {
  const fields: string[] = [];
  if (form.usagePurpose === 'unknown') fields.push('用途');
  if (form.expertise === 'unknown') fields.push('依頼者の熟練度');
  if (form.role === 'unknown') fields.push('役割');
  if (form.context === 'unknown') fields.push('文脈');
  if (form.motivation === 'unknown') fields.push('動機');
  if (form.sharingIntent === 'unknown') fields.push('共有意図');
  if (form.constraintTags.length === 1 && form.constraintTags[0] === 'unknown') fields.push('制約');
  if (form.requestPatterns.length === 1 && form.requestPatterns[0] === 'unknown') {
    fields.push('よくある要望パターン');
  }
  return fields;
}

function requiredText(value: string): boolean {
  return value.trim().length > 0;
}

/** 8段それぞれの「次へ」条件。最終的な28項目の正本検証はAPI共有schemaが担う。 */
export function canProceedAtStep(form: HearingSheetFormInput, activeIndex: number): boolean {
  return (
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
      [form.usagePurpose, form.expertise, form.role, form.context, form.motivation, form.sharingIntent].every(
        requiredText,
      ) &&
        requiredText(form.shareTarget) &&
        form.knowledgeAssets.length >= 1,
      (!form.requestPatterns.includes('integration') ||
        (form.integrationTools.length >= 1 &&
          (!form.integrationTools.includes('other') || requiredText(form.integrationToolsOther ?? '')))) &&
        (!form.requestPatterns.includes('data_digitization') ||
          (form.existingDataSources.length >= 1 &&
            (!form.existingDataSources.includes('other') || requiredText(form.existingDataSourcesOther ?? '')))),
      true,
      requiredText(form.features) && requiredText(form.output),
      true,
      true,
    ][activeIndex] ?? false
  );
}
