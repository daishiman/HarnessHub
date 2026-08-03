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
  createdBy: 'user-1',
  updatedBy: 'user-2',
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_100,
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
    });
  });
});

describe('DOCS-DTO: toDocumentListItem', () => {
  it('DOCS-DTO-002: body_markdown を含まない一覧項目へ変換する', () => {
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
    });
  });
});
