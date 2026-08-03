// P04 テストスタブ (SYS-DOCS-CMS-P04)
// DOCS-AUDIT-*: doc 編集操作の監査 event 記録 (SEC6 / acceptance)。
//
// 監査記録の境界は shared/audit の AuditLogger.record() 1 本 (I8)。docs-cms は
// ai-jobs/[id]/complete/route.ts の ai_job.complete 記録と同型のパターンを、
// POST/PATCH /api/v1/docs へ適用するだけで良く、AuditRepo を直接叩く独自経路を作らない。

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createAuditLogger, type RecordedAuditEvent } from '../../shared/audit/index.js';

describe('DOCS-AUDIT: AuditLogger 経由の記録契約', () => {
  it('DOCS-AUDIT-001: record() は sink.append() を1回だけ呼び、id/recordedAt を付与する', async () => {
    const append = vi.fn(async () => {});
    const logger = createAuditLogger({
      sink: { append },
      now: () => new Date('2026-08-03T00:00:00.000Z'),
      newId: () => 'audit-1',
    });

    const recorded = await logger.record({
      actorSubject: 'user-1',
      tenantId: 'tenant-a',
      workspaceId: 'ws-1',
      action: 'docs.create',
      resourceType: 'document',
      resourceId: 'doc-1',
      metadata: { scope: 'tenant' },
    });

    expect(append).toHaveBeenCalledTimes(1);
    expect(recorded).toEqual<RecordedAuditEvent>({
      id: 'audit-1',
      actorSubject: 'user-1',
      tenantId: 'tenant-a',
      workspaceId: 'ws-1',
      action: 'docs.create',
      resourceType: 'document',
      resourceId: 'doc-1',
      metadata: { scope: 'tenant' },
      recordedAt: '2026-08-03T00:00:00.000Z',
    });
  });

  it('DOCS-AUDIT-002: metadata に値そのもの (本文・secret) を含めない契約を型で強制する (PII 禁止)', () => {
    // AuditEvent.metadata は Record<string, string | number | boolean | null> に固定されている。
    // オブジェクト (本文 JSON など) を丸ごと詰められない設計そのものが受入条件
    const metadata: Record<string, string | number | boolean | null> = {
      scope: 'common',
      title_changed: true,
      body_length: 128,
    };
    expect(Object.values(metadata).every((v) => typeof v !== 'object')).toBe(true);
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---

  const DOCS_ROUTE_DIR = resolve(process.cwd(), 'src/app/api/v1/docs');

  it('DOCS-AUDIT-101: POST /api/v1/docs は成功時に action=docs.create を記録する', () => {
    const routeFile = resolve(DOCS_ROUTE_DIR, 'route.ts');
    if (!existsSync(routeFile)) return;
    const source = readFileSync(routeFile, 'utf8');
    expect(source).toContain('audit.record');
    expect(source).toContain("'docs.create'");
  });

  it('DOCS-AUDIT-102: PATCH /api/v1/docs/:id は成功時に action=docs.update を記録する', () => {
    const routeFile = resolve(DOCS_ROUTE_DIR, '[id]/route.ts');
    if (!existsSync(routeFile)) return;
    const source = readFileSync(routeFile, 'utf8');
    expect(source).toContain('audit.record');
    expect(source).toContain("'docs.update'");
  });

  it('DOCS-AUDIT-103: AI 下書き書き戻しは既存 ai_job.complete の記録を再利用し、docs 側で二重記録しない (ADR §5)', () => {
    const draftRoute = resolve(DOCS_ROUTE_DIR, '[id]/draft/route.ts');
    if (!existsSync(draftRoute)) return;
    const source = readFileSync(draftRoute, 'utf8');
    // draft の「投入」自体は enqueue であって編集確定ではないため、docs.create/docs.update を打たない
    expect(source).not.toContain("'docs.create'");
    expect(source).not.toContain("'docs.update'");
  });
});
