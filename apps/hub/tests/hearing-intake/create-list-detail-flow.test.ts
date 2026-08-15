/**
 * 「シート作成 → 一覧取得 → 詳細取得」を、モックを最小限にした本物の経路で確認する回帰テスト。
 *
 * 背景: `/sheets` 一覧・`/sheets/[id]` 詳細が「読み込みエラー」を表示する不具合報告があり、
 * 特に「作成した直後の詳細取得」まで失敗するという報告だった。フロント側は `!response.ok` を
 * 検知した時点で本文を読まずに固定文言へ潰していたため、実際の HTTP status / problem details
 * が分からず、原因調査ができない状態だった (この点は `hearing-sheet-list.tsx` /
 * `hearing-sheet-detail.tsx` を `extractApiErrorMessage` で修正済み)。
 *
 * このテストは `packages/db` の実 repository・`features/hearing-intake/service.ts` の実
 * service・`app/api/v1/sheets/route.ts` / `app/api/v1/sheets/[id]/route.ts` の実 route
 * handler を、`withAuthz` を経由した本物の認証済みリクエストで貫通させる。差し替えるのは
 * 「Workers 用 web client は `file:` を開けない」という実行環境差だけ (Node 用ローカル DB へ
 * 差し替え)。`role: 'member'`（申請者ロール）・`role: 'workspace-admin'` の両方で確認する。
 *
 * DB は `apps/hub/tests/auth-tenancy/support/real-db.ts` と同じ方針で組み立てる:
 * `@harness-hub/db` の公開 API (`applyDdlStatements` + canonical migration SQL) だけを使い、
 * package 内部への deep import はしない (`scripts/ci/check-shared-layer-duplicates.mjs` の
 * boundary-bypass 検査に抵触するため)。`workspaces` 表へ行を作らないのも同じ理由:
 * `hearing_sheets`/`ai_jobs` の `workspace_id` は FK ではなく単なる text 列で、
 * 所属判定は `user_workspaces` だけを見る。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const envHolder: { current: Record<string, string> } = { current: {} };

vi.mock('@harness-hub/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@harness-hub/db')>();
  return {
    ...actual,
    // Workers 用 web client は file: を開けない。テストは常に Node 用ローカルファイル DB を使うので、
    // 本番と同じ `createTursoWebClient` の呼び出し口はそのままに、実体だけ Node driver へ差し替える。
    createTursoWebClient: actual.createTursoClient,
  };
});

vi.mock('../../src/features/hearing-intake/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/features/hearing-intake/runtime.js')>();
  return {
    ...actual,
    hearingIntakeRuntime: () => actual.hearingIntakeRuntime({ ...process.env, ...envHolder.current }),
  };
});

vi.mock('../../src/lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => actual.authRuntime({ ...process.env, ...envHolder.current }),
  };
});

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyDdlStatements,
  createCoreRepositories,
  createRepositoryContext,
  createTursoClient,
  splitMigrationSql,
} from '@harness-hub/db';
import type { HearingRole } from '@harness-hub/schemas';
import { GET as detailRoute, PATCH as updateRoute } from '../../src/app/api/v1/sheets/[id]/route.js';
import { POST as createRoute, GET as listRoute } from '../../src/app/api/v1/sheets/route.js';
import { buildSessionClaims, SESSION_COOKIE_NAME, signSessionToken } from '../../src/lib/auth/index.js';

/** テスト用 KEK (32 byte)。本番 KEK は Workers Secret にのみ存在する。 */
const TEST_KEK_B64 = Buffer.alloc(32, 7).toString('base64');

const HERE = dirname(fileURLToPath(import.meta.url));
// migration の置き場。**import ではなく path 参照**にしてある (real-db.ts と同じ理由: 相対 path で
// packages/db を import すると共通層の境界迂回として検出される。SQL は成果物であってモジュールではない)。
const MIGRATIONS_DIR = join(HERE, '..', '..', '..', '..', 'packages', 'db', 'migrations');
const MIGRATIONS = [
  '0000_baseline-core-domain.sql',
  '0001_auth-tenancy-device-flow-contract.sql',
  '0002_hearing-intake-ai-queue.sql',
  '0003_auth-tenancy-shared-google-oidc.sql',
  '0004_auth-tenancy-customer-managed-oidc-lifecycle.sql',
  '0005_common_stepford_cuckoos.sql',
  '0006_tenant-data-retention.sql',
  '0015_card-mutation-safety.sql',
];

let adapter: Awaited<ReturnType<typeof createTursoClient>>;
let tempDir: string;

beforeEach(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'sheets-flow-'));
  const dbUrl = `file:${join(tempDir, 'test.db')}`;
  adapter = createTursoClient({ url: dbUrl });
  await applyDdlStatements(adapter, [
    'PRAGMA journal_mode=WAL',
    ...MIGRATIONS.flatMap((name) => splitMigrationSql(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))),
  ]);
  envHolder.current = { TURSO_DATABASE_URL: dbUrl, TURSO_AUTH_TOKEN: '' };

  process.env.AUTH_SESSION_SECRET = 'session-secret';
  process.env.AUTH_ACCESS_TOKEN_SECRET = 'access-secret';
  process.env.AUTH_ALLOWED_ORIGINS = 'https://hub.example.com';
  process.env.AUTH_DEVICE_VERIFICATION_URI = 'https://hub.example.com/device';
  process.env.AUTH_CANONICAL_ORIGIN = 'https://hub.example.com';
  process.env.ENCRYPTION_KEK = TEST_KEK_B64;
});

afterEach(() => {
  adapter.close();
  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.AUTH_SESSION_SECRET;
  delete process.env.AUTH_ACCESS_TOKEN_SECRET;
  delete process.env.AUTH_ALLOWED_ORIGINS;
  delete process.env.AUTH_DEVICE_VERIFICATION_URI;
  delete process.env.AUTH_CANONICAL_ORIGIN;
  delete process.env.ENCRYPTION_KEK;
});

async function seedActor(
  slug: string,
  role: 'member' | 'workspace-admin',
  profile: { readonly name?: string; readonly email?: string } = {},
) {
  const core = createCoreRepositories({ adapter, kekBase64: TEST_KEK_B64 });
  const tenant = await core.tenants.create({ slug, name: `Tenant ${slug}`, plan: 'free' });
  const context = createRepositoryContext({ tenantId: tenant.id });
  const workspaceId = `ws-${slug}`;
  const user = await core.users.insert(context, {
    idpSubject: `sub-${slug}`,
    email: profile.email ?? `${slug}@example.com`,
    name: profile.name ?? `User ${slug}`,
    department: '業務改善',
    role,
    status: 'active',
  });
  await core.userWorkspaces.add(context, { userId: user.id, workspaceId });

  return { tenantId: tenant.id, workspaceId, userId: user.id, role };
}

async function sessionCookie(actor: {
  tenantId: string;
  userId: string;
  workspaceId: string;
  role: 'member' | 'workspace-admin';
}) {
  const claims = buildSessionClaims(
    {
      id: actor.userId,
      tenantId: actor.tenantId,
      idpSubject: `sub-${actor.userId}`,
      name: 'Test User',
      email: 'test@example.com',
      role: actor.role,
      status: 'active',
      workspaceIds: [actor.workspaceId],
      workspaceNames: {},
    },
    Math.floor(Date.now() / 1000),
  );
  const token = await signSessionToken(claims, 'session-secret');
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function createSheetBody(role: HearingRole) {
  return {
    taskName: '請求書処理',
    company: 'サンプル社',
    applicant: '山田',
    domain: '経理',
    issue: '転記が多い',
    tools: '表計算',
    hours: 40,
    people: 5,
    salary: 5_000_000,
    features: 'OCR',
    output: 'CSV',
    priority: 'high' as const,
    usagePurpose: 'system_development' as const,
    expertise: 'novice' as const,
    role,
    context: 'business' as const,
    motivation: 'efficiency' as const,
    sharingIntent: 'small_group' as const,
    constraintTags: [],
    shareTarget: 'チーム内の経理担当',
    knowledgeAssets: ['経理マニュアル v3'],
    requestPatterns: [],
    integrationTools: [],
    existingDataSources: [],
    referenceUrls: [],
  };
}

describe.each([
  { label: 'member（申請者ロール）', role: 'member' as const },
  { label: 'workspace-admin', role: 'workspace-admin' as const },
])('シート作成直後の一覧・詳細取得 ($label)', ({ role }) => {
  it('POST で作成した直後に GET 一覧・GET 詳細がどちらも 200 で取得できる', async () => {
    const actor = await seedActor(`flow-${role}`, role);
    const cookie = await sessionCookie(actor);

    const createRequest = new Request('https://hub.example.com/api/v1/sheets', {
      method: 'POST',
      headers: {
        cookie,
        origin: 'https://hub.example.com',
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
        'x-harness-tenant-id': actor.tenantId,
        'x-harness-workspace-id': actor.workspaceId,
      },
      body: JSON.stringify(createSheetBody('employee')),
    });
    const createResponse = await createRoute(createRequest);
    const created = (await createResponse.json()) as { readonly id: string };
    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get('etag')).toBe('"sheets-1"');

    const listRequest = new Request('https://hub.example.com/api/v1/sheets?limit=25', {
      headers: {
        cookie,
        'x-harness-tenant-id': actor.tenantId,
        'x-harness-workspace-id': actor.workspaceId,
      },
    });
    const listResponse = await listRoute(listRequest);
    const listBody = (await listResponse.json()) as { readonly items: readonly { readonly id: string }[] };
    expect(listResponse.status).toBe(200);
    expect(listBody.items.some((item) => item.id === created.id)).toBe(true);

    const detailRequest = new Request(`https://hub.example.com/api/v1/sheets/${created.id}`, {
      headers: {
        cookie,
        'x-harness-tenant-id': actor.tenantId,
        'x-harness-workspace-id': actor.workspaceId,
      },
    });
    const detailResponse = await detailRoute(detailRequest, { params: Promise.resolve({ id: created.id }) });
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.headers.get('etag')).toBe('"sheets-1"');
    const detailBody = (await detailResponse.json()) as { readonly id: string; readonly revision: number };
    expect(detailBody.id).toBe(created.id);
    expect(detailBody.revision).toBe(1);
  });
});

// JIT provisioning (lib/auth/db-ports.ts の createFromOidc) は users.name を空文字で作るため、
// 初回サインインした利用者のシートは必ずこの経路を通る。応答 schema の applicant.name は
// min(1) なので、空文字をそのまま返すと一覧・詳細が揃って 500 に落ちていた。
describe('初回サインイン直後の利用者 (users.name が空文字)', () => {
  it('一覧・詳細が 200 で取得でき、申請者名にメールアドレスが出る', async () => {
    const actor = await seedActor('jit-blank', 'member', { name: '', email: 'yamada@example.com' });
    const cookie = await sessionCookie(actor);
    const headers = {
      cookie,
      'x-harness-tenant-id': actor.tenantId,
      'x-harness-workspace-id': actor.workspaceId,
    };

    const createResponse = await createRoute(
      new Request('https://hub.example.com/api/v1/sheets', {
        method: 'POST',
        headers: {
          ...headers,
          origin: 'https://hub.example.com',
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(createSheetBody('employee')),
      }),
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { readonly id: string };

    const listResponse = await listRoute(new Request('https://hub.example.com/api/v1/sheets?limit=25', { headers }));
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as {
      readonly items: readonly { readonly id: string; readonly applicant: { readonly name: string } }[];
    };
    expect(listBody.items.find((item) => item.id === created.id)?.applicant.name).toBe('yamada@example.com');

    const detailResponse = await detailRoute(
      new Request(`https://hub.example.com/api/v1/sheets/${created.id}`, { headers }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(detailResponse.status).toBe(200);
    const detailBody = (await detailResponse.json()) as { readonly applicant: { readonly name: string } };
    expect(detailBody.applicant.name).toBe('yamada@example.com');
  });

  it('氏名もメールも空なら識別子を申請者名に出す', async () => {
    const actor = await seedActor('jit-empty', 'member', { name: '', email: '' });
    const cookie = await sessionCookie(actor);
    const headers = {
      cookie,
      'x-harness-tenant-id': actor.tenantId,
      'x-harness-workspace-id': actor.workspaceId,
    };

    const createResponse = await createRoute(
      new Request('https://hub.example.com/api/v1/sheets', {
        method: 'POST',
        headers: {
          ...headers,
          origin: 'https://hub.example.com',
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify(createSheetBody('employee')),
      }),
    );
    expect(createResponse.status).toBe(201);

    const listResponse = await listRoute(new Request('https://hub.example.com/api/v1/sheets?limit=25', { headers }));
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as {
      readonly items: readonly { readonly applicant: { readonly name: string } }[];
    };
    expect(listBody.items[0]?.applicant.name).toBe(actor.userId);
  });
});

describe('CARD-MUTATION-SHEETS-HTTP: idempotent create and entity revision CAS', () => {
  it('requires UUID v4, replays concurrent same-key POST, and rejects changed payload', async () => {
    const actor = await seedActor('mutation-sheet-post', 'workspace-admin');
    const cookie = await sessionCookie(actor);
    const commonHeaders = {
      cookie,
      origin: 'https://hub.example.com',
      'content-type': 'application/json',
      'x-harness-tenant-id': actor.tenantId,
      'x-harness-workspace-id': actor.workspaceId,
    };
    const request = (key: string | null, title = '請求書処理') => {
      const headers = new Headers(commonHeaders);
      if (key !== null) headers.set('idempotency-key', key);
      return new Request('https://hub.example.com/api/v1/sheets', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...createSheetBody('employee'), taskName: title }),
      });
    };

    expect((await createRoute(request(null))).status).toBe(400);
    expect((await createRoute(request('not-a-uuid'))).status).toBe(400);
    const oversizedRequest = request(crypto.randomUUID());
    oversizedRequest.headers.set('content-length', '250001');
    expect((await createRoute(oversizedRequest)).status).toBe(413);

    const key = crypto.randomUUID();
    const [first, second] = await Promise.all([createRoute(request(key)), createRoute(request(key))]);
    const [firstBody, secondBody] = await Promise.all([first.text(), second.text()]);
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(firstBody).toBe(secondBody);
    expect(first.headers.get('etag')).toBe('"sheets-1"');
    expect(second.headers.get('etag')).toBe('"sheets-1"');
    expect([first.headers.get('idempotency-replayed'), second.headers.get('idempotency-replayed')].sort()).toEqual([
      'false',
      'true',
    ]);
    expect(first.headers.get('idempotency-key-expires-at')).toBe(second.headers.get('idempotency-key-expires-at'));

    const created = JSON.parse(firstBody) as { readonly id: string };
    const patchHeaders = new Headers(commonHeaders);
    patchHeaders.set('if-match', '"sheets-1"');
    const updated = await updateRoute(
      new Request(`https://hub.example.com/api/v1/sheets/${created.id}`, {
        method: 'PATCH',
        headers: patchHeaders,
        body: JSON.stringify({ status: 'review' }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(updated.status).toBe(200);

    const replayAfterUpdate = await createRoute(request(key));
    expect(replayAfterUpdate.status).toBe(201);
    expect(replayAfterUpdate.headers.get('etag')).toBe('"sheets-1"');
    expect(replayAfterUpdate.headers.get('idempotency-replayed')).toBe('true');
    expect(await replayAfterUpdate.text()).toBe(firstBody);
    expect((await createRoute(request(key, '別業務'))).status).toBe(422);

    const listResponse = await listRoute(
      new Request('https://hub.example.com/api/v1/sheets?limit=25', {
        headers: {
          cookie,
          'x-harness-tenant-id': actor.tenantId,
          'x-harness-workspace-id': actor.workspaceId,
        },
      }),
    );
    const list = (await listResponse.json()) as { readonly items: readonly unknown[] };
    expect(list.items).toHaveLength(1);
  });

  it('returns ETags and a scoped current representation for stale PATCH', async () => {
    const actor = await seedActor('mutation-sheet-cas', 'workspace-admin');
    const cookie = await sessionCookie(actor);
    const headers = {
      cookie,
      origin: 'https://hub.example.com',
      'content-type': 'application/json',
      'idempotency-key': crypto.randomUUID(),
      'x-harness-tenant-id': actor.tenantId,
      'x-harness-workspace-id': actor.workspaceId,
    };
    const createdResponse = await createRoute(
      new Request('https://hub.example.com/api/v1/sheets', {
        method: 'POST',
        headers,
        body: JSON.stringify(createSheetBody('employee')),
      }),
    );
    const created = (await createdResponse.json()) as { readonly id: string; readonly revision: number };
    expect(created).toMatchObject({ revision: 1 });
    expect(createdResponse.headers.get('etag')).toBe('"sheets-1"');

    const patch = (ifMatch: string | null, status: 'review' | 'completed') => {
      const patchHeaders = new Headers(headers);
      patchHeaders.delete('idempotency-key');
      if (ifMatch === null) patchHeaders.delete('if-match');
      else patchHeaders.set('if-match', ifMatch);
      return updateRoute(
        new Request(`https://hub.example.com/api/v1/sheets/${created.id}`, {
          method: 'PATCH',
          headers: patchHeaders,
          body: JSON.stringify({ status }),
        }),
        { params: Promise.resolve({ id: created.id }) },
      );
    };

    expect((await patch(null, 'review')).status).toBe(428);
    expect((await patch('"docs-1"', 'review')).status).toBe(400);
    const winner = await patch('"sheets-1"', 'review');
    expect(winner.status).toBe(200);
    expect(winner.headers.get('etag')).toBe('"sheets-2"');
    const stale = await patch('"sheets-1"', 'completed');
    expect(stale.status).toBe(412);
    expect(stale.headers.get('etag')).toBe('"sheets-2"');
    await expect(stale.json()).resolves.toMatchObject({
      error: 'revision_conflict',
      current: { id: created.id, status: 'review', revision: 2 },
    });
  });
});
