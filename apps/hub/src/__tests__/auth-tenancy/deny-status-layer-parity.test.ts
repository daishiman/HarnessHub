/**
 * 認可拒否の HTTP status を、middleware 層と route 層で一致させる回帰検査。
 *
 * 背景: `tenant_mismatch` は T-ISO-06 の存在秘匿契約で 404 と定まっている。route 層の
 * `denyStatusFor` は 404 を返していたが、middleware 層は 403 を返しており、middleware が先に
 * 応答するため route 側の 404 は到達不能だった。route 単体テストは `withAuthz` を直接呼ぶので
 * 緑のまま素通りし、本番の smoke (`POST /api/v1/ai-jobs/pull` が expected=404 に対して
 * actual=403 tenant_mismatch) で初めて露見した。この smoke 失敗が deploy 後の自動ロールバックを
 * 引き起こし、本番が古い版に固定され続けていた。
 *
 * したがって検査対象は「片方の層の値」ではなく **両層の対応表が一致すること** である。
 * 一方だけを直しても再発するため、実際に middleware の `authorize` を通した decision と
 * route 層の `denyStatusFor` を突き合わせる。
 */
import { describe, expect, it } from 'vitest';

import { denyStatusFor } from '../../lib/authz/index.js';
import { authorize } from '../../middleware/index.js';
import type { Principal } from '../../shared/auth/index.js';

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const WORKSPACE_A1 = 'workspace-a1';

const principalA: Principal = {
  subject: 'user-a',
  tenantId: TENANT_A,
  workspaceIds: [WORKSPACE_A1],
  roles: ['member'],
};

/** middleware は Headers ではなく Map<string, string> を受ける (呼び出し側 middleware.ts と同形)。 */
function headers(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

describe('deny status の層間一致 (middleware ↔ route)', () => {
  it('他テナント scope の要求は middleware 層でも存在秘匿の 404 になる', () => {
    const decision = authorize({
      pathname: '/api/v1/ai-jobs/pull',
      headers: headers({ 'x-harness-tenant-id': TENANT_B }),
      principal: principalA,
      // Device Flow の access token 経路は session scope 解決を使わない (本番 smoke と同条件)
      allowSessionScope: false,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('tenant_mismatch');
    // 403 だと「その ID の資源が他テナントに在る」ことが応答から伝わる
    expect(decision.status).toBe(404);
    // 片側だけ直しても再発するため、route 層の対応表と実値で突き合わせる
    expect(decision.status).toBe(denyStatusFor('tenant_mismatch'));
  });

  it('同一テナント内の workspace 非所属は権限不足の 403 のまま (存在秘匿へ倒さない)', () => {
    const decision = authorize({
      pathname: '/api/v1/ai-jobs/pull',
      headers: headers({
        'x-harness-tenant-id': TENANT_A,
        'x-harness-workspace-id': 'workspace-a2',
      }),
      principal: principalA,
      allowSessionScope: false,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('workspace_not_member');
    expect(decision.status).toBe(403);
    expect(decision.status).toBe(denyStatusFor('workspace_not_member'));
  });

  it('未認証は 401 で、存在秘匿にも権限不足にも倒さない', () => {
    const decision = authorize({
      pathname: '/api/v1/ai-jobs/pull',
      headers: headers({ 'x-harness-tenant-id': TENANT_A }),
      principal: null,
      allowSessionScope: false,
    });

    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.reason).toBe('unauthenticated');
    expect(decision.status).toBe(401);
    expect(decision.status).toBe(denyStatusFor('unauthenticated'));
  });
});
