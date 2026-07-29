// Better Stack 適用器テストの共有 fixture / fake API。
//
// 契約 assertion は apply-better-stack-monitoring.test.ts に置き、本ファイルは
// JSON fixture の読込とメモリ上の Better Stack API だけを担う。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HUB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const HEARTBEAT_URL = 'https://uptime.betterstack.com/api/v1/heartbeat/secretsecretsecret';
export const BACKUP_HEARTBEAT_URL = 'https://uptime.betterstack.com/api/v1/heartbeat/backupsecretsecret';

export interface ApiNode {
  id: string;
  attributes: Record<string, unknown>;
}

export interface FakeClient {
  request(method: string, path: string, body?: unknown): Promise<unknown>;
  listAll(path: string): Promise<ApiNode[]>;
  calls: { method: string; path: string }[];
  requestBodies: { method: string; path: string; body: unknown }[];
}

export function loadConfig(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HUB_ROOT, 'monitoring/better-stack.monitors.json'), 'utf8'));
}

export function loadDashboard(): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HUB_ROOT, 'monitoring/slo-dashboard.json'), 'utf8'));
}

export function payloadOf(
  config: Record<string, unknown>,
  key: 'monitor' | 'heartbeat' | 'backup_heartbeat' | 'status_page',
): Record<string, unknown> {
  return (config[key] as { request: { payload: Record<string, unknown> } }).request.payload;
}

export function seededHeartbeats(config: Record<string, unknown>): ApiNode[] {
  return [
    { id: '22', attributes: { ...payloadOf(config, 'heartbeat'), url: HEARTBEAT_URL } },
    { id: '23', attributes: { ...payloadOf(config, 'backup_heartbeat'), url: BACKUP_HEARTBEAT_URL } },
  ];
}

/**
 * メモリ上の Better Stack。POST が来た件数を calls で数えられるので
 * 「再実行しても作りに行かない」を直接主張できる。
 */
export function createFakeClient(
  seed: { monitors?: ApiNode[]; heartbeats?: ApiNode[]; statusPages?: ApiNode[]; resources?: ApiNode[] } = {},
): FakeClient {
  const store: Record<string, ApiNode[]> = {
    '/api/v2/monitors': seed.monitors ?? [],
    '/api/v2/heartbeats': seed.heartbeats ?? [],
    '/api/v2/status-pages': seed.statusPages ?? [],
  };
  const resources: Record<string, ApiNode[]> = {};
  const calls: { method: string; path: string }[] = [];
  const requestBodies: { method: string; path: string; body: unknown }[] = [];
  let nextId = 1000;

  function resourcePath(p: string): string | null {
    return /^\/api\/v2\/status-pages\/[^/]+\/resources$/.test(p) ? p : null;
  }

  return {
    calls,
    requestBodies,
    async listAll(p: string) {
      calls.push({ method: 'GET', path: p });
      const asResource = resourcePath(p);
      if (asResource !== null) return resources[asResource] ?? seed.resources ?? [];
      return store[p] ?? [];
    },
    async request(method: string, p: string, body?: unknown) {
      calls.push({ method, path: p });
      requestBodies.push({ method, path: p, body });
      if (method === 'PATCH') {
        const matched = p.match(/^(\/api\/v2\/(?:monitors|heartbeats))\/([^/]+)$/);
        if (matched === null) throw new Error(`想定外の ${method} ${p}`);
        const collectionPath = matched[1];
        const id = matched[2];
        if (collectionPath === undefined || id === undefined) throw new Error(`更新先を解析できません: ${p}`);
        const collection = store[collectionPath] ?? [];
        const index = collection.findIndex((item) => item.id === id);
        if (index < 0) throw new Error(`更新対象がありません: ${p}`);
        const current = collection[index];
        if (current === undefined) throw new Error(`更新対象がありません: ${p}`);
        const attributes = { ...current.attributes, ...(body as Record<string, unknown>) };
        if ((body as Record<string, unknown>)?.paused === false) {
          attributes.paused_at = null;
          attributes.status = collectionPath === '/api/v2/monitors' ? 'up' : 'pending';
        }
        const updated = { ...current, attributes };
        collection[index] = updated;
        store[collectionPath] = collection;
        return { data: updated };
      }
      if (method !== 'POST') throw new Error(`想定外の ${method} ${p}`);
      nextId += 1;
      const id = String(nextId);
      const attributes = { ...(body as Record<string, unknown>) };
      const asResource = resourcePath(p);
      if (asResource !== null) {
        const created = { id, attributes };
        resources[asResource] = [...(resources[asResource] ?? []), created];
        return { data: created };
      }
      if (p === '/api/v2/heartbeats') {
        attributes.url = attributes.name === 'Harness Hub daily backup' ? BACKUP_HEARTBEAT_URL : HEARTBEAT_URL;
      }
      const created = { id, attributes };
      store[p] = [...(store[p] ?? []), created];
      // status page だけ公式ドキュメント例の data 無し応答も通ることを固定する
      return p === '/api/v2/status-pages' ? created : { data: created };
    },
  };
}
