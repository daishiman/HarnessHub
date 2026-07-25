// 2 テナント完全 fixture (DMDB-T03/T06/T12 / security-spec §8.4)。
// tenant A / B の双方で 18 テーブル全てに行を作る。seed は必ずリポジトリ層経由で行い、
// 「全エンティティの CRUD が接続層越しに動作する」ことを fixture 構築自体が検証する。
// 新テーブル追加時にこの fixture が未追随なら tenant-isolation.test.ts が fail する (スキーマ駆動)。

import { createAuditRepo } from '../../repository/audit';
import { sha256Hex } from '../../repository/bytes';
import { createTargetChannelsRepo } from '../../repository/channels';
import { createScopedCrud } from '../../repository/crud';
import type { ColumnCipher } from '../../repository/crypto';
import type { CoreAdapter } from '../../repository/db';
import { createIdpConnectionsRepo } from '../../repository/idp';
import { createIdempotencyLedgerRepo, createSessionRevocationsRepo } from '../../repository/misc';
import { createPackagesRepo } from '../../repository/packages';
import { createReleasesRepo } from '../../repository/releases';
import { createTenantsRepo } from '../../repository/tenants';
import { createUsersRepo } from '../../repository/users';
import { catalogEntries, deploymentReferences, projects } from '../../schema/core/catalog';
import { userSettings, workspaces } from '../../schema/core/identity';
import { deviceAuthorizations, publisherTokens, publishRequests } from '../../schema/core/publish';
import { createRepositoryContext } from '../../src/context';
import type { RepositoryContext } from '../../src/types';

export interface TenantFixture {
  readonly context: RepositoryContext;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly releaseId: string;
  readonly salary: number;
}

export interface TwoTenantsFixture {
  readonly a: TenantFixture;
  readonly b: TenantFixture;
}

async function seedTenant(
  adapter: CoreAdapter,
  cipher: ColumnCipher,
  slug: string,
  salary: number,
): Promise<TenantFixture> {
  const tenants = createTenantsRepo(adapter);
  const tenant = await tenants.create({ slug, name: `Tenant ${slug}`, plan: 'free' });
  const context = createRepositoryContext({ tenantId: tenant.id });

  const idp = createIdpConnectionsRepo(adapter, cipher);
  await idp.insert(context, {
    issuerUrl: `https://idp.${slug}.example.com`,
    clientId: `client-${slug}`,
    clientSecret: `super-secret-${slug}`,
    scopes: 'openid email profile',
  });

  const workspacesRepo = createScopedCrud(adapter, workspaces);
  const workspace = await workspacesRepo.insert(context, { slug: `ws-${slug}`, name: `WS ${slug}` });
  const workspaceId = workspace.id as string;

  const users = createUsersRepo(adapter, cipher);
  const user = await users.insert(context, {
    idpSubject: `subject-${slug}`,
    email: `admin@${slug}.example.com`,
    name: `Admin ${slug}`,
    department: 'engineering',
    salary,
    role: 'workspace-admin',
    status: 'active',
  });

  await adapter.client.insert(userSettings).values({ userId: user.id });

  const projectsRepo = createScopedCrud(adapter, projects);
  const project = await projectsRepo.insert(context, {
    workspaceId,
    slug: `proj-${slug}`,
    name: `Project ${slug}`,
    description: null,
    ownerUserId: user.id,
    status: 'active',
  });
  const projectId = project.id as string;

  const channels = createTargetChannelsRepo(adapter);
  const channel = await channels.create(context, { projectId, target: 'skill' });

  const packageBytes = new TextEncoder().encode(`package-body-${slug}`);
  const contentHash = await sha256Hex(packageBytes);
  const packagesRepo = createPackagesRepo(adapter);
  await packagesRepo.record({
    contentHash,
    r2Key: `packages/${contentHash}`,
    sizeBytes: packageBytes.length,
    kind: 'skills-package',
  });

  const releasesRepo = createReleasesRepo(adapter);
  const { release } = await releasesRepo.createRelease(context, {
    projectId,
    channelId: channel.id,
    packageHash: contentHash,
    manifestJson: '{"name":"fixture"}',
    createdBy: user.id,
  });
  await channels.setStableRelease(context, channel.id, release.id);

  const deployRepo = createScopedCrud(adapter, deploymentReferences);
  await deployRepo.insert(context, {
    projectId,
    channelId: channel.id,
    releaseId: release.id,
    url: `https://${slug}.example.workers.dev`,
    provider: 'cloudflare',
    orphanCandidate: false,
    registeredBy: user.id,
    lastHealthAt: null,
  });

  const catalogRepo = createScopedCrud(adapter, catalogEntries);
  await catalogRepo.insert(context, {
    workspaceId,
    projectId,
    visibility: 'workspace',
    summary: `catalog ${slug}`,
    tagsJson: '["fixture"]',
    dlCount: 0,
    publishedAt: null,
  });

  const publishRepo = createScopedCrud(adapter, publishRequests);
  await publishRepo.insert(context, {
    workspaceId,
    projectId,
    channelId: channel.id,
    status: 'published',
    verdict: 'green',
    findingsJson: null,
    releaseId: release.id,
    requestedBy: user.id,
    idempotencyKey: `pub-${slug}-1`,
  });

  const tokensRepo = createScopedCrud(adapter, publisherTokens);
  await tokensRepo.insert(context, {
    userId: user.id,
    deviceName: `dev-machine-${slug}`,
    refreshTokenHash: await sha256Hex(`refresh-${slug}`),
    scopesJson: '["publish:write"]',
    familyId: `family-${slug}`,
    lastUsedAt: null,
    expiresAt: Date.now() + 90 * 24 * 3600 * 1000,
    revokedAt: null,
  });

  const deviceRepo = createScopedCrud(adapter, deviceAuthorizations);
  await deviceRepo.insert(context, {
    deviceCodeHash: await sha256Hex(`device-${slug}`),
    userCode: `USER-${slug.toUpperCase()}`,
    userId: user.id,
    status: 'approved',
    intervalSec: 5,
    expiresAt: Date.now() + 600_000,
  });

  const audit = createAuditRepo(adapter);
  await audit.append(context, {
    workspaceId,
    actorType: 'user',
    actorId: user.id,
    action: 'release.publish',
    entityType: 'release',
    entityId: release.id,
    summary: { channel: channel.id, version: release.version },
  });
  await audit.append(context, {
    workspaceId,
    actorType: 'user',
    actorId: user.id,
    action: 'user.salary_change',
    entityType: 'user',
    entityId: user.id,
    summary: { field: 'salary', changed: true },
  });

  const revocations = createSessionRevocationsRepo(adapter);
  await revocations.revokeAll(context);

  const ledger = createIdempotencyLedgerRepo(adapter);
  await ledger.put(context, {
    scope: 'publish',
    key: `pub-${slug}-1`,
    requestHash: await sha256Hex(`req-${slug}`),
    responseStatus: 201,
    responseBodyJson: null,
    expiresAt: Date.now() + 24 * 3600 * 1000,
  });

  return {
    context,
    tenantId: tenant.id,
    workspaceId,
    userId: user.id,
    projectId,
    channelId: channel.id,
    releaseId: release.id,
    salary,
  };
}

/** tenant A / B を同一 DB へ seed する。encryption_keys は cipher が自動発行する (共有 2 行)。 */
export async function seedTwoTenants(adapter: CoreAdapter, cipher: ColumnCipher): Promise<TwoTenantsFixture> {
  const a = await seedTenant(adapter, cipher, 'alpha', 8_000_000);
  const b = await seedTenant(adapter, cipher, 'beta', 6_500_000);
  return { a, b };
}
