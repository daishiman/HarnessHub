// P06 実行テスト (SYS-DOCS-CMS-P06)
// DOCS-ADAPTER-*: 共通 ai_jobs と doc_draft 固有 DTO を結ぶ consumer adapter。

import type { AiJobRow } from '@harness-hub/db';
import { describe, expect, it } from 'vitest';

import {
  buildDocDraftPayload,
  parseDocDraftResult,
  serializeDocDraftResult,
  toPulledDocDraftJob,
} from '../../features/docs-cms/ai-job-adapter/index.js';

describe('DOCS-ADAPTER: buildDocDraftPayload', () => {
  it('DOCS-ADAPTER-001: document_id / title / outline を wire 契約へ変換する', () => {
    expect(buildDocDraftPayload({ documentId: 'doc-1', title: '導入ガイド', outline: ['背景', '手順'] })).toEqual({
      document_id: 'doc-1',
      title: '導入ガイド',
      outline: ['背景', '手順'],
    });
  });
});

describe('DOCS-ADAPTER: toPulledDocDraftJob', () => {
  it('DOCS-ADAPTER-002: AiJobRow から pull 応答へ変換し payloadJson を parse する', () => {
    const row: AiJobRow = {
      id: 'job-1',
      tenantId: 'tenant-a',
      workspaceId: 'ws-1',
      kind: 'doc_draft',
      status: 'processing',
      payloadJson: JSON.stringify({ document_id: 'doc-1', title: '導入ガイド', outline: ['背景'] }),
      resultJson: null,
      error: null,
      attempt: 0,
      maxAttempts: 3,
      leaseExpiresAt: 1_700_000_600,
      claimedByTokenId: 'token-1',
      refType: 'document',
      refId: 'doc-1',
      createdAt: 1_700_000_000,
      updatedAt: 1_700_000_000,
    };

    expect(toPulledDocDraftJob(row)).toEqual({
      id: 'job-1',
      kind: 'doc_draft',
      payload: { document_id: 'doc-1', title: '導入ガイド', outline: ['背景'] },
      lease_expires_at: 1_700_000_600,
    });
  });
});

describe('DOCS-ADAPTER: serializeDocDraftResult / parseDocDraftResult', () => {
  it('DOCS-ADAPTER-003: 往復変換で body_markdown を保つ', () => {
    const serialized = serializeDocDraftResult({ body_markdown: '# 下書き' });
    expect(parseDocDraftResult(serialized)).toEqual({ body_markdown: '# 下書き' });
  });

  it('DOCS-ADAPTER-004: null 入力は null を返す', () => {
    expect(parseDocDraftResult(null)).toBeNull();
  });

  it('DOCS-ADAPTER-005: schema に違反する JSON は null を返す (dead job 等の壊れた resultJson を許容)', () => {
    expect(parseDocDraftResult(JSON.stringify({ unrelated: true }))).toBeNull();
  });
});
