// DMDB-T02: Release の immutable 強制と version 自動採番、stable pointer の atomic 切替 (acceptance A2 / I3)。

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createTargetChannelsRepo } from '../repository/channels';
import { createScopedCrud } from '../repository/crud';
import { createReleasesRepo } from '../repository/releases';
import { createTenantsRepo } from '../repository/tenants';
import { releases } from '../schema/core/catalog';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb } from './support/test-db';

let adapter: TursoAdapter;
let context: RepositoryContext;
let channelId: string;
let projectId: string;

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
  const core = asCore(adapter);
  const tenant = await createTenantsRepo(core).create({ slug: 'rel', name: 'Rel', plan: 'free' });
  context = createRepositoryContext({ tenantId: tenant.id });
  projectId = 'proj-rel-1';
  const channel = await createTargetChannelsRepo(core).create(context, { projectId, target: 'skill' });
  channelId = channel.id;
});

afterAll(() => adapter.close());

describe('DMDB-T02 release immutability', () => {
  it('公開 API に status 以外の更新関数が存在しない', () => {
    const repo = createReleasesRepo(asCore(adapter));
    expect(Object.keys(repo).sort()).toStrictEqual([
      'createRelease',
      'findById',
      'listByChannel',
      'updateReleaseStatus',
    ]);
  });

  it('汎用 scoped CRUD は releases に対して生成できない (immutable 契約)', () => {
    expect(() => createScopedCrud(asCore(adapter), releases)).toThrow(/immutable/);
  });

  it('version が package_hash 差分から自動採番される (同一 hash は再採番しない)', async () => {
    const repo = createReleasesRepo(asCore(adapter));
    const base = { projectId, channelId, manifestJson: '{}', createdBy: 'tester' };

    const first = await repo.createRelease(context, { ...base, packageHash: 'hash-aaa' });
    expect(first.created).toBe(true);
    expect(first.release.version).toBe('v1');

    const dup = await repo.createRelease(context, { ...base, packageHash: 'hash-aaa' });
    expect(dup.created).toBe(false);
    expect(dup.release.id).toBe(first.release.id);

    const second = await repo.createRelease(context, { ...base, packageHash: 'hash-bbb' });
    expect(second.created).toBe(true);
    expect(second.release.version).toBe('v2');
  });

  it('updateReleaseStatus は status のみを変更し他列は不変', async () => {
    const repo = createReleasesRepo(asCore(adapter));
    const { release } = await repo.createRelease(context, {
      projectId,
      channelId,
      packageHash: 'hash-ccc',
      manifestJson: '{"k":1}',
      createdBy: 'tester',
    });
    const updated = await repo.updateReleaseStatus(context, release.id, 'suspended');
    expect(updated.status).toBe('suspended');
    expect(updated.version).toBe(release.version);
    expect(updated.packageHash).toBe(release.packageHash);
    expect(updated.manifestJson).toBe(release.manifestJson);
    expect(updated.createdAt).toBe(release.createdAt);
  });

  it('stable pointer が atomic に切替わり rollback できる (I3)', async () => {
    const core = asCore(adapter);
    const channels = createTargetChannelsRepo(core);
    const repo = createReleasesRepo(core);
    const v1 = await repo.createRelease(context, {
      projectId,
      channelId,
      packageHash: 'hash-ddd',
      manifestJson: '{}',
      createdBy: 'tester',
    });
    const promoted = await channels.setStableRelease(context, channelId, v1.release.id);
    expect(promoted.stableReleaseId).toBe(v1.release.id);

    const v2 = await repo.createRelease(context, {
      projectId,
      channelId,
      packageHash: 'hash-eee',
      manifestJson: '{}',
      createdBy: 'tester',
    });
    await channels.setStableRelease(context, channelId, v2.release.id);
    // rollback = 旧 release への同一操作
    const rolledBack = await channels.setStableRelease(context, channelId, v1.release.id);
    expect(rolledBack.stableReleaseId).toBe(v1.release.id);
  });

  it('他 channel の release を stable にできない', async () => {
    const core = asCore(adapter);
    const channels = createTargetChannelsRepo(core);
    const other = await channels.create(context, { projectId, target: 'web_app' });
    const repo = createReleasesRepo(core);
    const { release } = await repo.createRelease(context, {
      projectId,
      channelId,
      packageHash: 'hash-fff',
      manifestJson: '{}',
      createdBy: 'tester',
    });
    await expect(channels.setStableRelease(context, other.id, release.id)).rejects.toThrow(/属していません/);
  });
});
