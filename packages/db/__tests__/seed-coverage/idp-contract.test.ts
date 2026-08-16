import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../../connection/turso';
import { idpConnections } from '../../schema/core/identity';
import { seedDemoCoverage } from '../../scripts/demo-coverage/seed';
import { asCore, createLibsqlTestDb } from '../support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => {
  adapter.close();
});

describe('demo coverage IdP storage contract', () => {
  it('stores the active connection workspace domains as the JSON array consumed by Hub auth', async () => {
    await seedDemoCoverage({ adapter: asCore(adapter) });

    const [active] = await adapter.client
      .select({ allowedWorkspaceDomains: idpConnections.allowedWorkspaceDomains })
      .from(idpConnections)
      .where(eq(idpConnections.credentialStatus, 'active'))
      .limit(1);
    expect(active).toBeDefined();

    let parsed: unknown = 'invalid-json';
    try {
      parsed = JSON.parse(active?.allowedWorkspaceDomains ?? '');
    } catch {
      // Hub auth port is fail-closed on malformed storage; keep the assertion output free of the raw value.
    }
    expect(parsed).toEqual(['demo.example.com']);
  });
});
