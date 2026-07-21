/** 共通部品が使う表示文言の typed 辞書。ja を正本とし、en は同じキー集合を型で強制する。 */

export const uiLocales = ['ja', 'en'] as const;
/**
 * 表示言語。API 契約側の言語 token は `@harness-hub/schemas` の `localeSchema` が正本で、
 * こちらは UI 部品の表示切替用。名前を分けて共通層の所有境界を曖昧にしない。
 */
export type UiLocale = (typeof uiLocales)[number];

/**
 * ja 辞書が MessageKey の正本。
 * 平易な日本語 + 次の一手を書く (shared-layers §1「通知・エラー表示」)。
 */
export const jaMessages = {
  'action.cancel': 'キャンセル',
  'action.confirm': '実行する',
  'action.close': '閉じる',
  'action.next': '次へ',
  'action.back': '戻る',
  'action.finish': '完了',
  'action.retry': 'もう一度試す',
  'action.save': '保存',
  'action.edit': '編集',
  'action.sort': '並び替え',
  'table.empty': '該当するデータがありません',
  'table.sortedAscending': '昇順',
  'table.sortedDescending': '降順',
  'chart.showAsTable': '表で見る',
  'chart.showAsChart': 'グラフで見る',
  'chart.label': 'ラベル',
  'chart.value': '値',
  'progress.loading': '読み込み中',
  'dialog.destructiveHint': 'この操作は取り消せません。',
  'dialog.reversibleHint': 'この操作はあとから取り消せます。',
  'error.title': '問題が発生しました',
  'error.nextAction': '時間をおいて、もう一度お試しください。',
  'empty.title': 'まだ何もありません',
  'degraded.title': '一部の機能が使えません',
  'degraded.detail': '導入済みツールはそのまま使えます。',
  'wizard.stepLabel': 'ステップ',
  'wizard.progress': '進捗',
  'editor.write': '編集',
  'editor.preview': 'プレビュー',
  'editor.viewSwitch': '表示の切替',
  'field.required': '必須',
  'field.optional': '任意',
  'notification.region': '通知',
  'board.itemCount': '件',
} as const;

/** ja のキーが正本。en に欠落があれば型エラーになる。 */
export type UiMessageKey = keyof typeof jaMessages;

export const enMessages: Record<UiMessageKey, string> = {
  'action.cancel': 'Cancel',
  'action.confirm': 'Confirm',
  'action.close': 'Close',
  'action.next': 'Next',
  'action.back': 'Back',
  'action.finish': 'Finish',
  'action.retry': 'Try again',
  'action.save': 'Save',
  'action.edit': 'Edit',
  'action.sort': 'Sort',
  'table.empty': 'No matching data',
  'table.sortedAscending': 'ascending',
  'table.sortedDescending': 'descending',
  'chart.showAsTable': 'View as table',
  'chart.showAsChart': 'View as chart',
  'chart.label': 'Label',
  'chart.value': 'Value',
  'progress.loading': 'Loading',
  'dialog.destructiveHint': 'This action cannot be undone.',
  'dialog.reversibleHint': 'You can undo this action later.',
  'error.title': 'Something went wrong',
  'error.nextAction': 'Please wait a moment and try again.',
  'empty.title': 'Nothing here yet',
  'degraded.title': 'Some features are unavailable',
  'degraded.detail': 'Tools you have already installed keep working.',
  'wizard.stepLabel': 'Step',
  'wizard.progress': 'Progress',
  'editor.write': 'Write',
  'editor.preview': 'Preview',
  'editor.viewSwitch': 'View mode',
  'field.required': 'Required',
  'field.optional': 'Optional',
  'notification.region': 'Notifications',
  'board.itemCount': ' items',
};

export const uiMessages: Record<UiLocale, Record<UiMessageKey, string>> = {
  ja: jaMessages,
  en: enMessages,
};

/** 文言を引く。未定義キーは型で防ぐため、実行時のフォールバックはキー文字列そのもの。 */
export function translateUiMessage(locale: UiLocale, key: UiMessageKey): string {
  return uiMessages[locale][key] ?? key;
}
