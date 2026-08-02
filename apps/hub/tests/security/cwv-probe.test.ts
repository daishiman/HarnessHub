/** protected catalog の CWV 専用 credential。通常認証へ権限が漏れない境界を検査する。 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  CWV_PROBE_AUDIENCE,
  CWV_PROBE_COOKIE_NAME,
  CWV_PROBE_TTL_SECONDS,
  isCwvProbeRequestAllowed,
  readCwvProbeConfig,
  resolveCwvProbePrincipal,
  resolveCwvProbeTicket,
} from '../../src/lib/auth/cwv-probe.js';
import { signJwt } from '../../src/lib/auth/jwt.js';
import { type AuthzRuntimeDeps, withAuthz } from '../../src/lib/authz/with-authz.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  TENANT_A,
  WORKSPACE_A1,
} from '../auth-tenancy/support/in-memory-ports.js';

const NOW = 1_800_000_000;
const CONFIG = {
  secret: 'cwv-probe-test-secret',
  origin: 'https://hub.example.com',
  tenantId: TENANT_A,
  workspaceId: WORKSPACE_A1,
} as const;

async function ticket(overrides: Record<string, unknown> = {}): Promise<string> {
  return signJwt(
    {
      typ: 'cwv_probe',
      aud: CWV_PROBE_AUDIENCE,
      origin: CONFIG.origin,
      tenant_id: CONFIG.tenantId,
      workspace_id: CONFIG.workspaceId,
      iat: NOW,
      exp: NOW + CWV_PROBE_TTL_SECONDS,
      ...overrides,
    },
    CONFIG.secret,
  );
}

describe('CWV probe credential: 設定と ticket の fail-closed 検証', () => {
  it('3 Secret がすべて無ければ無効、1 件でも不足/空白なら起動時に落とす', () => {
    expect(readCwvProbeConfig({}, CONFIG.origin)).toBeUndefined();
    expect(() => readCwvProbeConfig({ CWV_PROBE_SECRET: 'only-secret' }, CONFIG.origin)).toThrow('同時に設定');
    expect(() =>
      readCwvProbeConfig(
        { CWV_PROBE_SECRET: 'secret', CWV_PROBE_TENANT_ID: 'tenant', CWV_PROBE_WORKSPACE_ID: '  ' },
        CONFIG.origin,
      ),
    ).toThrow('同時に設定');
    expect(() =>
      readCwvProbeConfig(
        { CWV_PROBE_SECRET: 'secret', CWV_PROBE_TENANT_ID: 'tenant', CWV_PROBE_WORKSPACE_ID: 'workspace' },
        'http://hub.example.com',
      ),
    ).toThrow('https origin');
  });

  it('正しい署名・audience・origin・scope・5 分以内の ticket だけを synthetic principal にする', async () => {
    await expect(resolveCwvProbeTicket(await ticket(), CONFIG, NOW)).resolves.toMatchObject({
      credential: 'cwv_probe',
      tenantId: TENANT_A,
      workspaceIds: [WORKSPACE_A1],
      role: 'member',
    });

    await expect(resolveCwvProbeTicket(await ticket({ aud: 'other' }), CONFIG, NOW)).resolves.toBeNull();
    await expect(
      resolveCwvProbeTicket(await ticket({ origin: 'https://other.example' }), CONFIG, NOW),
    ).resolves.toBeNull();
    await expect(resolveCwvProbeTicket(await ticket({ tenant_id: 'tenant-b' }), CONFIG, NOW)).resolves.toBeNull();
    await expect(resolveCwvProbeTicket(await ticket({ exp: NOW }), CONFIG, NOW)).resolves.toBeNull();
    await expect(
      resolveCwvProbeTicket(await ticket({ exp: NOW + CWV_PROBE_TTL_SECONDS + 1 }), CONFIG, NOW),
    ).resolves.toBeNull();
    await expect(resolveCwvProbeTicket(await ticket({ iat: NOW + 31 }), CONFIG, NOW)).resolves.toBeNull();
  });

  it('invalid probe cookie は session/Bearer fallback の候補ではない null を返す', async () => {
    await expect(resolveCwvProbePrincipal(`${CWV_PROBE_COOKIE_NAME}=tampered`, CONFIG, NOW)).resolves.toBeNull();
  });
});

describe('CWV probe credential: read-only の到達境界', () => {
  it('catalog と明示した catalog read endpoint の GET/HEAD だけを許可する', () => {
    for (const pathname of [
      '/catalog',
      '/marketplace.json',
      '/api/v1/harnesses',
      '/api/v1/harnesses/project-1',
      '/api/v1/projects/project-1/releases',
    ]) {
      expect(isCwvProbeRequestAllowed('GET', pathname), pathname).toBe(true);
      expect(isCwvProbeRequestAllowed('HEAD', pathname), pathname).toBe(true);
    }
    expect(isCwvProbeRequestAllowed('POST', '/api/v1/harnesses/project-1/install')).toBe(false);
    expect(isCwvProbeRequestAllowed('GET', '/api/v1/admin/oidc-connections')).toBe(false);
    expect(isCwvProbeRequestAllowed('GET', '/catalog/project-1')).toBe(false);
  });

  it('route wrapper は cwv_probe を harnesses.read の GET にだけ通し、失効照会を行わない', async () => {
    const ports = createTestPorts();
    ports.clock.set(NOW);
    const revocation = { isRevoked: vi.fn(async () => false) };
    const deps: AuthzRuntimeDeps = {
      ports,
      audit: createAuditLogger({ sink: createInMemoryAuditSink(), newId: createSequentialIds('audit') }),
      revocation,
      sessionSecret: 'session-secret',
      accessTokenSecret: 'access-secret',
      cwvProbe: CONFIG,
      allowedOrigins: [CONFIG.origin],
    };
    const route = withAuthz(
      {
        action: 'harnesses.read',
        deps,
        resolveResource: async () => ({
          type: 'harness',
          id: 'catalog',
          tenantId: TENANT_A,
          workspaceId: WORKSPACE_A1,
          ownerUserId: null,
        }),
      },
      async () => Response.json({ ok: true }),
    );
    const request = new Request(`${CONFIG.origin}/api/v1/harnesses`, {
      headers: { cookie: `${CWV_PROBE_COOKIE_NAME}=${await ticket()}` },
    });

    const response = await route(request);
    expect(response.status).toBe(200);
    expect(revocation.isRevoked).not.toHaveBeenCalled();

    const crossOriginResponse = await route(
      new Request('https://other.example/api/v1/harnesses', {
        headers: { cookie: `${CWV_PROBE_COOKIE_NAME}=${await ticket()}` },
      }),
    );
    expect(crossOriginResponse.status).toBe(401);
  });

  it('route wrapper は同じ ticket でも catalog 外の read を credential_not_allowed で拒否する', async () => {
    const ports = createTestPorts();
    ports.clock.set(NOW);
    const deps: AuthzRuntimeDeps = {
      ports,
      audit: createAuditLogger({ sink: createInMemoryAuditSink(), newId: createSequentialIds('audit') }),
      revocation: { isRevoked: async () => false },
      sessionSecret: 'session-secret',
      accessTokenSecret: 'access-secret',
      cwvProbe: CONFIG,
      allowedOrigins: [CONFIG.origin],
    };
    const route = withAuthz(
      {
        action: 'harnesses.read',
        deps,
        resolveResource: async () => ({
          type: 'harness',
          id: 'other',
          tenantId: TENANT_A,
          workspaceId: WORKSPACE_A1,
          ownerUserId: null,
        }),
      },
      async () => Response.json({ ok: true }),
    );

    const response = await route(
      new Request(`${CONFIG.origin}/api/v1/projects/project-1`, {
        headers: { cookie: `${CWV_PROBE_COOKIE_NAME}=${await ticket()}` },
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'credential_not_allowed' });
  });
});

describe('CWV workflow helpers: Worker と同じ HS256 契約、artifact 非露出', () => {
  it('Node mint helper の ticket を Worker verifier が受理する', async () => {
    const scriptUrl = pathToFileURL(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/mint-cwv-probe.mjs'),
    ).href;
    const helper = (await import(scriptUrl)) as {
      mintCwvProbe(input: {
        secret: string;
        origin: string;
        tenantId: string;
        workspaceId: string;
        nowSeconds: number;
      }): { ticket: string };
      buildCwvTargetUrl(input: { origin: string; tenantId: string; workspaceId: string; ticket: string }): string;
      buildSafeCwvTargetUrl(input: { origin: string; tenantId: string; workspaceId: string }): string;
    };
    const minted = helper.mintCwvProbe({
      secret: CONFIG.secret,
      origin: CONFIG.origin,
      tenantId: TENANT_A,
      workspaceId: WORKSPACE_A1,
      nowSeconds: NOW,
    });
    await expect(resolveCwvProbeTicket(minted.ticket, CONFIG, NOW)).resolves.toMatchObject({ credential: 'cwv_probe' });
    expect(
      helper.buildCwvTargetUrl({
        origin: CONFIG.origin,
        tenantId: TENANT_A,
        workspaceId: WORKSPACE_A1,
        ticket: minted.ticket,
      }),
    ).toContain('__cwv_probe=');
    expect(
      helper.buildSafeCwvTargetUrl({ origin: CONFIG.origin, tenantId: TENANT_A, workspaceId: WORKSPACE_A1 }),
    ).not.toContain('__cwv_probe=');
  });

  it('artifact sanitizer は URL query と任意文字列から ticket を除去する', async () => {
    const scriptUrl = pathToFileURL(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/sanitize-cwv-artifact.mjs'),
    ).href;
    const helper = (await import(scriptUrl)) as {
      sanitizeCwvArtifact(value: unknown, ticket: string): { finalUrl: string; nested: string };
      containsTicket(value: unknown, ticket: string): boolean;
    };
    const secretTicket = await ticket();
    const sanitized = helper.sanitizeCwvArtifact(
      {
        finalUrl: `${CONFIG.origin}/catalog?tenant=${TENANT_A}&__cwv_probe=${secretTicket}`,
        nested: `token=${secretTicket}`,
      },
      secretTicket,
    );
    expect(JSON.stringify(sanitized)).not.toContain(secretTicket);
    expect(sanitized.finalUrl).not.toContain('__cwv_probe=');
    expect(helper.containsTicket(sanitized, secretTicket)).toBe(false);
  });

  it('workflow は target 手入力を持たず、専用 secret と sanitizer を使う', () => {
    const workflow = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.github/workflows/cwv.yml'),
      'utf8',
    );
    expect(workflow).not.toContain('target_url:');
    for (const name of ['HUB_CWV_PROBE_SECRET', 'HUB_CWV_PROBE_TENANT_ID', 'HUB_CWV_PROBE_WORKSPACE_ID']) {
      expect(workflow).toContain(`secrets.${name}`);
    }
    expect(workflow).toContain('mint-cwv-probe.mjs --github-env "$GITHUB_ENV"');
    expect(workflow).toContain('sanitize-cwv-artifact.mjs ./lighthouse.json "$CWV_PROBE_TICKET"');
    expect(workflow).toContain('process.env.SAFE_TARGET_URL');
  });
});
