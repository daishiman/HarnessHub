import { describe, expect, it, vi } from 'vitest';

const auditMocks = vi.hoisted(() => ({
  authRuntime: vi.fn(),
  record: vi.fn(),
}));

vi.mock('../../lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/authz/index.js')>();
  return { ...actual, authRuntime: auditMocks.authRuntime };
});

import { createDocsScheduledPublishJob, DOCS_SCHEDULED_PUBLISH_BATCH_LIMIT } from '../../features/docs-cms/cron.js';
import type { CronJobContext } from '../../worker/cron.js';

const CONTEXT: CronJobContext = {
  scheduledAt: new Date('2026-08-12T15:00:00.000Z'),
  cron: '0 15 * * *',
  runKey: '0 15 * * *@2026-08-12T15:00:00.000Z',
  env: {},
};

describe('DOCS-CRON: 予約公開ジョブ', () => {
  it('DOCS-CRON-001: bounded batchの結果とsaturationを構造化ログへ出す', async () => {
    const publishDueDocuments = vi.fn().mockResolvedValue({
      publishedCount: 100,
      hasMore: true,
      publishedDocuments: [{ id: 'doc-1', tenantId: 'tenant-a' }],
    });
    const log = vi.fn();
    const audits: string[] = [];
    const job = createDocsScheduledPublishJob({
      resolveRepository: () => ({ publishDueDocuments }),
      log,
      recordAudit: async (document) => void audits.push(document.id),
    });

    await job.run(CONTEXT);

    expect(publishDueDocuments).toHaveBeenCalledWith(CONTEXT.scheduledAt.getTime(), DOCS_SCHEDULED_PUBLISH_BATCH_LIMIT);
    expect(audits).toEqual(['doc-1']);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'docs_scheduled_publish',
        published_count: 100,
        audited_count: 1,
        has_more: true,
        saturated: true,
        status: 'saturated',
      }),
    );
  });

  it('DOCS-CRON-002: 空batchもcompletedとして観測できる', async () => {
    const log = vi.fn();
    const job = createDocsScheduledPublishJob({
      resolveRepository: () => ({
        publishDueDocuments: vi.fn().mockResolvedValue({
          publishedCount: 0,
          hasMore: false,
          publishedDocuments: [],
        }),
      }),
      log,
    });

    await job.run(CONTEXT);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', published_count: 0, has_more: false, saturated: false }),
    );
  });

  it('DOCS-CRON-003: 監査失敗を構造化ログへ残してjobを失敗させる', async () => {
    const errorLog = vi.fn();
    const log = vi.fn();
    const recordAudit = vi.fn().mockRejectedValueOnce(new Error('audit unavailable')).mockResolvedValueOnce(undefined);
    const job = createDocsScheduledPublishJob({
      resolveRepository: () => ({
        publishDueDocuments: vi.fn().mockResolvedValue({
          publishedCount: 2,
          hasMore: false,
          publishedDocuments: [
            { id: 'doc-1', tenantId: 'tenant-a' },
            { id: 'doc-2', tenantId: 'tenant-a' },
          ],
        }),
      }),
      errorLog,
      log,
      recordAudit,
    });

    await expect(job.run(CONTEXT)).rejects.toThrow('scheduled publish audit failed');
    expect(recordAudit).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'docs_scheduled_publish_audit_failed',
        audited_count: 1,
        audit_failed_count: 1,
        error_classes: ['Error'],
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'audit_failed', published_count: 2, audit_failed_count: 1 }),
    );
  });

  it('DOCS-CRON-004: 既定監査はsystem actorとrun keyを記録し、文字列の環境値だけを渡す', async () => {
    auditMocks.record.mockReset().mockResolvedValue(undefined);
    auditMocks.authRuntime.mockReset().mockReturnValue({ authz: { audit: { record: auditMocks.record } } });
    const job = createDocsScheduledPublishJob({
      resolveRepository: () => ({
        publishDueDocuments: vi.fn().mockResolvedValue({
          publishedCount: 1,
          hasMore: false,
          publishedDocuments: [{ id: 'doc-1', tenantId: 'tenant-a' }],
        }),
      }),
      log: vi.fn(),
    });

    await job.run({ ...CONTEXT, env: { AUTH_SECRET: 'secret', DB: { ignored: true } } });

    expect(auditMocks.authRuntime).toHaveBeenCalledWith({ AUTH_SECRET: 'secret' });
    expect(auditMocks.record).toHaveBeenCalledWith({
      actorSubject: 'system',
      tenantId: 'tenant-a',
      workspaceId: null,
      action: 'docs.scheduled_publish',
      resourceType: 'document',
      resourceId: 'doc-1',
      metadata: { credential: 'system', run_key: CONTEXT.runKey },
    });
  });
});
