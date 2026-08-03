/** DocumentRow (camelCase) と wire 契約 (snake_case) の間を結ぶ mapper。 */

import type { DocumentRow } from '@harness-hub/db';
import {
  type DocumentDetail,
  type DocumentListItem,
  documentDetailSchema,
  documentListItemSchema,
} from '@harness-hub/schemas';

export function toDocumentDetail(row: DocumentRow): DocumentDetail {
  return documentDetailSchema.parse({
    id: row.id,
    scope: row.scope,
    title: row.title,
    body_markdown: row.bodyMarkdown,
    status: row.status,
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
    created_by: row.createdBy,
    updated_by: row.updatedBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  });
}
