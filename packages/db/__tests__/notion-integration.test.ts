import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TursoAdapter } from '../connection/turso';
import { createNotionIntegrationRepo } from '../repository/notion-integration';
import { createRepositoryContext } from '../src/context';
import { asCore, createLibsqlTestDb, testCipher } from './support/test-db';

let adapter: TursoAdapter;

beforeAll(async () => {
  adapter = await createLibsqlTestDb();
});

afterAll(() => adapter.close());

describe('notion_integrations repository', () => {
  it('concurrent first upsert 後も永続行の id で API キーを復号できる', async () => {
    const core = asCore(adapter);
    const repo = createNotionIntegrationRepo(core, testCipher(core));
    const context = createRepositoryContext({ tenantId: 'tenant-notion-race' });

    await Promise.all([
      repo.upsert(context, {
        workspaceId: 'workspace-notion-race',
        mode: 'api_key',
        pageUrl: 'https://www.notion.so/first',
        apiKey: 'secret_first_concurrent_value',
      }),
      repo.upsert(context, {
        workspaceId: 'workspace-notion-race',
        mode: 'api_key',
        pageUrl: 'https://www.notion.so/second',
        apiKey: 'secret_second_concurrent_value',
      }),
    ]);

    const persisted = await repo.get(context, 'workspace-notion-race');
    expect(persisted).not.toBeNull();
    if (persisted === null) throw new Error('concurrent upsert 後の行がありません');
    await expect(repo.decryptApiKey(context, persisted)).resolves.toMatch(/^secret_(first|second)_concurrent_value$/);
  });

  it('読取りと削除は tenant と workspace の複合境界を越えない', async () => {
    const core = asCore(adapter);
    const repo = createNotionIntegrationRepo(core, testCipher(core));
    const tenantA = createRepositoryContext({ tenantId: 'tenant-notion-a' });
    const tenantB = createRepositoryContext({ tenantId: 'tenant-notion-b' });
    const workspaceId = 'workspace-shared-name';

    await repo.upsert(tenantA, {
      workspaceId,
      mode: 'url',
      pageUrl: 'https://www.notion.so/tenant-a',
      apiKey: null,
    });
    await repo.upsert(tenantB, {
      workspaceId,
      mode: 'url',
      pageUrl: 'https://www.notion.so/tenant-b',
      apiKey: null,
    });

    expect((await repo.get(tenantA, workspaceId))?.pageUrl).toBe('https://www.notion.so/tenant-a');
    expect((await repo.get(tenantB, workspaceId))?.pageUrl).toBe('https://www.notion.so/tenant-b');

    await repo.deleteIntegration(tenantA, workspaceId);
    expect(await repo.get(tenantA, workspaceId)).toBeNull();
    expect((await repo.get(tenantB, workspaceId))?.pageUrl).toBe('https://www.notion.so/tenant-b');
  });

  it('API キー未入力の再保存は既存値を維持し、null 指定だけが削除する', async () => {
    const core = asCore(adapter);
    const repo = createNotionIntegrationRepo(core, testCipher(core));
    const context = createRepositoryContext({ tenantId: 'tenant-notion-key-lifecycle' });
    const workspaceId = 'workspace-notion-key-lifecycle';

    await repo.upsert(context, {
      workspaceId,
      mode: 'api_key',
      pageUrl: null,
      apiKey: 'secret_key_that_must_be_preserved',
    });
    const preserved = await repo.upsert(context, {
      workspaceId,
      mode: 'api_key',
      pageUrl: 'https://www.notion.so/added-later',
    });
    await expect(repo.decryptApiKey(context, preserved)).resolves.toBe('secret_key_that_must_be_preserved');

    const cleared = await repo.upsert(context, {
      workspaceId,
      mode: 'url',
      pageUrl: 'https://www.notion.so/url-mode',
      apiKey: null,
    });
    expect(cleared.apiKeyEnc).toBeNull();
    expect(cleared.encKeyVersion).toBeNull();
    await expect(repo.decryptApiKey(context, cleared)).rejects.toThrow('notion_integrations.api_key_enc');
  });
});
