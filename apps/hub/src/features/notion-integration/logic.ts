/**
 * feat-notion-integration の計算・判定ロジック。副作用 (DB/HTTP) を持たない純関数のみを置き、
 * `logic.test.ts` で単体検証する。API キーの平文をログや例外メッセージへ含めないこと。
 */
import { type NotionIntegrationMode, notionPageUrlSchema } from '@harness-hub/schemas';

/** マスク後に見せる末尾の文字数 (「末尾4文字だけ見せる」の値)。 */
const MASK_VISIBLE_TAIL = 4;
const MASK_PREFIX = '****';

/**
 * APIキーをマスクする。画面表示にはこの戻り値だけを使い、平文は決して渡さない。
 * 長さが `MASK_VISIBLE_TAIL` 以下のキーは末尾すら見せない (それでも全体が推測できてしまうため)。
 */
export function maskNotionApiKey(plainApiKey: string): string {
  if (plainApiKey.length <= MASK_VISIBLE_TAIL) return MASK_PREFIX;
  return `${MASK_PREFIX}${plainApiKey.slice(-MASK_VISIBLE_TAIL)}`;
}

export interface NotionIntegrationRequirementInput {
  readonly mode: NotionIntegrationMode;
  /** request body の `page_url` (未指定なら undefined、明示的な null/空文字も区別せず「無い」扱いにする)。 */
  readonly pageUrl: string | null | undefined;
  /** request body に `api_key` フィールドが含まれていたか。 */
  readonly hasApiKeyInput: boolean;
  /** 既に暗号化済みの api_key が保存済みか (再保存時に省略可能かどうかの判定に使う)。 */
  readonly hasExistingApiKey: boolean;
}

export type NotionIntegrationRequirementResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly field: 'page_url' | 'api_key'; readonly message: string };

/**
 * mode に応じた必須項目を判定する。
 *
 * - `url` 方式: `page_url` が必須。
 * - `api_key` 方式: 今回の request で `api_key` が渡っているか、既に保存済みの api_key があれば良い
 *   (画面はマスク済みの値しか持たないため、変更しない保存では api_key を送らずに済ませる必要がある)。
 *   `page_url` は任意 (登録しておくと「開く」導線に使えるだけ)。
 */
export function checkNotionIntegrationRequirements(
  input: NotionIntegrationRequirementInput,
): NotionIntegrationRequirementResult {
  if (input.mode === 'url') {
    const pageUrl = input.pageUrl?.trim();
    if (pageUrl === undefined || pageUrl.length === 0) {
      return { ok: false, field: 'page_url', message: 'URL 方式では Notion ページの URL が必須です。' };
    }
    return { ok: true };
  }

  // api_key 方式
  if (!input.hasApiKeyInput && !input.hasExistingApiKey) {
    return { ok: false, field: 'api_key', message: 'APIキー方式では APIキーの入力が必須です。' };
  }
  return { ok: true };
}

/** 「Notion で開く」導線を出せるかどうか。api_key 方式でも page_url が登録されていれば出せる。 */
export function canOpenNotionPage(pageUrl: string | null): pageUrl is string {
  return notionPageUrlSchema.safeParse(pageUrl).success;
}
