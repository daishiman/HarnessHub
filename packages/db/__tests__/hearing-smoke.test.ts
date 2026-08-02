import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createHearingSmokeDbProbe } from '../repository/composition';
import { idpConnections, tenants, users, workspaces } from '../schema/core/identity';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => adapter.close());

describe('createHearingSmokeDbProbe', () => {
  it('fixture を 1 transaction で作り、途中失敗時に本番相当 DB へ半端な行を残さない', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));

    // 同じ tenant 内の idp_subject UNIQUE 違反を users INSERT で起こす。
    // それより前に tenant / idp_connection / workspace の INSERT は走るため、
    // transaction が無ければ 3 テーブルへゴミが残る回帰ケースになる。
    await expect(
      probe.createTenantFixture({
        slug: 'hearing-smoke-rollback',
        memberIdpSubject: 'duplicate-subject',
        workerIdpSubject: 'duplicate-subject',
      }),
    ).rejects.toThrow();

    expect(await adapter.client.select().from(tenants).where(eq(tenants.slug, 'hearing-smoke-rollback'))).toEqual([]);
    expect(
      await adapter.client
        .select()
        .from(idpConnections)
        .where(eq(idpConnections.issuerUrl, 'https://hearing-smoke.invalid/hearing-smoke-rollback')),
    ).toEqual([]);
    expect(
      await adapter.client.select().from(workspaces).where(eq(workspaces.slug, 'ws-hearing-smoke-rollback')),
    ).toEqual([]);
  });

  it('作成した fixture を tenant 単位で削除し、残数 0 を確認する', async () => {
    const probe = createHearingSmokeDbProbe(asCore(adapter));
    const fixture = await probe.createTenantFixture({
      slug: 'hearing-smoke-cleanup',
      memberIdpSubject: 'member-subject',
      workerIdpSubject: 'worker-subject',
    });

    expect(await adapter.client.select().from(users).where(eq(users.tenantId, fixture.tenantId))).toHaveLength(2);
    await expect(probe.cleanupTenant(fixture.tenantId)).resolves.toEqual({ remainingRows: 0, clean: true });
    expect(await adapter.client.select().from(tenants).where(eq(tenants.id, fixture.tenantId))).toEqual([]);
  });
});
