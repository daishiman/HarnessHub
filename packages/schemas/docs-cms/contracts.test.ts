import { describe, expect, it } from 'vitest';

import {
  createDocumentRequestSchema,
  documentDetailSchema,
  externalDocumentIdSchema,
  externalDocumentSourceSchema,
  externalDocumentSyncRequestSchema,
  updateDocumentRequestSchema,
} from './contracts.js';

const INTERNAL_IMAGE_URL = '/api/v1/docs/doc-1/images/550e8400-e29b-41d4-a716-446655440000.png';

describe('DOCS-CONTRACT: image URL', () => {
  it('DOCS-CONTRACT-IMG-001: 認証必須の同一 origin image route を thumbnail として受理する', () => {
    expect(
      createDocumentRequestSchema.safeParse({
        scope: 'tenant',
        title: '画像付き文書',
        body_markdown: `![図](${INTERNAL_IMAGE_URL})`,
        thumbnail_url: INTERNAL_IMAGE_URL,
      }).success,
    ).toBe(true);

    expect(
      documentDetailSchema.safeParse({
        id: 'doc-1',
        revision: 1,
        scope: 'tenant',
        title: '画像付き文書',
        body_markdown: '',
        status: 'draft',
        created_by: 'user-1',
        updated_by: 'user-1',
        created_at: 1,
        updated_at: 1,
        category: null,
        tags: null,
        thumbnail_url: INTERNAL_IMAGE_URL,
        thumbnail_source: 'auto',
        excerpt: null,
        excerpt_source: 'auto',
        asset_summary: null,
        publish_at: null,
      }).success,
    ).toBe(true);
  });

  it('DOCS-CONTRACT-IMG-002: javascript/data と任意の相対 path は拒否する', () => {
    for (const thumbnail_url of ['javascript:alert(1)', 'data:image/png;base64,AA==', '/private/image.png']) {
      expect(updateDocumentRequestSchema.safeParse({ thumbnail_url }).success).toBe(false);
    }
  });

  it('DOCS-CONTRACT-IMG-003: http/https の手動サムネイルは維持する', () => {
    expect(updateDocumentRequestSchema.safeParse({ thumbnail_url: 'https://example.test/thumb.webp' }).success).toBe(
      true,
    );
  });
});

describe('DOCS-CONTRACT: scheduled publishing', () => {
  it('未来の publish_at と null による予約解除だけを受理する', () => {
    const future = Date.now() + 60_000;
    expect(createDocumentRequestSchema.safeParse({ scope: 'tenant', title: '予約', publish_at: future }).success).toBe(
      true,
    );
    expect(updateDocumentRequestSchema.safeParse({ publish_at: future }).success).toBe(true);
    expect(updateDocumentRequestSchema.safeParse({ publish_at: null }).success).toBe(true);
  });

  it('現在以前の予約と scheduled status を拒否する', () => {
    // create の現在時刻判定は、保存済み冪等応答を 24h 内に replay できるよう repository の
    // winner branch で行う。schema は epoch の形だけを保証する。
    expect(
      createDocumentRequestSchema.safeParse({ scope: 'tenant', title: '過去', publish_at: Date.now() - 1 }).success,
    ).toBe(true);
    expect(updateDocumentRequestSchema.safeParse({ publish_at: Date.now() }).success).toBe(false);
    expect(updateDocumentRequestSchema.safeParse({ status: 'scheduled' }).success).toBe(false);
    expect(
      updateDocumentRequestSchema.safeParse({ status: 'published', publish_at: Date.now() + 60_000 }).success,
    ).toBe(false);
  });
});

describe('external document sync contracts', () => {
  it('normal document representation requires a positive entity revision', () => {
    const base = {
      id: 'doc-1',
      scope: 'tenant' as const,
      title: '改訂版',
      body_markdown: '',
      status: 'draft' as const,
      created_by: 'user-1',
      updated_by: 'user-1',
      created_at: 1,
      updated_at: 1,
      category: null,
      tags: null,
      thumbnail_url: null,
      thumbnail_source: 'auto' as const,
      excerpt: null,
      excerpt_source: 'auto' as const,
      asset_summary: null,
      publish_at: null,
    };
    expect(documentDetailSchema.safeParse({ ...base, revision: 1 }).success).toBe(true);
    expect(documentDetailSchema.safeParse(base).success).toBe(false);
    expect(documentDetailSchema.safeParse({ ...base, revision: 0 }).success).toBe(false);
  });

  it('accepts a safe source, sha256 id and bounded Markdown payload', () => {
    expect(externalDocumentSourceSchema.parse('claude-code')).toBe('claude-code');
    expect(externalDocumentIdSchema.parse('a'.repeat(64))).toHaveLength(64);
    expect(externalDocumentSyncRequestSchema.parse({ title: '設計書', body_markdown: '# 本文' })).toEqual({
      title: '設計書',
      body_markdown: '# 本文',
    });
  });

  it('rejects path-like source and non-hash external ids', () => {
    expect(externalDocumentSourceSchema.safeParse('../claude').success).toBe(false);
    expect(externalDocumentIdSchema.safeParse('/Users/alice/doc.md').success).toBe(false);
  });
});
