/**
 * feat-notion-integration の wire 契約。
 *
 * api_key は request 側 (`upsertNotionIntegrationRequestSchema`) にだけ現れる。
 * response 側 (`notionIntegrationResponseSchema`) は `api_key_masked` (末尾 4 文字のみ表示) しか持たず、
 * 生の値を返す経路自体を型で塞ぐ (「マスクし忘れる」実装ミスを構造的に防ぐ)。
 */
import { z } from 'zod';
import { identifierSchema } from '../src/primitives.js';

export const notionIntegrationModeSchema = z.enum(['url', 'api_key']);
export type NotionIntegrationMode = z.output<typeof notionIntegrationModeSchema>;

const NOTION_PAGE_HOSTS = ['notion.so', 'notion.site'] as const;

/**
 * 外部リンクとしてそのまま開くため、URL の「形」だけでなく行き先も制限する。
 * `notion.so.evil.example` のような suffix 偽装を通さないよう、完全一致かドット付き subdomain だけを許可する。
 */
export function isTrustedNotionPageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || (url.port !== '' && url.port !== '443')) return false;
    const hostname = url.hostname.toLowerCase();
    return NOTION_PAGE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export const notionPageUrlSchema = z
  .url('Notion ページの URL の形式ではありません')
  .max(2000)
  .refine(isTrustedNotionPageUrl, 'HTTPS の Notion ページ URL (notion.so / notion.site) を指定してください');

/** Notion Integration の API キー。最小文字数だけ縛り、具体的な発行形式 (secret_... 等) には依存しない。 */
const apiKeyInputSchema = z.string().trim().min(20, 'APIキーの形式ではありません').max(500);

/**
 * `PUT /api/v1/me/notion-integration` の request。
 *
 * - `page_url` / `api_key` はどちらも optional。必須判定は mode に応じて service 層が行う
 *   (`page_url` は url 方式で必須、`api_key` は「未登録の api_key 方式」で必須。
 *   登録済みの api_key 方式を re-save するときは省略でき、その場合は既存の暗号化値を維持する)。
 *   zod の型だけでは「他フィールドの値に応じた必須/任意」を表現しにくく、かつ
 *   「api_key を省略 (維持)」と「api_key を空文字で消す」を区別する必要があるため、
 *   ここでは形の検証のみ行い、要否判定は `apps/hub/src/features/notion-integration/logic.ts` の
 *   純関数 (`checkNotionIntegrationRequirements`) に委ねる。
 */
export const upsertNotionIntegrationRequestSchema = z
  .object({
    mode: notionIntegrationModeSchema,
    page_url: notionPageUrlSchema.nullable().optional(),
    api_key: apiKeyInputSchema.optional(),
  })
  .strict();
export type UpsertNotionIntegrationRequest = z.output<typeof upsertNotionIntegrationRequestSchema>;

/** API キー方式は現状、暗号化保存まで。Notion API への接続確認や同期はまだ行わない。 */
export const notionApiKeyStatusSchema = z.enum(['not_configured', 'stored_unverified']);
export type NotionApiKeyStatus = z.output<typeof notionApiKeyStatusSchema>;

/** api_key はマスク済み文字列と保存状態のみ。生の値や「接続済み」という誤解を招く状態は含めない。 */
export const notionIntegrationResponseSchema = z
  .object({
    workspace_id: identifierSchema,
    mode: notionIntegrationModeSchema,
    page_url: notionPageUrlSchema.nullable(),
    // 未登録なら null。登録済みなら "****" + 末尾4文字の形。
    api_key_masked: z.string().nullable(),
    api_key_status: notionApiKeyStatusSchema,
    updated_at: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    const expectedStatus = value.api_key_masked === null ? 'not_configured' : 'stored_unverified';
    if (value.api_key_status !== expectedStatus) {
      context.addIssue({
        code: 'custom',
        path: ['api_key_status'],
        message: 'APIキーのマスク値と保存状態が一致していません',
      });
    }
  });
export type NotionIntegrationResponse = z.output<typeof notionIntegrationResponseSchema>;
