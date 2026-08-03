// P04 テストスタブ (SYS-DOCS-CMS-P04)
// DOCS-AUTHZ-*: doc 編集の admin 限定認可 (SEC2 / qa-021)。
//
// rules.ts には既に docs.read / docs.write_tenant / docs.write_common の 3 action が
// 登録済み (single source ACTION_RULES)。本ファイルは feature 側で role 判定を複製せず、
// 既存の decide() を経由することだけを検証する (dual-catalog-web の DC-TEN-04 と同型の防御)。

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { decide } from '../../lib/authz/decide.js';
import type { AuthzPrincipal, AuthzResourceRef } from '../../lib/authz/types.js';

function principal(overrides: Partial<AuthzPrincipal> = {}): AuthzPrincipal {
  return {
    userId: 'user-1',
    tenantId: 'tenant-a',
    role: 'member',
    status: 'active',
    issuedAtSeconds: 1_700_000_000,
    workspaceIds: ['ws-1'],
    scope: null,
    credential: 'session',
    ...overrides,
  };
}

/** resource.tenantId は常に header 宣言済み (= 自テナント)。ADR §3.1/§6 の設計を前提にする。 */
const OWN_TENANT_DOC: AuthzResourceRef = {
  type: 'document',
  id: 'doc-1',
  tenantId: 'tenant-a',
  workspaceId: 'ws-1',
  ownerUserId: null,
};

describe('DOCS-AUTHZ: docs.read (member 以上)', () => {
  it('DOCS-AUTHZ-001: member は自テナントの doc を読める', () => {
    const outcome = decide({ action: 'docs.read', principal: principal(), resource: OWN_TENANT_DOC, sessionRevoked: false });
    expect(outcome).toEqual({ allowed: true, effectiveRole: 'member' });
  });
});

describe('DOCS-AUTHZ: docs.write_tenant (workspace-admin 以上)', () => {
  it('DOCS-AUTHZ-002: member は tenant スコープ doc を書けない', () => {
    const outcome = decide({
      action: 'docs.write_tenant',
      principal: principal({ role: 'member' }),
      resource: OWN_TENANT_DOC,
      sessionRevoked: false,
    });
    expect(outcome).toEqual({ allowed: false, reason: 'insufficient_role' });
  });

  it('DOCS-AUTHZ-003: workspace-admin は tenant スコープ doc を書ける', () => {
    const outcome = decide({
      action: 'docs.write_tenant',
      principal: principal({ role: 'workspace-admin' }),
      resource: OWN_TENANT_DOC,
      sessionRevoked: false,
    });
    expect(outcome).toEqual({ allowed: true, effectiveRole: 'workspace-admin' });
  });
});

describe('DOCS-AUTHZ: docs.write_common (provider-admin 限定)', () => {
  it('DOCS-AUTHZ-004: workspace-admin は common スコープ doc を書けない (追加ゲート)', () => {
    const outcome = decide({
      action: 'docs.write_common',
      principal: principal({ role: 'workspace-admin' }),
      resource: OWN_TENANT_DOC,
      sessionRevoked: false,
    });
    expect(outcome).toEqual({ allowed: false, reason: 'insufficient_role' });
  });

  it('DOCS-AUTHZ-005: provider-admin は common スコープ doc を書ける', () => {
    const outcome = decide({
      action: 'docs.write_common',
      principal: principal({ role: 'provider-admin' }),
      resource: OWN_TENANT_DOC,
      sessionRevoked: false,
    });
    expect(outcome).toEqual({ allowed: true, effectiveRole: 'provider-admin' });
  });

  it('DOCS-AUTHZ-006: route ハンドラは共通ゲート (docs.write_tenant) と authz.can("docs.write_common") の2段で common 書込みを追加拒否する (ADR §3)', () => {
    // withAuthz の最低ゲートは docs.write_tenant (POST/PATCH/draft 共通)。
    // scope==='common' のときだけ handler 内で authz.can('docs.write_common') を追加確認する設計。
    // workspace-admin は最低ゲートを通るが、追加確認では拒否される非対称を固定する
    const minGate = decide({
      action: 'docs.write_tenant',
      principal: principal({ role: 'workspace-admin' }),
      resource: OWN_TENANT_DOC,
      sessionRevoked: false,
    });
    const additionalGate = decide({
      action: 'docs.write_common',
      principal: principal({ role: 'workspace-admin' }),
      resource: OWN_TENANT_DOC,
      sessionRevoked: false,
    });
    expect(minGate.allowed).toBe(true);
    expect(additionalGate.allowed).toBe(false);
  });
});

describe('DOCS-AUTHZ: 認可判定の複製禁止', () => {
  it('DOCS-AUTHZ-007: docs-cms feature コードは role 判定 (atLeast や順序表・アクション規則の語彙) を複製しない', () => {
    // 検査対象語を直書きすると「複製が無いこと」を調べる自分自身が誤検出源になるため分割して組み立てる
    const forbidden = [['ROLE', 'ORDER'].join('_'), ['ACTION', 'RULES'].join('_'), 'atLeast(', 'decide('];
    const featureDir = path.resolve(process.cwd(), 'src/features/docs-cms');

    // features/docs-cms は P05 実装対象。P04 時点では存在しないため、
    // 「実装後に違反 0 件」を先に固定する契約として、存在しない間は明示的に skip する。
    if (!existsSync(featureDir)) return;

    const files = collectSourceFiles(featureDir).filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`));
    expect(files.length, `${featureDir} 配下にソースが 1 件も見つからない`).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      for (const token of forbidden) {
        expect(content, `${path.relative(featureDir, file)} に認可判定 (${token}) が複製されている`).not.toContain(
          token,
        );
      }
    }
  });
});

function collectSourceFiles(dir: string): string[] {
  const collected: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...collectSourceFiles(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      collected.push(full);
    }
  }
  return collected;
}
