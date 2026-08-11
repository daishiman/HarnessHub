/**
 * `requestScopedResource` — 要求 header の申告から資源参照を組み立てる純関数。
 *
 * header 名は `src/middleware` の正本を import する。テストへ文字列を書き写すと
 * 正本を変えたときにテストだけ通り続け、header 名の変更漏れを検出できなくなる。
 */

import { describe, expect, it } from 'vitest';

import { requestScopedResource } from '../../src/lib/authz/resource.js';
import { TENANT_HEADER, WORKSPACE_HEADER } from '../../src/middleware-contract.js';

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://hub.example.com/api/v1/tokens', { headers });
}

describe('requestScopedResource: テナント申告', () => {
  it('テナント header が無い要求は資源を確定できないので null', () => {
    expect(requestScopedResource(requestWith({}), { type: 'token' })).toBeNull();
  });

  it('テナント header が空白のみなら未申告と同じく null', () => {
    expect(requestScopedResource(requestWith({ [TENANT_HEADER]: '   ' }), { type: 'token' })).toBeNull();
  });

  it('テナント header の前後空白は落として申告値をそのまま使う', () => {
    expect(requestScopedResource(requestWith({ [TENANT_HEADER]: '  tenant-a  ' }), { type: 'token' })).toEqual({
      type: 'token',
      id: null,
      tenantId: 'tenant-a',
      workspaceId: null,
      ownerUserId: null,
    });
  });
});

describe('requestScopedResource: Workspace の決め方', () => {
  it('input が Workspace を指定しなければ header の申告を採る', () => {
    expect(
      requestScopedResource(requestWith({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: ' ws-a1 ' }), {
        type: 'sheet',
      }),
    ).toMatchObject({ workspaceId: 'ws-a1' });
  });

  it('Workspace header が空白のみなら null (空文字を Workspace 名として扱わない)', () => {
    expect(
      requestScopedResource(requestWith({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: '  ' }), { type: 'sheet' }),
    ).toMatchObject({ workspaceId: null });
  });

  it('input.workspaceId は header 申告より優先される', () => {
    expect(
      requestScopedResource(requestWith({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-a1' }), {
        type: 'sheet',
        workspaceId: 'ws-a2',
      }),
    ).toMatchObject({ workspaceId: 'ws-a2' });
  });

  it('input.workspaceId に明示的な null を渡すと header があっても非スコープになる', () => {
    expect(
      requestScopedResource(requestWith({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-a1' }), {
        type: 'tenant',
        workspaceId: null,
      }),
    ).toMatchObject({ workspaceId: null });
  });
});

describe('requestScopedResource: 資源の属性', () => {
  it('id / ownerUserId を渡せばそのまま載る', () => {
    expect(
      requestScopedResource(requestWith({ [TENANT_HEADER]: 'tenant-a', [WORKSPACE_HEADER]: 'ws-a1' }), {
        type: 'sheet',
        id: 'sheet-1',
        ownerUserId: 'user-a',
      }),
    ).toEqual({
      type: 'sheet',
      id: 'sheet-1',
      tenantId: 'tenant-a',
      workspaceId: 'ws-a1',
      ownerUserId: 'user-a',
    });
  });

  it('id / ownerUserId に null を渡しても省略時と同じ形になる', () => {
    expect(
      requestScopedResource(requestWith({ [TENANT_HEADER]: 'tenant-a' }), {
        type: 'token',
        id: null,
        ownerUserId: null,
      }),
    ).toEqual({
      type: 'token',
      id: null,
      tenantId: 'tenant-a',
      workspaceId: null,
      ownerUserId: null,
    });
  });

  it('principal のテナントではなく申告テナントを載せる (越境検査を到達可能に保つ)', () => {
    const resource = requestScopedResource(requestWith({ [TENANT_HEADER]: 'tenant-b' }), { type: 'token' });
    expect(resource?.tenantId).toBe('tenant-b');
  });
});
