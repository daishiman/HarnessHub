/**
 * tenant-data route のテスト土台。
 *
 * publish-pipeline の harness.ts と同じ方針: port (ここでは `TenantDataRepo`) を in-memory で
 * 差し替え、認可判定 (`withAuthz` / `decide`) は本物を通す。
 *
 * `packages/db/repository/tenant-data.ts` の暗号化・R2 registry・ULID 採番は実装詳細であり
 * route 層の契約テストには不要なので、ここでは `TenantDataRepo` インターフェースだけを
 * 平文のまま in-memory 実装する (`getContent` も暗号化を経由しない)。
 */

import {
  EntityNotFoundError,
  type RepositoryContext,
  type TenantDataListInput,
  type TenantDataObjectPage,
  type TenantDataObjectRow,
  type TenantDataRepo,
  type TenantDataUploadInput,
} from '@harness-hub/db';
import type { TenantDataRuntime } from '@/lib/tenant-data/runtime';
import { createAuditLogger, createInMemoryAuditSink, type RecordedAuditEvent } from '@/shared/audit/index';

/** 2026-01-01T00:00:00Z。固定値で作成順を安定させる。 */
export const FIXED_NOW_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

export interface TenantDataHarness {
  readonly runtime: TenantDataRuntime;
  readonly repo: TenantDataRepo;
  readonly auditEvents: () => readonly RecordedAuditEvent[];
  readonly rows: () => readonly TenantDataObjectRow[];
  /** 経路を通さず行を置く。存在前提のテストのため。 */
  readonly putRow: (row: TenantDataObjectRow) => void;
}

export function createTenantDataHarness(): TenantDataHarness {
  const rows: TenantDataObjectRow[] = [];
  const contents = new Map<string, Uint8Array>();
  let sequence = 0;
  const nextId = (): string => {
    sequence += 1;
    // ULID の代わりに 0 埋め連番。辞書順 = 生成順を保つ (list の cursor 検証に必要)。
    return `obj-${String(sequence).padStart(4, '0')}`;
  };

  async function sha256Hex(bytes: Uint8Array): Promise<string> {
    const owned = new Uint8Array(bytes.byteLength);
    owned.set(bytes);
    const digest = await crypto.subtle.digest('SHA-256', owned);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  const repo: TenantDataRepo = {
    async upload(context: RepositoryContext, input: TenantDataUploadInput) {
      const id = nextId();
      const row: TenantDataObjectRow = {
        id,
        tenantId: context.tenantId,
        workspaceId: input.workspaceId,
        kind: input.kind,
        title: input.title,
        r2Key: `tenant/${context.tenantId}/${input.workspaceId}/${input.kind}/${id}`,
        sizeBytes: input.plaintext.byteLength,
        contentHash: await sha256Hex(input.plaintext),
        encKeyVersion: 1,
        uploadedBy: input.uploadedBy,
        createdAt: FIXED_NOW_MS,
      };
      rows.push(row);
      contents.set(id, input.plaintext);
      return row;
    },

    async findById(context: RepositoryContext, objectId: string) {
      return rows.find((row) => row.tenantId === context.tenantId && row.id === objectId) ?? null;
    },

    async list(context: RepositoryContext, input: TenantDataListInput): Promise<TenantDataObjectPage> {
      const filtered = rows
        .filter((row) => row.tenantId === context.tenantId && row.workspaceId === input.workspaceId)
        .filter((row) => input.kind === undefined || row.kind === input.kind)
        .filter((row) => input.cursor === undefined || row.id < input.cursor)
        .sort((left, right) => (left.id < right.id ? 1 : -1));
      const hasNext = filtered.length > input.limit;
      const items = filtered.slice(0, input.limit);
      return { items, nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null };
    },

    async getContent(context: RepositoryContext, objectId: string) {
      const row = rows.find((candidate) => candidate.tenantId === context.tenantId && candidate.id === objectId);
      const content = row === undefined ? undefined : contents.get(row.id);
      if (row === undefined || content === undefined) {
        throw new EntityNotFoundError('tenant_data_objects', objectId);
      }
      return content;
    },

    async deleteTenantDataObject(context: RepositoryContext, objectId: string) {
      const index = rows.findIndex((row) => row.tenantId === context.tenantId && row.id === objectId);
      if (index < 0) {
        throw new EntityNotFoundError('tenant_data_objects', objectId);
      }
      const [removed] = rows.splice(index, 1);
      if (removed !== undefined) contents.delete(removed.id);
    },
  };

  const sink = createInMemoryAuditSink();
  const audit = createAuditLogger({ sink });

  return {
    runtime: { repo, audit },
    repo,
    auditEvents: () => sink.events(),
    rows: () => [...rows],
    putRow: (row) => rows.push(row),
  };
}
