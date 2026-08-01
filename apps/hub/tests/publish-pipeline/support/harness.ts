/**
 * publish pipeline のテスト土台。
 *
 * port の実体を in-memory で用意する。狙いは「DB を持たずに業務手順を確かめる」ことではなく、
 * **DB が持っている制約を明示的に再現する**こと。特に partial UNIQUE index の述語
 * (`status NOT IN ('published','failed','draft')`) はここへ**直接**書いてある。
 * アプリ側の `TERMINAL_STATES` を import して使うと、両者がずれたときに
 * 偽物も一緒にずれて、テストがずれを検出できなくなる。
 */

import type { PublishRequestState, PublishTarget, ReleaseStatus } from '@harness-hub/schemas';
import { EMPTY_PUBLISH_PAYLOAD } from '@/lib/publish/payload';
import type {
  ChannelRecord,
  DeploymentRecord,
  PublishPorts,
  PublishProjectAccess,
  PublishRequestRecord,
  PublishScope,
  ReleaseRecord,
  StoredPackage,
} from '@/lib/publish/ports';
import type { PublishServiceDeps } from '@/lib/publish/service';
import {
  type AuditLogger,
  createAuditLogger,
  createInMemoryAuditSink,
  type RecordedAuditEvent,
} from '@/shared/audit/index';

/**
 * `packages/db/schema/core/publish.ts` の partial UNIQUE index 述語の写し。
 * **アプリ側の定数を import しない** (上の注記のとおり、偽物が本物へ追従すると検出力が消える)。
 */
const DB_INDEX_EXCLUDED_STATUSES: readonly string[] = ['published', 'failed', 'draft'];

function occupiesChannelInDb(status: PublishRequestState): boolean {
  return !DB_INDEX_EXCLUDED_STATUSES.includes(status);
}

/** repository が投げるものと同じ形の例外。`name` で識別される契約を再現する。 */
export function channelBusyError(channelId: string): Error {
  const error = new Error(`channel ${channelId} には未完了の publish request が既に存在します`);
  error.name = 'ChannelBusyError';
  return error;
}

export interface PublishHarness {
  readonly deps: PublishServiceDeps;
  readonly ports: PublishPorts;
  readonly audit: AuditLogger;
  readonly scope: PublishScope;
  /** 別テナントからの読み書きを試すための scope。テナント分離の確認に使う。 */
  readonly otherTenantScope: PublishScope;
  readonly auditEvents: () => readonly RecordedAuditEvent[];
  readonly projectRows: () => readonly PublishProjectAccess[];
  readonly requestRows: () => readonly PublishRequestRecord[];
  readonly channelRows: () => readonly ChannelRecord[];
  readonly releaseRows: () => readonly ReleaseRecord[];
  readonly deploymentRows: () => readonly DeploymentRecord[];
  readonly storedPackages: () => readonly StoredPackage[];
  /** 経路を通さず状態を置く。中間状態から始めるテストのため。 */
  readonly putProject: (patch: Partial<PublishProjectAccess> & { readonly id: string }) => PublishProjectAccess;
  readonly putRequest: (patch: Partial<PublishRequestRecord> & { readonly id: string }) => PublishRequestRecord;
  readonly putChannel: (patch: Partial<ChannelRecord> & { readonly id: string }) => ChannelRecord;
  readonly putRelease: (patch: Partial<ReleaseRecord> & { readonly id: string }) => ReleaseRecord;
  readonly setNow: (epochMs: number) => void;
  /** 次の `releases.create` を失敗させる。公開途中の失敗を再現するため。 */
  readonly failNextReleaseCreate: (error: Error) => void;
  /** `transition` の呼び出し記録。CAS の from/to を検証するため。 */
  readonly transitionLog: () => readonly { readonly id: string; readonly from: string; readonly to: string }[];
}

export interface HarnessOptions {
  readonly tenantId?: string;
  readonly workspaceId?: string | undefined;
  readonly actorId?: string;
  readonly nowMs?: number;
}

/** 2026-01-01T00:00:00Z。実時刻に依存させないための固定値。 */
export const FIXED_NOW_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

export function createPublishHarness(options: HarnessOptions = {}): PublishHarness {
  const tenantId = options.tenantId ?? 'tenant-a';
  const scope: PublishScope = {
    tenantId,
    workspaceId: 'workspaceId' in options ? options.workspaceId : 'ws-1',
    actorId: options.actorId ?? 'user-1',
  };

  let now = options.nowMs ?? FIXED_NOW_MS;
  let sequence = 0;
  const nextId = (prefix: string): string => {
    sequence += 1;
    // ULID の代わりに 0 埋め連番。辞書順 = 生成順になるので cursor の性質を保てる
    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  };

  const projects: PublishProjectAccess[] = [];
  const requests: PublishRequestRecord[] = [];
  const channels: ChannelRecord[] = [];
  const releases: ReleaseRecord[] = [];
  const deployments: DeploymentRecord[] = [];
  const packages = new Map<string, StoredPackage>();
  const packageBytes = new Map<string, Uint8Array>();
  const ledger = new Map<
    string,
    { requestHash: string; responseStatus: number; responseBodyJson: string | null; expiresAt: number }
  >();
  const transitions: { id: string; from: string; to: string }[] = [];
  let releaseCreateFailure: Error | null = null;

  const sink = createInMemoryAuditSink();
  const audit = createAuditLogger({ sink });

  async function sha256Hex(bytes: Uint8Array): Promise<string> {
    const owned = new Uint8Array(bytes.byteLength);
    owned.set(bytes);
    const digest = await crypto.subtle.digest('SHA-256', owned);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  const ports: PublishPorts = {
    projects: {
      async findById(portScope, id) {
        return projects.find((row) => row.tenantId === portScope.tenantId && row.id === id) ?? null;
      },
    },

    requests: {
      async create(portScope, input) {
        const record: PublishRequestRecord = {
          id: nextId('req'),
          tenantId: portScope.tenantId,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          channelId: input.channelId,
          status: 'draft',
          verdict: null,
          payload: EMPTY_PUBLISH_PAYLOAD,
          releaseId: null,
          requestedBy: input.requestedBy,
          createdAt: now,
        };
        requests.push(record);
        return record;
      },

      async findById(portScope, id) {
        return requests.find((row) => row.tenantId === portScope.tenantId && row.id === id) ?? null;
      },

      async list(portScope, filter) {
        return requests
          .filter((row) => row.tenantId === portScope.tenantId)
          .filter((row) => filter.projectId === undefined || row.projectId === filter.projectId)
          .filter((row) => filter.channelId === undefined || row.channelId === filter.channelId)
          .filter((row) => filter.status === undefined || row.status === filter.status)
          .filter((row) => filter.cursor === undefined || row.id < filter.cursor)
          .sort((left, right) => (left.id < right.id ? 1 : -1))
          .slice(0, filter.limit);
      },

      async findActiveByChannel(portScope, channelId) {
        return (
          requests.find(
            (row) =>
              row.tenantId === portScope.tenantId && row.channelId === channelId && occupiesChannelInDb(row.status),
          ) ?? null
        );
      },

      async transition(portScope, id, input) {
        const index = requests.findIndex(
          (row) => row.tenantId === portScope.tenantId && row.id === id && row.status === input.from,
        );
        // CAS 不成立。例外ではなく null (競合は異常ではないため)
        if (index < 0) return null;

        const current = requests[index] as PublishRequestRecord;
        // partial UNIQUE index の再現。占有状態へ入るときだけ衝突しうる
        if (occupiesChannelInDb(input.to)) {
          const conflict = requests.some(
            (row) =>
              row.id !== id &&
              row.tenantId === current.tenantId &&
              row.channelId === current.channelId &&
              occupiesChannelInDb(row.status),
          );
          if (conflict) throw channelBusyError(current.channelId);
        }

        const updated: PublishRequestRecord = {
          ...current,
          status: input.to,
          verdict: input.verdict === undefined ? current.verdict : input.verdict,
          payload: input.payload === undefined ? current.payload : input.payload,
          releaseId: input.releaseId === undefined ? current.releaseId : input.releaseId,
        };
        requests[index] = updated;
        transitions.push({ id, from: input.from, to: input.to });
        return updated;
      },
    },

    channels: {
      async findById(portScope, id) {
        return channels.find((row) => row.tenantId === portScope.tenantId && row.id === id) ?? null;
      },

      async findByProjectTarget(portScope, projectId, target) {
        return (
          channels.find(
            (row) => row.tenantId === portScope.tenantId && row.projectId === projectId && row.target === target,
          ) ?? null
        );
      },

      async ensureForProjectTarget(portScope, projectId, target) {
        const existing = channels.find(
          (row) => row.tenantId === portScope.tenantId && row.projectId === projectId && row.target === target,
        );
        if (existing !== undefined) return existing;
        const record: ChannelRecord = {
          id: nextId('ch'),
          tenantId: portScope.tenantId,
          projectId,
          target,
          stableReleaseId: null,
          createdAt: now,
        };
        channels.push(record);
        return record;
      },

      async setStableRelease(portScope, channelId, releaseId) {
        const index = channels.findIndex((row) => row.tenantId === portScope.tenantId && row.id === channelId);
        if (index < 0) throw new Error(`channel ${channelId} が見つかりません`);
        const updated: ChannelRecord = { ...(channels[index] as ChannelRecord), stableReleaseId: releaseId };
        channels[index] = updated;
        return updated;
      },
    },

    releases: {
      async create(portScope, input) {
        if (releaseCreateFailure !== null) {
          const error = releaseCreateFailure;
          releaseCreateFailure = null;
          throw error;
        }
        const siblings = releases.filter(
          (row) => row.tenantId === portScope.tenantId && row.channelId === input.channelId,
        );
        const last = siblings[siblings.length - 1];
        // 同一 content の再公開は採番しない (immutable Release の重複生成を避ける)
        if (last !== undefined && last.packageHash === input.packageHash) return { release: last, created: false };

        const record: ReleaseRecord = {
          id: nextId('rel'),
          tenantId: portScope.tenantId,
          projectId: input.projectId,
          channelId: input.channelId,
          version: `v${siblings.length + 1}`,
          packageHash: input.packageHash,
          manifestJson: input.manifestJson,
          status: 'available',
          createdBy: input.createdBy,
          createdAt: now,
        };
        releases.push(record);
        return { release: record, created: true };
      },

      async findById(portScope, id) {
        return releases.find((row) => row.tenantId === portScope.tenantId && row.id === id) ?? null;
      },

      async listByChannel(portScope, channelId) {
        return releases.filter((row) => row.tenantId === portScope.tenantId && row.channelId === channelId);
      },

      async listByProject(portScope, projectId) {
        return releases.filter((row) => row.tenantId === portScope.tenantId && row.projectId === projectId);
      },

      async updateStatus(portScope, id, status: ReleaseStatus) {
        const index = releases.findIndex((row) => row.tenantId === portScope.tenantId && row.id === id);
        if (index < 0) throw new Error(`release ${id} が見つかりません`);
        const updated: ReleaseRecord = { ...(releases[index] as ReleaseRecord), status };
        releases[index] = updated;
        return updated;
      },
    },

    packages: {
      async store(bytes) {
        const contentHash = await sha256Hex(bytes);
        const record: StoredPackage = { contentHash, sizeBytes: bytes.byteLength };
        packages.set(contentHash, record);
        packageBytes.set(contentHash, new Uint8Array(bytes));
        return record;
      },

      async findByHash(contentHash) {
        return packages.get(contentHash) ?? null;
      },

      async load(contentHash) {
        const bytes = packageBytes.get(contentHash);
        return bytes === undefined ? null : new Uint8Array(bytes);
      },
    },

    idempotency: {
      async get(portScope, ledgerScope, key) {
        return ledger.get(`${portScope.tenantId} ${ledgerScope} ${key}`) ?? null;
      },
      async put(portScope, ledgerScope, key, entry) {
        const composite = `${portScope.tenantId} ${ledgerScope} ${key}`;
        // 実装は onConflictDoNothing。先着を残す
        if (!ledger.has(composite)) ledger.set(composite, { ...entry });
      },
    },

    deployments: {
      async register(portScope, input) {
        const record: DeploymentRecord = {
          id: nextId('dep'),
          tenantId: portScope.tenantId,
          projectId: input.projectId,
          channelId: input.channelId,
          releaseId: input.releaseId,
          url: input.url,
          provider: input.provider,
          orphanCandidate: input.orphanCandidate,
          registeredBy: input.registeredBy,
          createdAt: now,
        };
        deployments.push(record);
        return record;
      },
    },

    clock: {
      nowMs: () => now,
    },
  };

  function putProject(patch: Partial<PublishProjectAccess> & { readonly id: string }): PublishProjectAccess {
    const base: PublishProjectAccess = {
      id: patch.id,
      tenantId,
      workspaceId: scope.workspaceId ?? 'ws-1',
      ownerUserId: scope.actorId,
    };
    const record: PublishProjectAccess = { ...base, ...patch };
    const index = projects.findIndex((row) => row.id === record.id);
    if (index < 0) projects.push(record);
    else projects[index] = record;
    return record;
  }

  function putRequest(patch: Partial<PublishRequestRecord> & { readonly id: string }): PublishRequestRecord {
    const base: PublishRequestRecord = {
      id: patch.id,
      tenantId: tenantId,
      workspaceId: scope.workspaceId ?? 'ws-1',
      projectId: 'proj-1',
      channelId: 'ch-0001',
      status: 'draft',
      verdict: null,
      payload: EMPTY_PUBLISH_PAYLOAD,
      releaseId: null,
      requestedBy: scope.actorId,
      createdAt: now,
    };
    const record: PublishRequestRecord = { ...base, ...patch };
    const index = requests.findIndex((row) => row.id === record.id);
    if (index < 0) requests.push(record);
    else requests[index] = record;
    return record;
  }

  function putChannel(patch: Partial<ChannelRecord> & { readonly id: string }): ChannelRecord {
    const base: ChannelRecord = {
      id: patch.id,
      tenantId,
      projectId: 'proj-1',
      target: 'skill' as PublishTarget,
      stableReleaseId: null,
      createdAt: now,
    };
    const record: ChannelRecord = { ...base, ...patch };
    const index = channels.findIndex((row) => row.id === record.id);
    if (index < 0) channels.push(record);
    else channels[index] = record;
    return record;
  }

  function putRelease(patch: Partial<ReleaseRecord> & { readonly id: string }): ReleaseRecord {
    const base: ReleaseRecord = {
      id: patch.id,
      tenantId,
      projectId: 'proj-1',
      channelId: 'ch-0001',
      version: 'v1',
      packageHash: 'hash-1',
      manifestJson: '{"v":1}',
      status: 'available',
      createdBy: scope.actorId,
      createdAt: now,
    };
    const record: ReleaseRecord = { ...base, ...patch };
    const index = releases.findIndex((row) => row.id === record.id);
    if (index < 0) releases.push(record);
    else releases[index] = record;
    return record;
  }

  return {
    deps: { ports, audit },
    ports,
    audit,
    scope,
    otherTenantScope: { tenantId: 'tenant-b', workspaceId: 'ws-9', actorId: 'user-9' },
    auditEvents: () => sink.events(),
    projectRows: () => [...projects],
    requestRows: () => [...requests],
    channelRows: () => [...channels],
    releaseRows: () => [...releases],
    deploymentRows: () => [...deployments],
    storedPackages: () => [...packages.values()],
    putProject,
    putRequest,
    putChannel,
    putRelease,
    setNow: (epochMs) => {
      now = epochMs;
    },
    failNextReleaseCreate: (error) => {
      releaseCreateFailure = error;
    },
    transitionLog: () => [...transitions],
  };
}
