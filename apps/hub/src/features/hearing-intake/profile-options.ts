import type {
  HearingConstraintTag,
  HearingContext,
  HearingExpertise,
  HearingMotivation,
  HearingRole,
  HearingSharingIntent,
  HearingUsagePurpose,
} from '@harness-hub/schemas';

interface ProfileOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

const UNKNOWN = { value: 'unknown', label: '不明・わからない' } as const;

// 各 enum とも既存値は変更・削除せず末尾へ追加のみ (packages/schemas/hearing-intake/contracts.ts と同期を保つ)。
export const USAGE_PURPOSE_OPTIONS = [
  { value: 'app_development', label: 'アプリ開発' },
  { value: 'harness_development', label: 'ハーネス開発' },
  { value: 'system_development', label: 'システム開発' },
  { value: 'data_analysis', label: 'データ分析' },
  { value: 'document_creation', label: '資料・ドキュメント作成' },
  { value: 'customer_support', label: '問い合わせ対応' },
  { value: 'other', label: 'その他' },
  UNKNOWN,
] as const satisfies readonly ProfileOption<HearingUsagePurpose>[];

export const EXPERTISE_OPTIONS = [
  { value: 'novice', label: '非技術' },
  { value: 'intermediate', label: '中級' },
  { value: 'expert', label: '上級' },
  UNKNOWN,
] as const satisfies readonly ProfileOption<HearingExpertise>[];

export const ROLE_OPTIONS = [
  { value: 'individual', label: '個人事業主' },
  { value: 'employee', label: '会社員' },
  { value: 'executive', label: '経営者' },
  { value: 'creator', label: 'クリエイター' },
  { value: 'team_lead', label: 'チームリーダー' },
  { value: 'freelancer', label: 'フリーランス' },
  UNKNOWN,
] as const satisfies readonly ProfileOption<HearingRole>[];

export const CONTEXT_OPTIONS = [
  { value: 'business', label: '業務' },
  { value: 'personal', label: '個人' },
  { value: 'study', label: '学習' },
  { value: 'hobby', label: '趣味' },
  { value: 'side_business', label: '副業' },
  { value: 'nonprofit', label: '非営利活動' },
  UNKNOWN,
] as const satisfies readonly ProfileOption<HearingContext>[];

export const MOTIVATION_OPTIONS = [
  { value: 'efficiency', label: '効率化' },
  { value: 'quality', label: '品質' },
  { value: 'learning', label: '学習' },
  { value: 'branding', label: 'ブランディング' },
  { value: 'cost_reduction', label: 'コスト削減' },
  { value: 'risk_reduction', label: 'リスク低減' },
  UNKNOWN,
] as const satisfies readonly ProfileOption<HearingMotivation>[];

export const SHARING_INTENT_OPTIONS = [
  { value: 'self', label: '自分のみ' },
  { value: 'small_group', label: '少人数' },
  { value: 'public', label: '不特定多数' },
  { value: 'customer', label: '顧客' },
  { value: 'department', label: '部門内' },
  { value: 'partner_company', label: '取引先' },
  UNKNOWN,
] as const satisfies readonly ProfileOption<HearingSharingIntent>[];

export const CONSTRAINT_TAG_OPTIONS = [
  { value: 'time', label: '時間' },
  { value: 'budget', label: '予算' },
  { value: 'authority', label: '権限' },
  { value: 'knowledge', label: '知識' },
  UNKNOWN,
] as const satisfies readonly ProfileOption<HearingConstraintTag>[];

function labelsFrom<T extends string>(options: readonly ProfileOption<T>[]): Readonly<Record<T, string>> {
  return Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<T, string>;
}

export const USAGE_PURPOSE_LABELS = labelsFrom(USAGE_PURPOSE_OPTIONS);
export const EXPERTISE_LABELS = labelsFrom(EXPERTISE_OPTIONS);
export const ROLE_LABELS = labelsFrom(ROLE_OPTIONS);
export const CONTEXT_LABELS = labelsFrom(CONTEXT_OPTIONS);
export const MOTIVATION_LABELS = labelsFrom(MOTIVATION_OPTIONS);
export const SHARING_INTENT_LABELS = labelsFrom(SHARING_INTENT_OPTIONS);
export const CONSTRAINT_TAG_LABELS = labelsFrom(CONSTRAINT_TAG_OPTIONS);
