import type { ExternalDocumentRow } from '@harness-hub/db';
import { type ExternalDocumentSyncResponse, externalDocumentSyncResponseSchema } from '@harness-hub/schemas';

import { toDocumentDetail } from './dto.js';

const ETAG_PATTERN = /^"docs-import-(\d+)"$/;

export function externalDocumentEtag(revision: number): string {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('external document revision must be positive');
  return `"docs-import-${revision}"`;
}

export function revisionFromIfMatch(value: string | null): number | undefined | null {
  if (value === null) return undefined;
  const match = ETAG_PATTERN.exec(value.trim());
  if (match === null) return null;
  const revision = Number(match[1]);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : null;
}

export function toExternalDocumentSyncResponse(
  row: ExternalDocumentRow,
  outcome: ExternalDocumentSyncResponse['outcome'],
): ExternalDocumentSyncResponse {
  return externalDocumentSyncResponseSchema.parse({
    document: toDocumentDetail(row),
    source: row.externalSource,
    external_document_id: row.externalDocumentId,
    revision: row.externalRevision,
    sync_state: row.externalContentHash === null ? 'modified' : 'synced',
    outcome,
  });
}

export function externalDocumentResponse(
  row: ExternalDocumentRow,
  outcome: ExternalDocumentSyncResponse['outcome'],
  status = 200,
): Response {
  return Response.json(toExternalDocumentSyncResponse(row, outcome), {
    status,
    headers: {
      etag: externalDocumentEtag(row.externalRevision),
      'cache-control': 'private, no-store',
    },
  });
}
