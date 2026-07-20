/** @harness-hub/ui の公開 API 単一入口。consumer は必ずここ経由で参照する (内部実装への deep import 禁止)。 */

// --- design tokens -------------------------------------------------------
export {
  themeNames,
  densityNames,
  colorTokens,
  spacingTokens,
  radiusTokens,
  typographyTokens,
  densityTokens,
  chartSeriesTokens,
  contrastRequirements,
  checkContrastRequirements,
  colorVariableName,
  buildThemeCss,
} from './tokens/tokens.js';
export type {
  ThemeName,
  ThemePreference,
  Density,
  ColorTokenName,
  SpacingTokenName,
  RadiusTokenName,
  TypographyTokenName,
  ContrastRequirement,
  ContrastCheckResult,
} from './tokens/tokens.js';

export {
  parseHexColor,
  relativeLuminance,
  contrastRatio,
  meetsTextContrast,
  AA_CONTRAST_TEXT,
  AA_CONTRAST_LARGE_TEXT,
  AA_CONTRAST_NON_TEXT,
} from './tokens/contrast.js';

// --- テーマ・表示密度・言語 ----------------------------------------------
export { UiProvider, useUi, useUiText, defaultUiPreferences } from './theme/UiProvider.js';
export type { UiProviderProps, UiPreferences, UiContextValue } from './theme/UiProvider.js';

export {
  uiLocales,
  uiMessages,
  jaMessages,
  enMessages,
  translateUiMessage,
} from './i18n/dictionaries.js';
export type { UiLocale, UiMessageKey } from './i18n/dictionaries.js';

export {
  statusVocabulary,
  statusToneColors,
  getStatusLabel,
  getStatusTone,
} from './i18n/status-vocabulary.js';
export type { StatusTone, StatusDomain, StatusValue } from './i18n/status-vocabulary.js';

// --- フォーム部品 --------------------------------------------------------
export { Button } from './components/Button.js';
export type { ButtonProps, ButtonVariant } from './components/Button.js';
export { FormField } from './components/FormField.js';
export type { FormFieldProps, FieldControlProps } from './components/FormField.js';
export { TextInput } from './components/TextInput.js';
export type { TextInputProps } from './components/TextInput.js';
export { Select } from './components/Select.js';
export type { SelectProps, SelectOption } from './components/Select.js';
export { Textarea } from './components/Textarea.js';
export type { TextareaProps } from './components/Textarea.js';

// --- テーブル / 一覧 ------------------------------------------------------
export { DataTable } from './components/DataTable.js';
export type {
  DataTableProps,
  DataTableColumn,
  DataTableSort,
  TableSortDirection,
} from './components/DataTable.js';
export { InlineEditTable } from './components/InlineEditTable.js';
export type {
  InlineEditTableProps,
  InlineEditColumn,
  InlineEditCommit,
} from './components/InlineEditTable.js';

// --- 進捗・状態表示 ------------------------------------------------------
export { ProgressBar, Skeleton } from './components/Progress.js';
export type { ProgressBarProps, SkeletonProps } from './components/Progress.js';
export { StatusChip, ScopeChip } from './components/Chip.js';
export type { StatusChipProps, ScopeChipProps } from './components/Chip.js';

// --- 確認ダイアログ ------------------------------------------------------
export { ConfirmDialog } from './components/ConfirmDialog.js';
export type { ConfirmDialogProps } from './components/ConfirmDialog.js';

// --- 通知・エラー表示 ----------------------------------------------------
export { Alert, ErrorState, EmptyState, DegradedBanner } from './components/Alert.js';
export type {
  AlertProps,
  ErrorStateProps,
  EmptyStateProps,
  DegradedBannerProps,
} from './components/Alert.js';
export { ToastProvider, useToast } from './components/Toast.js';
export type { ToastProviderProps, ToastContextValue, ToastOptions, ToastItem } from './components/Toast.js';

// --- タブ / ウィザード / ステージボード -----------------------------------
export { Tabs } from './components/Tabs.js';
export type { TabsProps, TabItem } from './components/Tabs.js';
export { StepWizard } from './components/StepWizard.js';
export type { StepWizardProps, WizardStep } from './components/StepWizard.js';
export { StageBoard } from './components/StageBoard.js';
export type {
  StageBoardProps,
  StageColumn,
  StageCard,
  StageRisk,
  BuildStage,
} from './components/StageBoard.js';

// --- Markdown ------------------------------------------------------------
export { MarkdownView, MarkdownEditor, markdownSanitizeSchema } from './components/Markdown.js';
export type { MarkdownViewProps, MarkdownEditorProps } from './components/Markdown.js';

// --- KPI カード / チャート (軽量 SVG) --------------------------------------
export { KpiCard } from './charts/KpiCard.js';
export type { KpiCardProps, KpiTrend } from './charts/KpiCard.js';
export { LineChart, Sparkline } from './charts/LineChart.js';
export type { LineChartProps, SparklineProps } from './charts/LineChart.js';
export { BarChart } from './charts/BarChart.js';
export type { BarChartProps } from './charts/BarChart.js';
export { DonutChart } from './charts/DonutChart.js';
export type { DonutChartProps } from './charts/DonutChart.js';
export {
  resolveValueDomain,
  scaleValueToY,
  scaleIndexToX,
  buildPolylinePoints,
  buildDonutSegments,
  describeChart,
} from './charts/scale.js';
export type { ChartDatum, ChartSeries, DonutSegment } from './charts/scale.js';
