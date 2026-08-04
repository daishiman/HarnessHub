// releases リポジトリの読取と異常系 (I3)。
// version 自動採番は channel 単位に閉じるため、テストごとに新しい project / channel を切る。

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createTargetChannelsRepo } from '../repository/channels';
import { createScopedCrud } from '../repository/crud';
import { createReleasesRepo, type ReleasesRepo } from '../repository/releases';
import { createTenantsRepo } from '../repository/tenants';
import { createUsersRepo } from '../repository/users';
import { projects } from '../schema/core/catalog';
import { workspaces } from '../schema/core/identity';
import { createRepositoryContext } from '../src/context';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

let adapter: TursoAdapter;
let repo: ReleasesRepo;
let context: RepositoryContext;
let userId: string;
let workspaceId: string;
let channelSeq = 0;

/** project ごとに channel を 1 本切る (UNIQUE(project_id, target) があるため target は使い回せない)。 */
async function newChannel(): Promise<{ projectId: string; channelId: string }> {
  channelSeq += 1;
  const project = await createScopedCrud(asCore(adapter), projects).insert(context, {
    workspaceId,
    slug: `proj-rel-${channelSeq}`,
    name: `Project Rel ${channelSeq}`,
    description: null,
    ownerUserId: userId,
    status: 'active',
  });
  const projectId = project.id as string;
  const channel = await createTargetChannelsRepo(asCore(adapter)).create(context, { projectId, target: 'skill' });
  return { projectId, channelId: channel.id };
}

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
  const core = asCore(adapter);
  const tenant = await createTenantsRepo(core).create({ slug: 'rel-repo', name: 'Rel Repo', plan: 'free' });
  context = createRepositoryContext({ tenantId: tenant.id });

  const workspace = await createScopedCrud(core, workspaces).insert(context, { slug: 'ws-rel', name: 'WS Rel' });
  workspaceId = workspace.id as string;

  const user = await createUsersRepo(core, testCipher(core)).insert(context, {
    idpSubject: 'subject-rel',
    email: 'publisher@rel.example.com',
    name: 'Publisher',
    role: 'workspace-admin',
    status: 'active',
  });
  userId = user.id;

  repo = createReleasesRepo(core);
});

afterAll(() => adapter.close());

describe('createRelease の version 採番', () => {
  it('channel の初回 release は v1 として作成される', async () => {
    const { projectId, channelId } = await newChannel();
    const { release, created } = await repo.createRelease(context, {
      projectId,
      channelId,
      packageHash: 'hash-first',
      manifestJson: '{"name":"first"}',
      createdBy: userId,
    });

    expect(created).toBe(true);
    expect(release.version).toBe('v1');
    expect(release.status).toBe('available');
    expect(release.tenantId).toBe(context.tenantId);
    expect(release.createdBy).toBe(userId);
  });

  it('package_hash に差分があれば v1 → v2 と連番で採番する', async () => {
    const { projectId, channelId } = await newChannel();
    const base = { projectId, channelId, manifestJson: '{}', createdBy: userId };

    const v1 = await repo.createRelease(context, { ...base, packageHash: 'hash-a' });
    const v2 = await repo.createRelease(context, { ...base, packageHash: 'hash-b' });

    expect([v1.release.version, v2.release.version]).toStrictEqual(['v1', 'v2']);
    expect(v2.created).toBe(true);
    expect(v2.release.id).not.toBe(v1.release.id);
  });

  it('直前 release と package_hash が同じなら再採番せず既存を返す', async () => {
    const { projectId, channelId } = await newChannel();
    const base = { projectId, channelId, manifestJson: '{}', createdBy: userId };

    const first = await repo.createRelease(context, { ...base, packageHash: 'hash-same' });
    const again = await repo.createRelease(context, { ...base, packageHash: 'hash-same' });

    expect(again.created).toBe(false);
    expect(again.release.id).toBe(first.release.id);
    expect(again.release.version).toBe('v1');
  });

  it('採番は channel ごとに独立している', async () => {
    const one = await newChannel();
    const two = await newChannel();

    const a = await repo.createRelease(context, {
      ...one,
      packageHash: 'hash-ch-1',
      manifestJson: '{}',
      createdBy: userId,
    });
    const b = await repo.createRelease(context, {
      ...two,
      packageHash: 'hash-ch-2',
      manifestJson: '{}',
      createdBy: userId,
    });

    expect(a.release.version).toBe('v1');
    expect(b.release.version).toBe('v1');
  });
});

describe('releases の読取', () => {
  it('findById は自テナントの release を返し、未知の id は null になる', async () => {
    const { projectId, channelId } = await newChannel();
    const { release } = await repo.createRelease(context, {
      projectId,
      channelId,
      packageHash: 'hash-find',
      manifestJson: '{"k":1}',
      createdBy: userId,
    });

    const found = await repo.findById(context, release.id);
    expect(found?.manifestJson).toBe('{"k":1}');
    expect(await repo.findById(context, 'missing-id')).toBeNull();
  });

  it('listByChannel は新しい順 (id 降順 = 作成順降順) で返す', async () => {
    const { projectId, channelId } = await newChannel();
    const base = { projectId, channelId, manifestJson: '{}', createdBy: userId };
    await repo.createRelease(context, { ...base, packageHash: 'hash-l1' });
    await repo.createRelease(context, { ...base, packageHash: 'hash-l2' });
    await repo.createRelease(context, { ...base, packageHash: 'hash-l3' });

    const rows = await repo.listByChannel(context, channelId);
    expect(rows.map((row) => row.version)).toStrictEqual(['v3', 'v2', 'v1']);
  });

  it('release の無い channel では listByChannel が空になる', async () => {
    const { channelId } = await newChannel();
    expect(await repo.listByChannel(context, channelId)).toStrictEqual([]);
  });
});

describe('updateReleaseStatus', () => {
  it('status を遷移させた行を返す', async () => {
    const { projectId, channelId } = await newChannel();
    const { release } = await repo.createRelease(context, {
      projectId,
      channelId,
      packageHash: 'hash-status',
      manifestJson: '{}',
      createdBy: userId,
    });

    const suspended = await repo.updateReleaseStatus(context, release.id, 'suspended');
    expect(suspended.status).toBe('suspended');

    const deprecated = await repo.updateReleaseStatus(context, release.id, 'deprecated');
    expect(deprecated.status).toBe('deprecated');
    expect(deprecated.version).toBe(release.version);
  });

  it('存在しない id では EntityNotFoundError になる', async () => {
    await expect(repo.updateReleaseStatus(context, 'missing-id', 'suspended')).rejects.toThrow(EntityNotFoundError);
    await expect(repo.updateReleaseStatus(context, 'missing-id', 'suspended')).rejects.toThrow(
      /releases が見つかりません/,
    );
  });

  it('他テナントの release は更新できない', async () => {
    const { projectId, channelId } = await newChannel();
    const { release } = await repo.createRelease(context, {
      projectId,
      channelId,
      packageHash: 'hash-cross',
      manifestJson: '{}',
      createdBy: userId,
    });

    const other = await createTenantsRepo(asCore(adapter)).create({ slug: 'rel-other', name: 'Other', plan: 'free' });
    const otherContext = createRepositoryContext({ tenantId: other.id });

    await expect(repo.updateReleaseStatus(otherContext, release.id, 'suspended')).rejects.toThrow(EntityNotFoundError);
    expect(await repo.findById(otherContext, release.id)).toBeNull();
  });
});
