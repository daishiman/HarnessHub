/**
 * `ports.ts` が宣言した形へ `packages/db` の repository を合わせる adapter。
 *
 * **列名 → 業務語彙の読み替えはここだけで行う**。service や route が行の形を直接見ると、
 * 列の追加・改名が API 応答まで一直線に波及する。
 *
 * drizzle をこの層で直接触らないのは qa-020 (DB アクセスは repository 層に閉じる) のため。
 * ここが知ってよいのは `CoreRepositories` の関数だけで、テーブル定義は知らない。
 */

import {
  type CoreRepositories,
  createRepositoryContext,
  type PackageRegistry,
  type RepositoryContext,
} from '@harness-hub/db';
import { type PublishTarget, publishTargetSchema } from '@harness-hub/schemas';

import { decodePublishPayload, encodePublishPayload } from './payload.js';
import type {
  ChannelPort,
  DeploymentPort,
  DeploymentRecord,
  IdempotencyPort,
  PackagePort,
  ProjectAccessPort,
  PublishPorts,
  PublishRequestPort,
  PublishRequestRecord,
  PublishScope,
  ReleasePort,
} from './ports.js';

/** publish 系の R2 オブジェクト種別。`packages.kind` の値域は現状これ 1 つ。 */
const PACKAGE_KIND = 'skills-package' as const;

/**
 * `PublishScope` → `RepositoryContext`。
 *
 * `actorId` を必ず載せる。載せないと監査行の actor が 'system' に落ち、
 * 「誰が公開したか」が追えなくなる (`auditEventFromContext` の既定挙動)。
 */
function contextOf(scope: PublishScope): RepositoryContext {
  return createRepositoryContext({
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    actorId: scope.actorId,
  });
}

function toPublishRequestRecord(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  projectId: string;
  channelId: string;
  status: PublishRequestRecord['status'];
  verdict: PublishRequestRecord['verdict'];
  findingsJson: string | null;
  releaseId: string | null;
  requestedBy: string;
  createdAt: number;
}): PublishRequestRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    channelId: row.channelId,
    status: row.status,
    verdict: row.verdict,
    payload: decodePublishPayload(row.findingsJson),
    releaseId: row.releaseId,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt,
  };
}

function createRequestPort(repositories: CoreRepositories): PublishRequestPort {
  return {
    async create(scope, input) {
      const row = await repositories.publishRequests.create(contextOf(scope), {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        channelId: input.channelId,
        requestedBy: input.requestedBy,
        idempotencyKey: input.idempotencyKey ?? null,
      });
      return toPublishRequestRecord(row);
    },

    async findById(scope, id) {
      const row = await repositories.publishRequests.findById(contextOf(scope), id);
      return row === null ? null : toPublishRequestRecord(row);
    },

    async list(scope, filter) {
      const rows = await repositories.publishRequests.list(contextOf(scope), {
        ...(filter.projectId === undefined ? {} : { projectId: filter.projectId }),
        ...(filter.channelId === undefined ? {} : { channelId: filter.channelId }),
        ...(filter.status === undefined ? {} : { status: filter.status }),
        ...(filter.cursor === undefined ? {} : { cursor: filter.cursor }),
        limit: filter.limit,
      });
      return rows.map(toPublishRequestRecord);
    },

    async findActiveByChannel(scope, channelId) {
      const row = await repositories.publishRequests.findActiveByChannel(contextOf(scope), channelId);
      return row === null ? null : toPublishRequestRecord(row);
    },

    async transition(scope, id, input) {
      const row = await repositories.publishRequests.transitionStatus(contextOf(scope), id, {
        from: input.from,
        to: input.to,
        // undefined は「触らない」。null は「明示的に消す」。両者を潰さない
        ...(input.verdict === undefined ? {} : { verdict: input.verdict }),
        ...(input.payload === undefined ? {} : { findingsJson: encodePublishPayload(input.payload) }),
        ...(input.releaseId === undefined ? {} : { releaseId: input.releaseId }),
      });
      return row === null ? null : toPublishRequestRecord(row);
    },
  };
}

function createProjectAccessPort(repositories: CoreRepositories): ProjectAccessPort {
  return {
    async findById(scope, id) {
      const row = await repositories.projects.findById(contextOf(scope), id);
      if (row === null) return null;
      return {
        id: row.id as string,
        tenantId: row.tenantId as string,
        workspaceId: row.workspaceId as string,
        ownerUserId: row.ownerUserId as string,
      };
    },

    async create(scope, input) {
      if (scope.workspaceId === undefined) {
        throw new Error('Project の作成には Workspace scope が必要です');
      }
      const row = await repositories.projects.insert(contextOf(scope), {
        workspaceId: scope.workspaceId,
        // slug は server が発行し、利用者入力を識別子へ流さない。
        slug: `project-${crypto.randomUUID()}`,
        name: input.name,
        description: input.description,
        ownerUserId: scope.actorId,
        status: 'active',
      });
      return {
        id: row.id as string,
        tenantId: row.tenantId as string,
        workspaceId: row.workspaceId as string,
        ownerUserId: row.ownerUserId as string,
        name: row.name as string,
        description: (row.description as string | null) ?? '',
      };
    },
  };
}

function createChannelPort(repositories: CoreRepositories): ChannelPort {
  const port: ChannelPort = {
    async findById(scope, id) {
      return repositories.channels.findById(contextOf(scope), id);
    },

    async findByProjectTarget(scope, projectId, target) {
      return repositories.channels.findByProjectTarget(contextOf(scope), projectId, target);
    },

    async ensureForProjectTarget(scope, projectId, target) {
      const existing = await port.findByProjectTarget(scope, projectId, target);
      if (existing !== null) return existing;
      try {
        return await repositories.channels.create(contextOf(scope), { projectId, target });
      } catch (error) {
        // 並行作成の敗者。UNIQUE(project_id, target) が 1 本に収束させているので、
        // 勝者の行を読み直せば結果は同じになる。ここで 500 にすると
        // 「同じ project へ 2 人が同時に初回公開した」だけで片方が失敗する
        const raced = await port.findByProjectTarget(scope, projectId, target);
        if (raced !== null) return raced;
        throw error;
      }
    },

    async setStableRelease(scope, channelId, releaseId) {
      return repositories.channels.setStableRelease(contextOf(scope), channelId, releaseId);
    },
  };
  return port;
}

function createReleasePort(repositories: CoreRepositories): ReleasePort {
  return {
    async create(scope, input) {
      return repositories.releases.createRelease(contextOf(scope), input);
    },

    async findById(scope, id) {
      return repositories.releases.findById(contextOf(scope), id);
    },

    async listByChannel(scope, channelId) {
      return repositories.releases.listByChannel(contextOf(scope), channelId);
    },

    async listByProject(scope, projectId) {
      // project 直下の release を引く専用関数を repository へ足さず、channel 経由で集める。
      // target の値域は zod が正本なので、ここに 'skill' / 'web_app' を書かない
      // (値域が増えたときに黙って取りこぼす経路を作らない)。
      const context = contextOf(scope);
      const targets: readonly PublishTarget[] = publishTargetSchema.options;
      const perTarget = await Promise.all(
        targets.map(async (target) => {
          const channel = await repositories.channels.findByProjectTarget(context, projectId, target);
          return channel === null ? [] : repositories.releases.listByChannel(context, channel.id);
        }),
      );
      // ULID は時系列単調なので id 降順 = 作成順の新しい順。channel を跨いでも順序が保てる
      return perTarget.flat().sort((left, right) => (left.id < right.id ? 1 : -1));
    },

    async updateStatus(scope, id, status) {
      return repositories.releases.updateReleaseStatus(contextOf(scope), id, status);
    },
  };
}

function createPackagePort(repositories: CoreRepositories, registry: PackageRegistry): PackagePort {
  return {
    async store(bytes) {
      // R2 へ載せてから表へ登録する。順序を逆にすると、表にあるが実体が無い参照が生まれる。
      // 逆順 (R2 先) なら最悪でも「実体はあるが未参照」に留まり、次回の同一 hash で解消される
      const stored = await registry.putPackage(bytes);
      await repositories.packages.record({
        contentHash: stored.contentHash,
        r2Key: stored.r2Key,
        sizeBytes: stored.sizeBytes,
        kind: PACKAGE_KIND,
      });
      return { contentHash: stored.contentHash, sizeBytes: stored.sizeBytes };
    },

    async findByHash(contentHash) {
      const row = await repositories.packages.findByHash(contentHash);
      return row === null ? null : { contentHash: row.contentHash, sizeBytes: row.sizeBytes };
    },

    async load(contentHash) {
      const stream = await registry.getPackage(contentHash);
      if (stream === null) return null;
      return new Uint8Array(await new Response(stream).arrayBuffer());
    },
  };
}

function createIdempotencyPort(repositories: CoreRepositories): IdempotencyPort {
  return {
    async get(scope, ledgerScope, key) {
      const row = await repositories.idempotency.get(contextOf(scope), ledgerScope, key);
      return row === null
        ? null
        : {
            requestHash: row.requestHash,
            responseStatus: row.responseStatus,
            responseBodyJson: row.responseBodyJson,
            expiresAt: row.expiresAt,
          };
    },

    async put(scope, ledgerScope, key, entry) {
      await repositories.idempotency.put(contextOf(scope), {
        scope: ledgerScope,
        key,
        requestHash: entry.requestHash,
        responseStatus: entry.responseStatus,
        responseBodyJson: entry.responseBodyJson,
        expiresAt: entry.expiresAt,
      });
    },
  };
}

function createDeploymentPort(repositories: CoreRepositories): DeploymentPort {
  const requiredString = (row: Record<string, unknown>, field: string): string => {
    const value = row[field];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`deployment_references.${field} が文字列ではありません`);
    }
    return value;
  };
  const requiredBoolean = (row: Record<string, unknown>, field: string): boolean => {
    const value = row[field];
    if (typeof value !== 'boolean') {
      throw new Error(`deployment_references.${field} が boolean ではありません`);
    }
    return value;
  };
  const requiredNumber = (row: Record<string, unknown>, field: string): number => {
    const value = row[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`deployment_references.${field} が有限数ではありません`);
    }
    return value;
  };
  const requiredProvider = (row: Record<string, unknown>, field: string): DeploymentRecord['provider'] => {
    const value = requiredString(row, field);
    if (value !== 'cloudflare') {
      throw new Error(`deployment_references.${field} が対応済み provider ではありません`);
    }
    return value;
  };

  return {
    async register(scope, input) {
      const row = await repositories.deploymentReferences.insert(contextOf(scope), {
        projectId: input.projectId,
        channelId: input.channelId,
        releaseId: input.releaseId,
        url: input.url,
        provider: input.provider,
        orphanCandidate: input.orphanCandidate,
        registeredBy: input.registeredBy,
      });
      return {
        id: requiredString(row, 'id'),
        tenantId: requiredString(row, 'tenantId'),
        projectId: requiredString(row, 'projectId'),
        channelId: requiredString(row, 'channelId'),
        releaseId: requiredString(row, 'releaseId'),
        url: requiredString(row, 'url'),
        provider: requiredProvider(row, 'provider'),
        orphanCandidate: requiredBoolean(row, 'orphanCandidate'),
        registeredBy: requiredString(row, 'registeredBy'),
        createdAt: requiredNumber(row, 'createdAt'),
      } satisfies DeploymentRecord;
    },
  };
}

export interface DbPublishPortsInput {
  readonly repositories: CoreRepositories;
  readonly registry: PackageRegistry;
  /** 時刻の注入点。省略時はサーバ時計 (epoch ms)。 */
  readonly nowMs?: () => number;
}

export function createDbPublishPorts(input: DbPublishPortsInput): PublishPorts {
  const nowMs = input.nowMs ?? (() => Date.now());
  return {
    projects: createProjectAccessPort(input.repositories),
    requests: createRequestPort(input.repositories),
    channels: createChannelPort(input.repositories),
    releases: createReleasePort(input.repositories),
    packages: createPackagePort(input.repositories, input.registry),
    idempotency: createIdempotencyPort(input.repositories),
    deployments: createDeploymentPort(input.repositories),
    clock: { nowMs },
  };
}
