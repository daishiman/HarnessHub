/** ドメイン enum → 表示ラベル・配色の唯一の写像点 (frontend-spec §2.4)。画面へのラベル直書きを禁止する。 */
import type { ColorTokenName } from '../tokens/tokens.js';
import type { UiLocale } from './dictionaries.js';

/** 状態チップの意味づけ。色そのものではなく「意味」を指す。 */
export type StatusTone = 'neutral' | 'primary' | 'accentAi' | 'success' | 'warning' | 'danger' | 'info' | 'magenta';

/** tone → 色 token。文字色と背景色の組は tokens の contrastRequirements で 4.5:1 が保証されている。 */
export const statusToneColors: Record<StatusTone, { foreground: ColorTokenName; background: ColorTokenName }> = {
  neutral: { foreground: 'textMuted', background: 'neutralSoft' },
  primary: { foreground: 'primary', background: 'primarySoft' },
  accentAi: { foreground: 'accentAi', background: 'accentAiSoft' },
  success: { foreground: 'success', background: 'successSoft' },
  warning: { foreground: 'warning', background: 'warningSoft' },
  danger: { foreground: 'danger', background: 'dangerSoft' },
  info: { foreground: 'infoCyan', background: 'infoSoft' },
  magenta: { foreground: 'magenta', background: 'magentaSoft' },
};

interface StatusEntry {
  tone: StatusTone;
  labels: Record<UiLocale, string>;
}

const entry = (tone: StatusTone, ja: string, en: string): StatusEntry => ({ tone, labels: { ja, en } });

/**
 * 状態語彙の登録簿。backend-spec §5 の enum を鍵にする。
 * 新しい状態を足すときは、必ずここに ja/en と tone を登録してから画面で使う。
 */
export const statusVocabulary = {
  sheet: {
    received: entry('info', '受付', 'Received'),
    generating: entry('accentAi', '生成中', 'Generating'),
    review: entry('warning', 'レビュー待ち', 'In review'),
    completed: entry('success', '完了', 'Completed'),
  },
  buildStage: {
    hearing: entry('primary', 'ヒアリング', 'Hearing'),
    requirements: entry('primary', '要件定義', 'Requirements'),
    design: entry('primary', '設計', 'Design'),
    build: entry('primary', '構築', 'Build'),
    test: entry('primary', 'テスト', 'Test'),
    review: entry('primary', 'レビュー', 'Review'),
    publish: entry('success', '公開', 'Publish'),
  },
  feedback: {
    open: entry('danger', '未対応', 'Open'),
    in_progress: entry('warning', '対応中', 'In progress'),
    resolved: entry('success', '対応済み', 'Resolved'),
  },
  publish: {
    draft: entry('neutral', '下書き', 'Draft'),
    inspecting: entry('accentAi', '検査中', 'Inspecting'),
    needs_fix: entry('warning', '要修正', 'Needs fix'),
    approval_pending: entry('warning', '承認待ち', 'Awaiting approval'),
    approved: entry('primary', '承認済み', 'Approved'),
    publishing: entry('accentAi', '公開処理中', 'Publishing'),
    published: entry('success', '公開済み', 'Published'),
    rejected: entry('danger', '却下', 'Rejected'),
    failed: entry('danger', '失敗', 'Failed'),
  },
  release: {
    available: entry('success', '公開中', 'Available'),
    suspended: entry('danger', '停止中', 'Suspended'),
    deprecated: entry('neutral', '非推奨', 'Deprecated'),
  },
} as const satisfies Record<string, Record<string, StatusEntry>>;

export type StatusDomain = keyof typeof statusVocabulary;
export type StatusValue<D extends StatusDomain> = keyof (typeof statusVocabulary)[D];

function lookup<D extends StatusDomain>(domain: D, value: StatusValue<D>): StatusEntry {
  const found = (statusVocabulary[domain] as Record<string, StatusEntry>)[value as string];
  if (!found) {
    throw new Error(`状態語彙に未登録です: ${domain}.${String(value)}`);
  }
  return found;
}

/** 表示ラベルを引く。 */
export function getStatusLabel<D extends StatusDomain>(domain: D, value: StatusValue<D>, locale: UiLocale): string {
  return lookup(domain, value).labels[locale];
}

/** 状態チップの tone を引く。 */
export function getStatusTone<D extends StatusDomain>(domain: D, value: StatusValue<D>): StatusTone {
  return lookup(domain, value).tone;
}
