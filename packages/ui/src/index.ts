/** @harness-hub/ui の公開 API 単一入口。consumer は必ずここ経由で参照する (内部実装への deep import 禁止)。 */

export type { BarChartProps } from './charts/BarChart.js';
export { BarChart } from './charts/BarChart.js';
export type { DonutChartProps } from './charts/DonutChart.js';
export { DonutChart } from './charts/DonutChart.js';
export type { KpiCardProps, KpiTrend } from './charts/KpiCard.js';
// --- KPI カード / チャート (軽量 SVG) --------------------------------------
export { KpiCard } from './charts/KpiCard.js';
export type { LineChartProps, SparklineProps } from './charts/LineChart.js';
export { LineChart, Sparkline } from './charts/LineChart.js';
export type { ChartDatum, ChartSeries, DonutSegment } from './charts/scale.js';
export {
  buildDonutSegments,
  buildPolylinePoints,
  describeChart,
  resolveValueDomain,
  scaleIndexToX,
  scaleValueToY,
} from './charts/scale.js';
export type {
  AlertProps,
  DegradedBannerProps,
  EmptyStateProps,
  ErrorStateProps,
} from './components/Alert.js';
// --- 通知・エラー表示 ----------------------------------------------------
export { Alert, DegradedBanner, EmptyState, ErrorState } from './components/Alert.js';
export type { ButtonProps, ButtonVariant } from './components/Button.js';
// --- フォーム部品 --------------------------------------------------------
export { Button } from './components/Button.js';
export type { ScopeChipProps, StatusChipProps } from './components/Chip.js';
export { ScopeChip, StatusChip } from './components/Chip.js';
export type { ConfirmDialogProps } from './components/ConfirmDialog.js';
// --- 確認ダイアログ ------------------------------------------------------
export { ConfirmDialog } from './components/ConfirmDialog.js';
export type {
  DataTableColumn,
  DataTableProps,
  DataTableSort,
  TableSortDirection,
} from './components/DataTable.js';

// --- テーブル / 一覧 ------------------------------------------------------
export { DataTable } from './components/DataTable.js';
export type { FieldControlProps, FormFieldProps } from './components/FormField.js';
export { FormField } from './components/FormField.js';
export type {
  InlineEditColumn,
  InlineEditCommit,
  InlineEditTableProps,
} from './components/InlineEditTable.js';
export { InlineEditTable } from './components/InlineEditTable.js';
export type { MarkdownEditorProps, MarkdownViewProps } from './components/Markdown.js';
// --- Markdown ------------------------------------------------------------
export { MarkdownEditor, MarkdownView, markdownSanitizeSchema } from './components/Markdown.js';
export type { ProgressBarProps, SkeletonProps } from './components/Progress.js';
// --- 進捗・状態表示 ------------------------------------------------------
export { ProgressBar, Skeleton } from './components/Progress.js';
export type { SelectOption, SelectProps } from './components/Select.js';
export { Select } from './components/Select.js';
export type {
  BuildStage,
  StageBoardProps,
  StageCard,
  StageColumn,
  StageRisk,
} from './components/StageBoard.js';
export { StageBoard } from './components/StageBoard.js';
export type { StepWizardProps, WizardStep } from './components/StepWizard.js';
export { StepWizard } from './components/StepWizard.js';
export type { TabItem, TabsProps } from './components/Tabs.js';
// --- タブ / ウィザード / ステージボード -----------------------------------
export { Tabs } from './components/Tabs.js';
export type { TextareaProps } from './components/Textarea.js';
export { Textarea } from './components/Textarea.js';
export type { TextInputProps } from './components/TextInput.js';
export { TextInput } from './components/TextInput.js';
export type { ToastContextValue, ToastItem, ToastOptions, ToastProviderProps } from './components/Toast.js';
export { ToastProvider, useToast } from './components/Toast.js';
export type { UiLocale, UiMessageKey } from './i18n/dictionaries.js';
export {
  enMessages,
  jaMessages,
  translateUiMessage,
  uiLocales,
  uiMessages,
} from './i18n/dictionaries.js';
export type { StatusDomain, StatusTone, StatusValue } from './i18n/status-vocabulary.js';
export {
  getStatusLabel,
  getStatusTone,
  statusToneColors,
  statusVocabulary,
} from './i18n/status-vocabulary.js';
export type { UiContextValue, UiPreferences, UiProviderProps } from './theme/UiProvider.js';
// --- テーマ・表示密度・言語 ----------------------------------------------
export { defaultUiPreferences, UiProvider, useUi, useUiText } from './theme/UiProvider.js';
export {
  AA_CONTRAST_LARGE_TEXT,
  AA_CONTRAST_NON_TEXT,
  AA_CONTRAST_TEXT,
  contrastRatio,
  meetsTextContrast,
  parseHexColor,
  relativeLuminance,
} from './tokens/contrast.js';
export type {
  ColorTokenName,
  ContrastCheckResult,
  ContrastRequirement,
  Density,
  RadiusTokenName,
  SpacingTokenName,
  ThemeName,
  ThemePreference,
  TypographyTokenName,
} from './tokens/tokens.js';
// --- design tokens -------------------------------------------------------
export {
  buildThemeCss,
  chartSeriesTokens,
  checkContrastRequirements,
  colorTokens,
  colorVariableName,
  contrastRequirements,
  densityNames,
  densityTokens,
  radiusTokens,
  spacingTokens,
  themeNames,
  typographyTokens,
} from './tokens/tokens.js';
