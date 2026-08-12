// P06 実行テスト (SYS-DOCS-CMS-P06)
// DOCS-DTO-*: DocumentRow (camelCase) と wire 契約 (snake_case) の mapper が
// フィールドを過不足なく変換すること。

import type { DocumentRow } from '@harness-hub/db';
import { describe, expect, it } from 'vitest';

import { toDocumentDetail, toDocumentListItem } from '../../features/docs-cms/dto.js';

const ROW: DocumentRow = {
  id: 'doc-1',
  tenantId: 'tenant-a',
  scope: 'tenant',
  title: '導入ガイド',
  bodyMarkdown: '# 導入ガイド\n\n手順。',
  status: 'draft',
  externalSource: null,
  externalDocumentId: null,
  externalContentHash: null,
  externalRevision: null,
  createdBy: 'user-1',
  updatedBy: 'user-2',
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_100,
  category: null,
  tags: null,
  thumbnailUrl: null,
  thumbnailSource: 'auto',
  excerpt: null,
  excerptSource: 'auto',
  assetSummary: null,
  publishAt: null,
};

const ROW_WITH_METADATA: DocumentRow = {
  ...ROW,
  id: 'doc-2',
  category: '設計',
  tags: JSON.stringify(['設計', 'API']),
  thumbnailUrl: 'https://example.test/thumb.png',
  thumbnailSource: 'manual',
  excerpt: '概要文。',
  excerptSource: 'auto',
  assetSummary: JSON.stringify({ imageCount: 2, hasTable: true, hasCode: false }),
};

describe('DOCS-DTO: toDocumentDetail', () => {
  it('DOCS-DTO-001: body_markdown を含む全フィールドを snake_case へ変換する', () => {
    expect(toDocumentDetail(ROW)).toEqual({
      id: 'doc-1',
      scope: 'tenant',
      title: '導入ガイド',
      body_markdown: '# 導入ガイド\n\n手順。',
      status: 'draft',
      created_by: 'user-1',
      updated_by: 'user-2',
      created_at: 1_700_000_000,
      updated_at: 1_700_000_100,
      category: null,
      tags: null,
      thumbnail_url: null,
      thumbnail_source: 'auto',
      excerpt: null,
      excerpt_source: 'auto',
      asset_summary: null,
      publish_at: null,
    });
  });

  it('DOCS-DTO-003: category/tags/thumbnail/excerpt/asset_summary を JSON から復元する', () => {
    const detail = toDocumentDetail(ROW_WITH_METADATA);
    expect(detail.category).toBe('設計');
    expect(detail.tags).toEqual(['設計', 'API']);
    expect(detail.thumbnail_url).toBe('https://example.test/thumb.png');
    expect(detail.thumbnail_source).toBe('manual');
    expect(detail.excerpt).toBe('概要文。');
    expect(detail.asset_summary).toEqual({ image_count: 2, has_table: true, has_code: false });
  });
});

describe('DOCS-DTO: toDocumentListItem', () => {
  it('DOCS-DTO-002: body_markdown を含まないがカード表示用フィールドは含む一覧項目へ変換する', () => {
    const item = toDocumentListItem(ROW);
    expect(item).not.toHaveProperty('body_markdown');
    expect(item).toEqual({
      id: 'doc-1',
      scope: 'tenant',
      title: '導入ガイド',
      status: 'draft',
      created_by: 'user-1',
      updated_by: 'user-2',
      created_at: 1_700_000_000,
      updated_at: 1_700_000_100,
      category: null,
      tags: null,
      thumbnail_url: null,
      thumbnail_source: 'auto',
      excerpt: null,
      excerpt_source: 'auto',
      asset_summary: null,
      publish_at: null,
    });
  });
});
