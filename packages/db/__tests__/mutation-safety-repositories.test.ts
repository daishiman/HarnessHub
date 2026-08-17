import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTursoClient, type TursoAdapter } from '../connection/turso';
import { createCoreRepositories } from '../repository/composition';
import { createScopedCrud } from '../repository/crud';
import { createDocsCmsRepository } from '../repository/docs-cms';
import { createHearingIntakeRepository } from '../repository/hearing-intake';
import { workspaces } from '../schema/core/identity';
import { auditEvents } from '../schema/core/security';
import { documents } from '../schema/docs-cms/schema';
import { aiJobs, hearingSheets } from '../schema/hearing-intake/schema';
import { mutationCreateIdempotency } from '../schema/mutation-safety/schema';
import { createRepositoryContext } from '../src/context';
import { asCore, createLibsqlTestDb, TEST_KEK_B64 } from './support/test-db';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;
const IDEMPOTENCY_KEY = '00000000-0000-4000-8000-000000000001';
const PAYLOAD_HASH = 'a'.repeat(64);

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => adapter.close());

async function seedActor(slug: string, targetAdapter: TursoAdapter = adapter) {
  const core = createCoreRepositories({ adapter: asCore(targetAdapter), kekBase64: TEST_KEK_B64 });
  const tenant = await core.tenants.create({ slug, name: `Tenant ${slug}`, plan: 'free' });
  const tenantContext = createRepositoryContext({ tenantId: tenant.id });
  const workspace = await createScopedCrud(asCore(targetAdapter), workspaces).insert(tenantContext, {
    slug: `ws-${slug}`,
    name: `Workspace ${slug}`,
  });
  const user = await core.users.insert(tenantContext, {
    idpSubject: `sub-${slug}`,
    email: `${slug}@example.com`,
    name: `User ${slug}`,
    department: '業務改善',
    role: 'workspace-admin',
    status: 'active',
  });
  return {
    tenantId: tenant.id,
    workspaceId: workspace.id as string,
    userId: user.id,
    context: createRepositoryContext({
      tenantId: tenant.id,
      workspaceId: workspace.id as string,
      actorId: user.id,
    }),
  };
}

function documentInput(actorId: string, title = 'Mutation-safe document') {
  return { scope: 'tenant' as const, title, bodyMarkdown: '# first', actorId };
}

function sheetInput(actor: Awaited<ReturnType<typeof seedActor>>, title = 'Mutation-safe sheet') {
  const form = { taskName: title, issue: '転記が多い' };
  const estimate = { savedHoursPerYear: 120, savedAmountPerYear: 360_000 };
  return {
    workspaceId: actor.workspaceId,
    title,
    applicantUserId: actor.userId,
    formJson: JSON.stringify(form),
    estimateJson: JSON.stringify(estimate),
    buildPayloadJson: (sheetId: string, code: string) => JSON.stringify({ sheet_id: sheetId, sheet_code: code }),
  };
}

function documentArtifacts(
  document: { readonly id: string; readonly entityRevision: number; readonly title: string },
  expiresAt: number,
  mapperVersion = 'v1',
) {
  return {
    status: 201,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      etag: `"docs-${document.id}-${document.entityRevision}"`,
      'idempotency-expires-at': String(expiresAt),
      'x-mapper-version': mapperVersion,
    },
    body: JSON.stringify({
      id: document.id,
      revision: document.entityRevision,
      title: document.title,
      mapper_version: mapperVersion,
    }),
  };
}

function sheetArtifacts(
  sheet: { readonly id: string; readonly entityRevision: number; readonly code: string },
  expiresAt: number,
) {
  return {
    status: 201,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      etag: `"sheets-${sheet.id}-${sheet.entityRevision}"`,
      'idempotency-expires-at': String(expiresAt),
    },
    body: JSON.stringify({ id: sheet.id, revision: sheet.entityRevision, code: sheet.code }),
  };
}

function documentAudit(actor: Awaited<ReturnType<typeof seedActor>>) {
  return {
    actorType: 'user' as const,
    actorId: actor.userId,
    summary: { credential: 'session', scope: 'tenant' },
  };
}

describe('CARD-MUTATION repository safety', () => {
  it('defaults entityRevision to 1 and increments every Docs representation-changing writeback independently of externalRevision', async () => {
    const actor = await seedActor('mutation-docs-revisions');
    const repository = createDocsCmsRepository(asCore(adapter));
    const created = await repository.createDocument(actor.context, documentInput(actor.userId));
    expect(created).toMatchObject({ entityRevision: 1, externalRevision: null });

    const edited = await repository.updateDocument(actor.context, created.id, {
      bodyMarkdown: '# edited',
      actorId: actor.userId,
    });
    expect(edited).toMatchObject({ entityRevision: 2, externalRevision: null });

    const publishAt = Date.now() + 60_000;
    const scheduled = await repository.updateDocument(actor.context, created.id, {
      publishAt,
      actorId: actor.userId,
    });
    expect(scheduled.entityRevision).toBe(3);
    await repository.publishDueDocuments(publishAt + 1);
    expect(await repository.getDocument(actor.context, created.id)).toMatchObject({
      entityRevision: 4,
      status: 'published',
      externalRevision: null,
    });

    const draft = await repository.createDocument(actor.context, documentInput(actor.userId, 'AI draft'));
    await repository.enqueueDocDraft(actor.context, draft.id, actor.workspaceId, '{}');
    const job = await repository.claimNextDocDraftJob(actor.context, 'worker-token');
    await repository.completeDocDraftJob(
      actor.context,
      job?.id ?? '',
      'worker-token',
      JSON.stringify({ body_markdown: '# generated' }),
    );
    expect(await repository.getDocument(actor.context, draft.id)).toMatchObject({ entityRevision: 2 });

    const external = await repository.syncExternalDocument(actor.context, {
      source: 'codex',
      externalDocumentId: 'e'.repeat(64),
      title: 'External',
      bodyMarkdown: '# v1',
      autoThumbnailUrl: null,
      autoExcerpt: 'v1',
      assetSummary: '{}',
      actorId: actor.userId,
    });
    expect(external.document).toMatchObject({ entityRevision: 1, externalRevision: 1 });
    const resynced = await repository.syncExternalDocument(actor.context, {
      source: 'codex',
      externalDocumentId: 'e'.repeat(64),
      title: 'External',
      bodyMarkdown: '# v2',
      autoThumbnailUrl: null,
      autoExcerpt: 'v2',
      assetSummary: '{}',
      actorId: actor.userId,
      expectedRevision: 1,
    });
    expect(resynced.document).toMatchObject({ entityRevision: 2, externalRevision: 2 });
  });

  it('Docs CAS uses entity revision and accepts exactly one concurrent update', async () => {
    const actor = await seedActor('mutation-docs-cas');
    const repository = createDocsCmsRepository(asCore(adapter));
    const created = await repository.createDocument(actor.context, documentInput(actor.userId));

    const [first, second] = await Promise.all([
      repository.updateDocumentCas(
        actor.context,
        created.id,
        { bodyMarkdown: '# winner-a', actorId: actor.userId },
        created.entityRevision,
      ),
      repository.updateDocumentCas(
        actor.context,
        created.id,
        { bodyMarkdown: '# winner-b', actorId: actor.userId },
        created.entityRevision,
      ),
    ]);

    expect([first, second].filter((result) => result.outcome === 'updated')).toHaveLength(1);
    const conflict = [first, second].find((result) => result.outcome === 'conflict');
    expect(conflict).toMatchObject({ outcome: 'conflict', current: { entityRevision: 2 } });
  });

  it('Sheets CAS is tenant+workspace scoped and every public queue-state transition increments entityRevision', async () => {
    const actor = await seedActor('mutation-sheets-cas');
    const repository = createHearingIntakeRepository(asCore(adapter));
    const created = await repository.createSheetAndEnqueue(actor.context, sheetInput(actor));
    expect(created.entityRevision).toBe(1);

    const [first, second] = await Promise.all([
      repository.updateSheetStatusCas(actor.context, created.id, 'review', created.entityRevision),
      repository.updateSheetStatusCas(actor.context, created.id, 'completed', created.entityRevision),
    ]);
    expect([first, second].filter((result) => result.outcome === 'updated')).toHaveLength(1);
    expect([first, second].find((result) => result.outcome === 'conflict')).toMatchObject({
      outcome: 'conflict',
      current: { entityRevision: 2 },
    });
    await adapter.client.delete(aiJobs).where(eq(aiJobs.refId, created.id));

    const lifecycle = await repository.createSheetAndEnqueue(actor.context, sheetInput(actor, 'Queue lifecycle'));
    expect(lifecycle).toMatchObject({ entityRevision: 1, aiJobStatus: 'queued', status: 'generating' });
    const claimed = await repository.claimNextSheetGenerationJob(actor.context, 'stale-sheet-worker', 0);
    expect(claimed?.refId).toBe(lifecycle.id);
    expect(await repository.findSheet(actor.context, lifecycle.id)).toMatchObject({
      entityRevision: 2,
      aiJobStatus: 'processing',
      status: 'generating',
    });
    const reclaimed = await repository.claimNextSheetGenerationJob(actor.context, 'sheet-worker');
    expect(reclaimed?.id).toBe(claimed?.id);
    expect(await repository.findSheet(actor.context, lifecycle.id)).toMatchObject({
      entityRevision: 2,
      aiJobStatus: 'processing',
    });
    await repository.completeSheetGenerationJob(actor.context, reclaimed?.id ?? '', 'sheet-worker', '{}');
    expect(await repository.findSheet(actor.context, lifecycle.id)).toMatchObject({
      entityRevision: 3,
      aiJobStatus: 'completed',
      status: 'review',
    });

    const regenerated = await repository.regenerate(actor.context, lifecycle.id);
    expect(regenerated).toMatchObject({ entityRevision: 4, status: 'generating' });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const failedJob = await repository.claimNextSheetGenerationJob(actor.context, 'sheet-failing-worker');
      expect(await repository.findSheet(actor.context, lifecycle.id)).toMatchObject({
        entityRevision: 3 + attempt * 2,
        aiJobStatus: 'processing',
      });
      await repository.failSheetGenerationJob(
        actor.context,
        failedJob?.id ?? '',
        'sheet-failing-worker',
        `failure ${attempt}`,
      );
      expect(await repository.findSheet(actor.context, lifecycle.id)).toMatchObject({
        entityRevision: 4 + attempt * 2,
        aiJobStatus: attempt === 3 ? 'dead' : 'queued',
      });
    }
    expect(await repository.findSheet(actor.context, lifecycle.id)).toMatchObject({
      entityRevision: 10,
      status: 'received',
    });

    const otherWorkspace = await createScopedCrud(asCore(adapter), workspaces).insert(
      createRepositoryContext({ tenantId: actor.tenantId }),
      { slug: 'ws-mutation-other', name: 'Other workspace' },
    );
    const otherContext = createRepositoryContext({
      tenantId: actor.tenantId,
      workspaceId: otherWorkspace.id as string,
      actorId: actor.userId,
    });
    await expect(repository.updateSheetStatusCas(otherContext, created.id, 'completed', 2)).resolves.toEqual({
      outcome: 'conflict',
      current: null,
    });
  });

  it('keeps an administrator-completed Sheet terminal while late complete and dead queue results advance revision', async () => {
    const actor = await seedActor('mutation-sheets-admin-completed');
    const repository = createHearingIntakeRepository(asCore(adapter));

    const lateComplete = await repository.createSheetAndEnqueue(actor.context, sheetInput(actor, 'Late complete'));
    const completeJob = await repository.claimNextSheetGenerationJob(actor.context, 'late-complete-worker');
    expect(completeJob?.refId).toBe(lateComplete.id);
    expect((await repository.findSheet(actor.context, lateComplete.id))?.entityRevision).toBe(2);
    expect(await repository.updateSheetStatus(actor.context, lateComplete.id, 'completed')).toMatchObject({
      entityRevision: 3,
      status: 'completed',
    });
    await repository.completeSheetGenerationJob(actor.context, completeJob?.id ?? '', 'late-complete-worker', '{}');
    expect(await repository.findSheet(actor.context, lateComplete.id)).toMatchObject({
      entityRevision: 4,
      aiJobStatus: 'completed',
      status: 'completed',
    });

    const lateDead = await repository.createSheetAndEnqueue(actor.context, sheetInput(actor, 'Late dead'));
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const retryJob = await repository.claimNextSheetGenerationJob(actor.context, 'late-dead-worker');
      expect(retryJob?.refId).toBe(lateDead.id);
      await repository.failSheetGenerationJob(
        actor.context,
        retryJob?.id ?? '',
        'late-dead-worker',
        `retry ${attempt}`,
      );
    }
    const deadJob = await repository.claimNextSheetGenerationJob(actor.context, 'late-dead-worker');
    expect(deadJob?.refId).toBe(lateDead.id);
    expect(await repository.updateSheetStatus(actor.context, lateDead.id, 'completed')).toMatchObject({
      entityRevision: 7,
      status: 'completed',
    });
    await repository.failSheetGenerationJob(actor.context, deadJob?.id ?? '', 'late-dead-worker', 'terminal failure');
    expect(await repository.findSheet(actor.context, lateDead.id)).toMatchObject({
      entityRevision: 8,
      aiJobStatus: 'dead',
      status: 'completed',
    });
  });

  it('atomically replays concurrent Docs create, rejects payload reuse, and reuses an expired key', async () => {
    const actor = await seedActor('mutation-docs-idempotency');
    const repository = createDocsCmsRepository(asCore(adapter));
    const now = 1_000_000;
    const request = { key: IDEMPOTENCY_KEY, payloadHash: PAYLOAD_HASH, now };

    const [first, second] = await Promise.all([
      repository.createDocumentIdempotent(
        actor.context,
        documentInput(actor.userId),
        request,
        documentArtifacts,
        documentAudit(actor),
      ),
      repository.createDocumentIdempotent(
        actor.context,
        documentInput(actor.userId),
        request,
        documentArtifacts,
        documentAudit(actor),
      ),
    ]);
    expect(new Set([first.outcome, second.outcome])).toEqual(new Set(['created', 'replayed']));
    const created = [first, second].find((result) => result.outcome === 'created');
    const concurrentReplay = [first, second].find((result) => result.outcome === 'replayed');
    if (created?.outcome !== 'created' || concurrentReplay?.outcome !== 'replayed') {
      throw new Error('same payload must create once and replay once');
    }
    expect(concurrentReplay).not.toHaveProperty('document');
    expect(concurrentReplay.wireResponse).toEqual(created.wireResponse);
    expect(await adapter.client.select().from(documents)).toHaveLength(1);
    expect(await adapter.client.select().from(auditEvents)).toMatchObject([
      { action: 'docs.create', entityId: created.document.id, workspaceId: actor.workspaceId },
    ]);

    await repository.updateDocument(actor.context, created.document.id, {
      bodyMarkdown: '# changed after create',
      actorId: actor.userId,
    });
    await adapter.client.delete(documents).where(eq(documents.id, created.document.id));
    const changedMapper = vi.fn((document, expiresAt) => documentArtifacts(document, expiresAt, 'v2'));
    const replayedSnapshot = await repository.createDocumentIdempotent(
      actor.context,
      documentInput(actor.userId),
      {
        ...request,
        now: now + 1,
      },
      changedMapper,
      documentAudit(actor),
    );
    expect(replayedSnapshot).toEqual({
      outcome: 'replayed',
      expiresAt: request.now + IDEMPOTENCY_TTL_MS,
      wireResponse: created.wireResponse,
    });
    expect(changedMapper).not.toHaveBeenCalled();
    expect(await repository.getDocument(actor.context, created.document.id)).toBeNull();

    const stored = await adapter.client.select().from(mutationCreateIdempotency);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      responseStatus: created.wireResponse.status,
      responseHeadersJson: JSON.stringify(
        Object.fromEntries(
          Object.entries(created.wireResponse.headers).sort(([left], [right]) => left.localeCompare(right)),
        ),
      ),
      responseBody: created.wireResponse.body,
    });
    expect(stored[0]).not.toHaveProperty('responseJson');
    expect(stored[0]).not.toHaveProperty('deliveryId');

    await expect(
      repository.createDocumentIdempotent(
        actor.context,
        documentInput(actor.userId, 'different'),
        {
          ...request,
          payloadHash: 'b'.repeat(64),
        },
        documentArtifacts,
        documentAudit(actor),
      ),
    ).resolves.toEqual({ outcome: 'conflict', expiresAt: now + IDEMPOTENCY_TTL_MS });

    const reused = await repository.createDocumentIdempotent(
      actor.context,
      documentInput(actor.userId, 'expired'),
      {
        ...request,
        payloadHash: 'c'.repeat(64),
        now: now + IDEMPOTENCY_TTL_MS,
      },
      documentArtifacts,
      documentAudit(actor),
    );
    if (reused.outcome !== 'created') throw new Error('expired key must be reusable');
    expect(reused.document.id).not.toBe(created.document.id);
    expect(await adapter.client.select().from(documents)).toHaveLength(1);
    expect(await adapter.client.select().from(auditEvents)).toHaveLength(2);
  });

  it('Docs replay bypasses publishAt future validation after the original timestamp passes within the ledger TTL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const initialNow = Date.UTC(2026, 7, 15, 0, 0, 0);
      vi.setSystemTime(initialNow);
      const actor = await seedActor('mutation-docs-replay-time');
      const repository = createDocsCmsRepository(asCore(adapter));
      const input = { ...documentInput(actor.userId), publishAt: initialNow + 60 * 60 * 1_000 };
      const request = { key: IDEMPOTENCY_KEY, payloadHash: PAYLOAD_HASH, now: initialNow };
      const initial = await repository.createDocumentIdempotent(
        actor.context,
        input,
        request,
        documentArtifacts,
        documentAudit(actor),
      );
      if (initial.outcome !== 'created') throw new Error('initial request must create');

      vi.setSystemTime(initialNow + 2 * 60 * 60 * 1_000);
      const replayed = await repository.createDocumentIdempotent(
        actor.context,
        input,
        {
          ...request,
          now: initialNow + 2 * 60 * 60 * 1_000,
        },
        documentArtifacts,
        documentAudit(actor),
      );
      expect(replayed).toMatchObject({ outcome: 'replayed', wireResponse: initial.wireResponse });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rolls back document and wire ledger when the in-transaction Docs audit insert fails', async () => {
    const actor = await seedActor('mutation-docs-audit-rollback');
    const repository = createDocsCmsRepository(asCore(adapter));
    const request = { key: IDEMPOTENCY_KEY, payloadHash: PAYLOAD_HASH, now: 3_000_000 };
    await adapter.client.run(
      sql.raw(`
      CREATE TRIGGER fail_docs_create_audit
      BEFORE INSERT ON audit_events
      WHEN NEW.action = 'docs.create'
      BEGIN
        SELECT RAISE(ABORT, 'forced docs audit failure');
      END
    `),
    );
    await expect(
      repository.createDocumentIdempotent(
        actor.context,
        documentInput(actor.userId),
        request,
        documentArtifacts,
        documentAudit(actor),
      ),
    ).rejects.toThrow('Failed query: insert into "audit_events"');
    expect(await adapter.client.select().from(documents)).toHaveLength(0);
    expect(await adapter.client.select().from(mutationCreateIdempotency)).toHaveLength(0);
    expect(await adapter.client.select().from(auditEvents)).toHaveLength(0);
  });

  it('requires a non-empty Docs workspace scope and separates the same key across workspaces in one tenant', async () => {
    const actor = await seedActor('mutation-docs-workspaces');
    const repository = createDocsCmsRepository(asCore(adapter));
    const request = { key: IDEMPOTENCY_KEY, payloadHash: PAYLOAD_HASH, now: 4_000_000 };
    const missingWorkspace = createRepositoryContext({ tenantId: actor.tenantId, actorId: actor.userId });
    await expect(
      repository.createDocumentIdempotent(
        missingWorkspace,
        documentInput(actor.userId),
        request,
        documentArtifacts,
        documentAudit(actor),
      ),
    ).rejects.toMatchObject({ code: 'invalid-context' });

    const otherWorkspace = await createScopedCrud(asCore(adapter), workspaces).insert(
      createRepositoryContext({ tenantId: actor.tenantId }),
      { slug: 'ws-docs-idempotency-other', name: 'Docs idempotency other' },
    );
    const otherContext = createRepositoryContext({
      tenantId: actor.tenantId,
      workspaceId: otherWorkspace.id as string,
      actorId: actor.userId,
    });
    const [first, second] = await Promise.all([
      repository.createDocumentIdempotent(
        actor.context,
        documentInput(actor.userId),
        request,
        documentArtifacts,
        documentAudit(actor),
      ),
      repository.createDocumentIdempotent(
        otherContext,
        documentInput(actor.userId),
        request,
        documentArtifacts,
        documentAudit(actor),
      ),
    ]);
    expect(first.outcome).toBe('created');
    expect(second.outcome).toBe('created');
    expect(await adapter.client.select().from(documents)).toHaveLength(2);
  });

  it('rejects Docs idempotent create unless context, input, and audit actors are the same', async () => {
    const actor = await seedActor('mutation-docs-actor-invariant');
    const repository = createDocsCmsRepository(asCore(adapter));
    const missingActorContext = createRepositoryContext({
      tenantId: actor.tenantId,
      workspaceId: actor.workspaceId,
    });
    const mismatches = [
      {
        context: missingActorContext,
        inputActorId: actor.userId,
        auditActorId: actor.userId,
      },
      {
        context: actor.context,
        inputActorId: 'different-input-actor',
        auditActorId: actor.userId,
      },
      {
        context: actor.context,
        inputActorId: actor.userId,
        auditActorId: 'different-audit-actor',
      },
    ] as const;

    for (const [index, mismatch] of mismatches.entries()) {
      await expect(
        repository.createDocumentIdempotent(
          mismatch.context,
          documentInput(mismatch.inputActorId),
          {
            key: `00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
            payloadHash: PAYLOAD_HASH,
            now: 4_500_000 + index,
          },
          documentArtifacts,
          {
            ...documentAudit(actor),
            actorId: mismatch.auditActorId,
          },
        ),
      ).rejects.toMatchObject({ code: 'invalid-context' });
    }

    expect(await adapter.client.select().from(documents)).toHaveLength(0);
    expect(await adapter.client.select().from(mutationCreateIdempotency)).toHaveLength(0);
    expect(await adapter.client.select().from(auditEvents)).toHaveLength(0);
  });

  it('bounds opportunistic expired-ledger cleanup while using the expires index path', async () => {
    const actor = await seedActor('mutation-cleanup');
    const now = 6_000_000;
    await adapter.client.insert(mutationCreateIdempotency).values(
      Array.from({ length: 55 }, (_, index) => ({
        tenantId: `expired-tenant-${index}`,
        workspaceId: `expired-workspace-${index}`,
        resource: 'documents' as const,
        operation: 'create' as const,
        key: `expired-key-${index}`,
        payloadHash: PAYLOAD_HASH,
        resourceId: `expired-resource-${index}`,
        responseStatus: 201,
        responseHeadersJson: '{}',
        responseBody: '{}',
        expiresAt: now - 1,
        createdAt: now - IDEMPOTENCY_TTL_MS,
      })),
    );
    const repository = createDocsCmsRepository(asCore(adapter));
    await repository.createDocumentIdempotent(
      actor.context,
      documentInput(actor.userId),
      { key: IDEMPOTENCY_KEY, payloadHash: PAYLOAD_HASH, now },
      documentArtifacts,
      documentAudit(actor),
    );
    const rows = await adapter.client.select().from(mutationCreateIdempotency);
    expect(rows.filter((row) => row.expiresAt <= now)).toHaveLength(5);
  });

  it('uses DB transaction and primary-key arbitration across request-bound independent connections', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'mutation-independent-connections-'));
    const url = `file:${join(directory, 'shared.db')}`;
    const firstConnection = await createLibsqlTestDb(url);
    const secondConnection = createTursoClient({ url });
    const requestBound = (source: TursoAdapter): TursoAdapter => ({
      ...source,
      writeConcurrencyScope: 'request-bound',
    });
    try {
      const actor = await seedActor('mutation-independent', firstConnection);
      const firstRepository = createDocsCmsRepository(asCore(requestBound(firstConnection)));
      const secondRepository = createDocsCmsRepository(asCore(requestBound(secondConnection)));
      const request = { key: IDEMPOTENCY_KEY, payloadHash: PAYLOAD_HASH, now: 7_000_000 };
      const attempts = await Promise.allSettled([
        firstRepository.createDocumentIdempotent(
          actor.context,
          documentInput(actor.userId),
          request,
          documentArtifacts,
          documentAudit(actor),
        ),
        secondRepository.createDocumentIdempotent(
          actor.context,
          documentInput(actor.userId),
          request,
          documentArtifacts,
          documentAudit(actor),
        ),
      ]);
      const fulfilled = attempts.filter((attempt) => attempt.status === 'fulfilled').map((attempt) => attempt.value);
      // local libSQL は別file接続のBEGIN IMMEDIATE競合をBUSYで毒隔離する場合がある。
      // それでも JS write queue を共有しない同時試行のDB結果は勝者1行に限定される。
      expect(fulfilled.filter((result) => result.outcome === 'created')).toHaveLength(1);
      expect(await firstConnection.client.select().from(documents)).toHaveLength(1);
      expect(await firstConnection.client.select().from(mutationCreateIdempotency)).toHaveLength(1);
      expect(await firstConnection.client.select().from(auditEvents)).toHaveLength(1);

      firstConnection.reconnect();
      secondConnection.reconnect();
      await expect(
        secondRepository.createDocumentIdempotent(
          actor.context,
          documentInput(actor.userId),
          { ...request, now: request.now + 1 },
          () => {
            throw new Error('DB winner snapshot must replay after reconnect');
          },
          documentAudit(actor),
        ),
      ).resolves.toMatchObject({ outcome: 'replayed' });
    } finally {
      secondConnection.close();
      firstConnection.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('retries a request-bound pre-transaction SQLITE_BUSY and fulfills both same-key creates', async () => {
    const actor = await seedActor('mutation-request-bound-retry');
    let transactionAttempts = 0;
    let peerFinished: () => void = () => undefined;
    const peerCompletion = new Promise<void>((resolve) => {
      peerFinished = resolve;
    });
    const retryingAdapter: TursoAdapter = {
      ...adapter,
      writeConcurrencyScope: 'request-bound',
      async transaction(run) {
        transactionAttempts += 1;
        if (transactionAttempts === 1) {
          const busy = new Error('SQLITE_BUSY: injected before transaction start');
          Object.assign(busy, { code: 'SQLITE_BUSY' });
          throw busy;
        }
        await peerCompletion;
        return adapter.transaction(run);
      },
    };
    const peerAdapter: TursoAdapter = {
      ...adapter,
      writeConcurrencyScope: 'request-bound',
      async transaction(run) {
        try {
          return await adapter.transaction(run);
        } finally {
          peerFinished();
        }
      },
    };
    const retryingRepository = createDocsCmsRepository(asCore(retryingAdapter));
    const peerRepository = createDocsCmsRepository(asCore(peerAdapter));
    const request = { key: IDEMPOTENCY_KEY, payloadHash: PAYLOAD_HASH, now: 7_500_000 };

    const results = await Promise.all([
      retryingRepository.createDocumentIdempotent(
        actor.context,
        documentInput(actor.userId),
        request,
        documentArtifacts,
        documentAudit(actor),
      ),
      peerRepository.createDocumentIdempotent(
        actor.context,
        documentInput(actor.userId),
        request,
        documentArtifacts,
        documentAudit(actor),
      ),
    ]);

    expect(transactionAttempts).toBe(2);
    expect(new Set(results.map((result) => result.outcome))).toEqual(new Set(['created', 'replayed']));
    expect(await adapter.client.select().from(documents)).toHaveLength(1);
    expect(await adapter.client.select().from(mutationCreateIdempotency)).toHaveLength(1);
    expect(await adapter.client.select().from(auditEvents)).toHaveLength(1);
  });

  it('atomically replays Sheets create including its queue row and separates resource scope from Docs', async () => {
    const actor = await seedActor('mutation-sheets-idempotency');
    const sheetsRepository = createHearingIntakeRepository(asCore(adapter));
    const docsRepository = createDocsCmsRepository(asCore(adapter));
    const request = { key: IDEMPOTENCY_KEY, payloadHash: PAYLOAD_HASH, now: 2_000_000 };

    const [first, second] = await Promise.all([
      sheetsRepository.createSheetAndEnqueueIdempotent(actor.context, sheetInput(actor), request, sheetArtifacts),
      sheetsRepository.createSheetAndEnqueueIdempotent(actor.context, sheetInput(actor), request, sheetArtifacts),
    ]);
    expect(new Set([first.outcome, second.outcome])).toEqual(new Set(['created', 'replayed']));
    const createdSheet = [first, second].find((result) => result.outcome === 'created');
    const replayedSheet = [first, second].find((result) => result.outcome === 'replayed');
    if (createdSheet?.outcome !== 'created' || replayedSheet?.outcome !== 'replayed') {
      throw new Error('same payload must create once and replay once');
    }
    expect(replayedSheet).not.toHaveProperty('sheet');
    expect(replayedSheet.wireResponse).toEqual(createdSheet.wireResponse);
    expect(await adapter.client.select().from(hearingSheets)).toHaveLength(1);
    expect(await adapter.client.select().from(aiJobs)).toHaveLength(1);

    const document = await docsRepository.createDocumentIdempotent(
      actor.context,
      documentInput(actor.userId),
      request,
      documentArtifacts,
      documentAudit(actor),
    );
    expect(document.outcome).toBe('created');
    expect(await adapter.client.select().from(documents)).toHaveLength(1);

    const otherWorkspace = await createScopedCrud(asCore(adapter), workspaces).insert(
      createRepositoryContext({ tenantId: actor.tenantId }),
      { slug: 'ws-idempotency-other', name: 'Idempotency Other' },
    );
    const otherWorkspaceActor = {
      ...actor,
      workspaceId: otherWorkspace.id as string,
      context: createRepositoryContext({
        tenantId: actor.tenantId,
        workspaceId: otherWorkspace.id as string,
        actorId: actor.userId,
      }),
    };
    await expect(
      sheetsRepository.createSheetAndEnqueueIdempotent(
        otherWorkspaceActor.context,
        sheetInput(otherWorkspaceActor),
        request,
        sheetArtifacts,
      ),
    ).resolves.toMatchObject({ outcome: 'created' });

    const otherTenant = await seedActor('mutation-docs-other-tenant');
    await expect(
      docsRepository.createDocumentIdempotent(
        otherTenant.context,
        documentInput(otherTenant.userId),
        request,
        documentArtifacts,
        documentAudit(otherTenant),
      ),
    ).resolves.toMatchObject({ outcome: 'created' });
    expect(await adapter.client.select().from(hearingSheets)).toHaveLength(2);
    expect(await adapter.client.select().from(documents)).toHaveLength(2);
  });
});
