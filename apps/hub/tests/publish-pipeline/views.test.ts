import { describe, expect, it } from 'vitest';

import type { ChannelRecord, DeploymentRecord, PublishRequestRecord, ReleaseRecord } from '@/lib/publish/ports';
import {
  nextCursorOf,
  toChannelView,
  toDeploymentView,
  toPublishRequestView,
  toReleaseView,
} from '@/lib/publish/views';

const CREATED_AT = Date.UTC(2026, 0, 2, 3, 4, 5);

const REQUEST: PublishRequestRecord = {
  id: 'req-0001',
  tenantId: 'tenant-a',
  workspaceId: 'ws-1',
  projectId: 'proj-1',
  channelId: 'ch-0001',
  status: 'ready',
  verdict: 'green',
  payload: { contentHash: 'abc123', findings: [] },
  releaseId: null,
  requestedBy: 'user-1',
  createdAt: CREATED_AT,
};

const RELEASE: ReleaseRecord = {
  id: 'rel-0001',
  tenantId: 'tenant-a',
  projectId: 'proj-1',
  channelId: 'ch-0001',
  version: 'v1',
  packageHash: 'abc123',
  manifestJson: '{"v":1}',
  status: 'available',
  createdBy: 'user-1',
  createdAt: CREATED_AT,
};

const CHANNEL: ChannelRecord = {
  id: 'ch-0001',
  tenantId: 'tenant-a',
  projectId: 'proj-1',
  target: 'skill',
  stableReleaseId: 'rel-0001',
  createdAt: CREATED_AT,
};

const DEPLOYMENT: DeploymentRecord = {
  id: 'dep-0001',
  tenantId: 'tenant-a',
  projectId: 'proj-1',
  channelId: 'ch-0001',
  releaseId: 'rel-0001',
  url: 'https://demo.example.workers.dev',
  provider: 'cloudflare',
  orphanCandidate: false,
  registeredBy: 'user-1',
  createdAt: CREATED_AT,
};

describe('内部 record → 応答表現', () => {
  it('PublishRequest を契約の形へ変換する', () => {
    expect(toPublishRequestView(REQUEST)).toEqual({
      id: 'req-0001',
      project_id: 'proj-1',
      channel_id: 'ch-0001',
      status: 'ready',
      verdict: 'green',
      findings: [],
      release_id: null,
      content_hash: 'abc123',
      requested_by: 'user-1',
      created_at: '2026-01-02T03:04:05.000Z',
    });
  });

  it('内部専用の列を応答へ出さない', () => {
    // tenant_id / workspace_id / manifest_json は応答契約に無い。
    // 変換を route ごとに書くと、endpoint によって漏れる/漏れないの差が生まれる
    const view = toPublishRequestView(REQUEST) as Record<string, unknown>;

    expect(Object.keys(view)).not.toContain('tenantId');
    expect(Object.keys(view)).not.toContain('workspaceId');
    expect(Object.keys(toReleaseView(RELEASE) as Record<string, unknown>)).not.toContain('manifestJson');
  });

  it('epoch ミリ秒を ISO8601 へ変換する', () => {
    expect(toReleaseView(RELEASE).created_at).toBe('2026-01-02T03:04:05.000Z');
    expect(toDeploymentView(DEPLOYMENT).created_at).toBe('2026-01-02T03:04:05.000Z');
  });

  it('Release / Channel / Deployment も契約の形になる', () => {
    expect(toReleaseView(RELEASE)).toMatchObject({ id: 'rel-0001', version: 'v1', status: 'available' });
    expect(toChannelView(CHANNEL)).toEqual({
      id: 'ch-0001',
      project_id: 'proj-1',
      target: 'skill',
      stable_release_id: 'rel-0001',
    });
    expect(toDeploymentView(DEPLOYMENT)).toMatchObject({ provider: 'cloudflare', orphan_candidate: false });
  });

  it('契約に合わない値は応答にせず例外にする', () => {
    // 壊れた JSON を返すより、そこで気付くほうが被害が小さい。
    // 型が合っていても値域は保証されない (DB に残った未知の status など)
    const broken = { ...REQUEST, status: 'unknown_state' } as unknown as PublishRequestRecord;

    expect(() => toPublishRequestView(broken)).toThrow();
  });

  it('verdict 未確定 (null) をそのまま表現できる', () => {
    expect(toPublishRequestView({ ...REQUEST, verdict: null, status: 'draft' }).verdict).toBeNull();
  });
});

describe('次ページ鍵', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('要求件数ぴったりなら最後の id を返す', () => {
    expect(nextCursorOf(items, 3)).toBe('c');
  });

  it('要求件数に満たなければ null (次は無い)', () => {
    expect(nextCursorOf(items, 5)).toBeNull();
  });

  it('空なら null', () => {
    expect(nextCursorOf([], 10)).toBeNull();
  });
});
