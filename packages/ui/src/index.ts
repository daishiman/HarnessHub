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
export type { BadgeProps, BadgeTone } from './components/Badge.js';
export { Badge } from './components/Badge.js';
export type { ButtonProps, ButtonVariant } from './components/Button.js';
// --- フォーム部品 --------------------------------------------------------
export { Button } from './components/Button.js';
export type { ScopeChipProps, StatusChipProps } from './components/Chip.js';
export { ScopeChip, StatusChip } from './components/Chip.js';
export type { ConfirmDialogProps } from './components/ConfirmDialog.js';
// --- 確認ダイアログ ------------------------------------------------------
export { ConfirmDialog } from './components/ConfirmDialog.js';
export type { CursorPagerProps } from './components/CursorPager.js';
export { CursorPager } from './components/CursorPager.js';
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
export type { IdBadgeProps } from './components/IdBadge.js';
export { IdBadge } from './components/IdBadge.js';
export type {
  InlineEditColumn,
  InlineEditCommit,
  InlineEditTableProps,
} from './components/InlineEditTable.js';
export { InlineEditTable } from './components/InlineEditTable.js';
export type { ListStateProps } from './components/ListState.js';
export { ListState } from './components/ListState.js';
export type {
  MarkdownEditorProps,
  MarkdownImageUploadResult,
  MarkdownViewProps,
} from './components/Markdown.js';
// --- Markdown ------------------------------------------------------------
export { MarkdownEditor, MarkdownView, markdownSanitizeSchema, slugify } from './components/Markdown.js';
// --- 汎用モーダル / ボトムシート ------------------------------------------
export type { ModalProps, ModalSize } from './components/Modal.js';
export { Modal } from './components/Modal.js';
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
// --- アイコン ------------------------------------------------------------
export type { IconName, IconProps } from './icons/index.js';
export { Icon, iconNames } from './icons/index.js';
export type {
  AppShellProps,
  NavListItem,
  NavListProps,
  SidebarLayoutProps,
} from './layout/AppShell.js';
// --- レイアウト骨格 ------------------------------------------------------
export { AppShell, NavList, SidebarLayout } from './layout/AppShell.js';
export type {
  CardProps,
  ContainerProps,
  ContainerSize,
  StackGap,
  StackProps,
} from './layout/primitives.js';
export { Card, Container, containerSizes, Stack } from './layout/primitives.js';
export type { BottomSheetProps } from './shell/BottomSheet.js';
export { BottomSheet } from './shell/BottomSheet.js';
// --- 情報の並べ方 (型の選定は specs/harness-hub-information-design-addendum.md の registry、
//     画面ごとの割当は docs/screen-inventory.md、部品への写し方は frontend-ui-foundation-spec §5-1) ---
export type {
  CardGridColumns,
  CardGridProps,
  DataCardProps,
  DefinitionListItem,
  DefinitionListProps,
  FilterBarProps,
  LiveStatusProps,
  TagRowProps,
} from './shell/information.js';
export { CardGrid, DataCard, DefinitionList, FilterBar, LiveStatus, TagRow } from './shell/information.js';
export type { MobileTabBarProps } from './shell/MobileTabBar.js';
export { MobileTabBar, mobileTabPrimarySlots } from './shell/MobileTabBar.js';
// --- 共通シェル ----------------------------------------------------------
export type { ShellNavItem } from './shell/nav-model.js';
export { isCurrentNav, isResolvedCurrentNav, resolveCurrentNavTarget } from './shell/nav-model.js';
export type { ShellFooterLink, ShellFooterProps } from './shell/ShellFooter.js';
export { ShellFooter } from './shell/ShellFooter.js';
export type { ShellAccountLink, ShellHeaderProps } from './shell/ShellHeader.js';
export { ShellHeader } from './shell/ShellHeader.js';
export type { ShellNavGroup, ShellSidebarProps } from './shell/ShellSidebar.js';
export { ShellSidebar } from './shell/ShellSidebar.js';
export { StickyHeaderOffset } from './shell/StickyHeaderOffset.js';
// 顕著度 (lead / context / metadata) の 3 段。画面側で独自の並べ方を書くときもここから読む
export type { Salience } from './shell/salience.js';
export { salienceLevels, salienceStyle } from './shell/salience.js';
export { buildShellCss, shellSidebarCollapsedWidth, shellSidebarWidth } from './shell/shell-css.js';
export type { SidebarToggleButtonProps } from './shell/sidebar-collapse.js';
export { SidebarToggleButton } from './shell/sidebar-collapse.js';
export type { ActionLinkProps, PanelProps, ScreenHeaderProps } from './shell/surfaces.js';
export { ActionLink, Panel, ScreenHeader } from './shell/surfaces.js';
export type { ShellWorkspaceOption, WorkspaceSwitcherProps } from './shell/WorkspaceSwitcher.js';
export { WorkspaceSwitcher } from './shell/WorkspaceSwitcher.js';
export type { UiContextValue, UiPreferences, UiProviderProps } from './theme/UiProvider.js';
// --- テーマ・表示密度・言語 ----------------------------------------------
export { defaultUiPreferences, UiProvider, useUi, useUiText } from './theme/UiProvider.js';
// --- design tokens -------------------------------------------------------
export { buildBaseCss } from './tokens/base-css.js';
export {
  AA_CONTRAST_LARGE_TEXT,
  AA_CONTRAST_NON_TEXT,
  AA_CONTRAST_TEXT,
  contrastRatio,
  meetsTextContrast,
  parseHexColor,
  relativeLuminance,
} from './tokens/contrast.js';
// 本番が読む静的 stylesheet (tokens.css) と同じ全文。視覚回帰ハーネスなど
// 「出荷される CSS そのもの」を評価したい経路が使う (HarnessHub-2fo1)
export { buildTokenCssArtifact, TOKEN_CSS_BANNER } from './tokens/css-artifact.js';
export { focusRingDeclarations, focusRingRule } from './tokens/focus-ring.js';
export type {
  BreakpointName,
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
export {
  breakpointTokens,
  buildThemeCss,
  chartSeriesTokens,
  checkContrastRequirements,
  colorTokens,
  colorVariableName,
  contrastRequirements,
  densityNames,
  densityTokens,
  mediaDown,
  mediaUp,
  radiusTokens,
  spacingTokens,
  themeNames,
  typographyTokens,
} from './tokens/tokens.js';
