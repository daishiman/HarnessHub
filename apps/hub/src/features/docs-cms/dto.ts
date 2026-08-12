/** DocumentRow (camelCase) と wire 契約 (snake_case) の間を結ぶ mapper。 */

import type { DocumentRow } from '@harness-hub/db';
import {
  type DocumentDetail,
  type DocumentListItem,
  documentDetailSchema,
  documentListItemSchema,
} from '@harness-hub/schemas';

/**
 * tags は DB では JSON 文字列 (`tagsJson`) で持つが、wire 契約では配列で受け渡す。
 * 壊れた JSON (手動 DB 操作や将来の形式変更) は空配列に倒し、一覧/詳細取得そのものを失敗させない。
 */
function parseTags(tagsJson: string | null): readonly string[] {
  if (tagsJson === null) return [];
  try {
    const parsed: unknown = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

export function toDocumentDetail(row: DocumentRow): DocumentDetail {
  return documentDetailSchema.parse({
    id: row.id,
    scope: row.scope,
    title: row.title,
    body_markdown: row.bodyMarkdown,
    status: row.status,
    category: row.category,
    tags: parseTags(row.tagsJson),
    eyecatch_image_url: row.eyecatchImageUrl,
    publish_at: row.publishAt,
    created_by: row.createdBy,
    updated_by: row.updatedBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  });
}

export function toDocumentListItem(row: DocumentRow): DocumentListItem {
  return documentListItemSchema.parse({
    id: row.id,
    scope: row.scope,
    title: row.title,
    status: row.status,
    category: row.category,
    tags: parseTags(row.tagsJson),
    eyecatch_image_url: row.eyecatchImageUrl,
    publish_at: row.publishAt,
    created_by: row.createdBy,
    updated_by: row.updatedBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  });
}
