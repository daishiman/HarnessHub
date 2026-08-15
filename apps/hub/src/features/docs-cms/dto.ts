/** DocumentRow (camelCase) と wire 契約 (snake_case) の間を結ぶ mapper。 */

import type { DocumentRow } from '@harness-hub/db';
import {
  type AssetSummary,
  type DocumentDetail,
  type DocumentListItem,
  documentDetailSchema,
  documentListItemSchema,
} from '@harness-hub/schemas';

/** tags は DB 上 JSON 配列文字列。壊れた JSON は空扱いにして UI を落とさない (defensive)。 */
function parseTags(raw: string | null): readonly string[] | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return null;
  }
}

function parseAssetSummary(raw: string | null): AssetSummary | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { imageCount?: unknown; hasTable?: unknown; hasCode?: unknown };
    return {
      image_count: typeof parsed.imageCount === 'number' ? parsed.imageCount : 0,
      has_table: Boolean(parsed.hasTable),
      has_code: Boolean(parsed.hasCode),
    };
  } catch {
    return null;
  }
}

function shared(row: DocumentRow) {
  return {
    id: row.id,
    revision: row.entityRevision,
    scope: row.scope,
    title: row.title,
    status: row.status,
    created_by: row.createdBy,
    updated_by: row.updatedBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    category: row.category,
    tags: parseTags(row.tags),
    thumbnail_url: row.thumbnailUrl,
    thumbnail_source: row.thumbnailSource,
    excerpt: row.excerpt,
    excerpt_source: row.excerptSource,
    asset_summary: parseAssetSummary(row.assetSummary),
    publish_at: row.publishAt,
  } as const;
}

export function toDocumentDetail(row: DocumentRow): DocumentDetail {
  return documentDetailSchema.parse({ ...shared(row), body_markdown: row.bodyMarkdown });
}

export function toDocumentListItem(row: DocumentRow): DocumentListItem {
  return documentListItemSchema.parse(shared(row));
}

/** wire (配列) → DB (JSON 文字列)。undefined は「変更しない」、null は「クリアする」。 */
export function tagsToStorage(tags: readonly string[] | null | undefined): string | null | undefined {
  if (tags === undefined) return undefined;
  if (tags === null) return null;
  return JSON.stringify(tags);
}

export interface AssetSummaryInput {
  readonly imageCount: number;
  readonly hasTable: boolean;
  readonly hasCode: boolean;
}

export function assetSummaryToStorage(summary: AssetSummaryInput): string {
  return JSON.stringify(summary);
}
