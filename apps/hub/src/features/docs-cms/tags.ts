/**
 * ドキュメントのタグ入力欄 (カンマ区切りの 1 行テキスト) と wire 契約の `tags: string[] | null`
 * を相互変換する。UI 層 (新規作成/編集/一覧の分類編集パネル) が同じ規則を共有するための単一ソース。
 */

/**
 * カンマ区切りの入力文字列を tags 配列へ正規化する。
 * 前後の空白は落とし、空要素 (連続カンマ・末尾カンマなど) は除外する。
 * 結果が空になる場合は「タグ無し」を意味する null を返す (wire 契約の tags は nullable)。
 */
export function parseTagsInput(raw: string): readonly string[] | null {
  const tags = raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return tags.length === 0 ? null : tags;
}

/** tags 配列を入力欄の初期値 (カンマ区切り文字列) へ戻す。 */
export function tagsToInputValue(tags: readonly string[] | null | undefined): string {
  return (tags ?? []).join(', ');
}
