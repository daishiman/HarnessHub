/**
 * ドキュメント作成/編集フォームの入力作法をここへ集約する。
 * タグ入力 (カンマ区切りの1行テキスト) と 予約公開日時 (datetime-local) は
 * 作成/編集の2画面で全く同じ変換規則を使う (ux-design §4-4: 入力作法を1つに決めて全画面へ適用する)。
 */

/** カンマ区切りの1行テキストをタグ配列へ変換する。空欄は「タグなし」を意味する。 */
export function parseTagsInput(raw: string): readonly string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/** タグ配列をカンマ区切りの1行テキストへ戻す (編集画面の初期値表示用)。 */
export function tagsToInput(tags: readonly string[]): string {
  return tags.join(', ');
}

/** `<input type="datetime-local">` の値 (ローカル時刻文字列, 空欄可) を epoch ms へ変換する。空欄は null (予約なし)。 */
export function publishAtInputToEpochMs(raw: string): number | null {
  if (raw.trim().length === 0) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

/** epoch ms を `<input type="datetime-local">` の値へ戻す (編集画面の初期値表示用)。null は空欄。 */
export function publishAtToInput(publishAt: number | null): string {
  if (publishAt === null) return '';
  const date = new Date(publishAt);
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
