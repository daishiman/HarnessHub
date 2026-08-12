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

const pageUrlSchema = z.url('Notion ページの URL の形式ではありません').max(2000);

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
    page_url: pageUrlSchema.nullable().optional(),
    api_key: apiKeyInputSchema.optional(),
  })
  .strict();
export type UpsertNotionIntegrationRequest = z.output<typeof upsertNotionIntegrationRequestSchema>;

/** api_key はマスク済み文字列のみ。生の値は絶対に含めない。 */
export const notionIntegrationResponseSchema = z
  .object({
    workspace_id: identifierSchema,
    mode: notionIntegrationModeSchema,
    page_url: z.string().nullable(),
    // 未登録なら null。登録済みなら "****" + 末尾4文字の形。
    api_key_masked: z.string().nullable(),
    updated_at: z.number().int().nonnegative(),
  })
  .strict();
export type NotionIntegrationResponse = z.output<typeof notionIntegrationResponseSchema>;
