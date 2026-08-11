/** publish route の公開要求・package 配線。共通 runtime は support/route-context.ts。 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthRuntime } from '../../src/lib/authz/runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));

vi.mock('../../src/lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 runtime が未設定です');
      return runtimeHolder.current;
    },
  };
});

import {
  ADMIN_ID,
  auth,
  bodyOf,
  buildRequest,
  buildTestZip,
  buildValidPackage,
  createFixedWindowRateLimiter,
  createPublishHarness,
  createRoute,
  detailRoute,
  IDEMPOTENCY_KEY,
  IDEMPOTENCY_REPLAY_HEADER,
  listRoute,
  OWNER_ID,
  PUBLISH_ARCHIVE_LIMITS,
  packageRoute,
  params,
  projectCreateRoute,
  projectListRoute,
  publish,
  sessionCookieFor,
  setPublishRateLimiterForTest,
  submitRoute,
  testUser,
  VALID_MANIFEST,
} from './support/route-context.js';

beforeEach(() => {
  runtimeHolder.current = auth.runtime;
});

describe('POST /projects: Web 公開用 Project の準備', () => {
  it('session scope から owner を固定し、冪等再送で Project と監査を重複させない', async () => {
    const send = async () =>
      projectCreateRoute(
        await buildRequest('POST', '/projects', {
          idempotencyKey: 'key-project-create-1',
          json: { name: '問い合わせ整理', description: '問い合わせを分類する Skill' },
        }),
      );

    const first = await send();
    const second = await send();

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBe('true');
    expect(await second.json()).toEqual(await first.json());
    expect(publish.projectRows()).toHaveLength(2); // setup の proj-1 + 今回作成した 1 件
    expect(publish.auditEvents().filter((event) => event.action === 'project.create')).toHaveLength(1);
  });
});

describe('GET /projects: Project名の選択肢', () => {
  it('現在の Workspace だけを返し、owner の公開 capability を認可表から投影する', async () => {
    publish.putProject({ id: 'proj-other-workspace', workspaceId: 'workspace-other', name: '別Workspace' });
    const response = await projectListRoute(
      await buildRequest('GET', '/projects', { cookie: await sessionCookieFor(testUser(OWNER_ID)) }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          id: 'proj-1',
          name: 'Project proj-1',
          description: '',
          can_publish: true,
        },
      ],
    });
  });
});

afterEach(() => {
  runtimeHolder.current = null;
});

describe('POST /publish: 公開要求の作成', () => {
  it('201 と応答契約の形で返る', async () => {
    const request = await buildRequest('POST', '/publish', {
      json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace' },
    });
    const response = await createRoute(request);

    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await bodyOf(response)).toMatchObject({
      project_id: 'proj-1',
      status: 'draft',
      verdict: null,
      findings: [],
      release_id: null,
      content_hash: null,
      requested_by: ADMIN_ID,
    });
  });

  it('channel は server が決める — client が channel_id を渡すと 400 (strict schema)', async () => {
    const request = await buildRequest('POST', '/publish', {
      json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace', channel_id: 'ch-9999' },
    });
    const response = await createRoute(request);

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'invalid_body' });
  });

  it('冪等鍵の無い変更要求は 400 — 再試行安全性を client 任せにしない', async () => {
    const request = await buildRequest('POST', '/publish', {
      idempotencyKey: null,
      json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace' },
    });
    const response = await createRoute(request);

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'idempotency_key_required' });
    expect(publish.requestRows()).toHaveLength(0);
  });

  it('JSON として読めない本文は 400', async () => {
    const response = await createRoute(await buildRequest('POST', '/publish', { json: '{ not json' }));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'invalid_body' });
  });

  it('Workspace を申告しない要求は 400 workspace_required', async () => {
    const request = await buildRequest('POST', '/publish', {
      workspaceId: null,
      json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace' },
    });
    const response = await createRoute(request);

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'workspace_required' });
  });

  it('同じ冪等鍵の再送は 2 件目を作らず、先着の応答をそのまま返す', async () => {
    const send = async () =>
      createRoute(
        await buildRequest('POST', '/publish', {
          idempotencyKey: IDEMPOTENCY_KEY,
          json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace' },
        }),
      );

    const first = await send();
    const second = await send();

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBe('true');
    expect(await second.json()).toEqual(await first.json());
    expect(publish.requestRows()).toHaveLength(1);
  });

  it('同じ鍵で違う本文を送ると 422 — 再送と別要求を取り違えない', async () => {
    await createRoute(
      await buildRequest('POST', '/publish', {
        idempotencyKey: IDEMPOTENCY_KEY,
        json: { project_id: 'proj-1', target: 'skill', visibility: 'workspace' },
      }),
    );
    const response = await createRoute(
      await buildRequest('POST', '/publish', {
        idempotencyKey: IDEMPOTENCY_KEY,
        json: { project_id: 'proj-2', target: 'skill', visibility: 'workspace' },
      }),
    );

    expect(response.status).toBe(422);
    expect(await bodyOf(response)).toEqual({ error: 'idempotency_key_reused' });
    expect(publish.requestRows()).toHaveLength(1);
  });
});

describe('GET /publish: 一覧', () => {
  it('200 で items と next_cursor を返す', async () => {
    publish.putRequest({ id: 'req-a' });
    publish.putRequest({ id: 'req-b' });

    const response = await listRoute(await buildRequest('GET', '/publish'));
    const body = await bodyOf(response);

    expect(response.status).toBe(200);
    expect((body.items as unknown[]).map((item) => (item as { id: string }).id)).toEqual(['req-b', 'req-a']);
    // 既定 limit (50) に満たないので次ページは無い
    expect(body.next_cursor).toBeNull();
  });

  it('絞り込みが port まで届く', async () => {
    publish.putRequest({ id: 'req-a', status: 'draft' });
    publish.putRequest({ id: 'req-b', status: 'ready' });

    const response = await listRoute(await buildRequest('GET', '/publish?status=ready'));
    const body = await bodyOf(response);

    expect((body.items as { id: string }[]).map((item) => item.id)).toEqual(['req-b']);
  });

  it('値域外の query は 400 invalid_query (0 件返して黙るより気付ける)', async () => {
    const response = await listRoute(await buildRequest('GET', '/publish?limit=0'));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: 'invalid_query' });
  });
});

describe('GET /publish/{id}: 1 件取得', () => {
  it('200 で findings まで返す (自分で直せる情報なので隠さない)', async () => {
    publish.putRequest({
      id: 'req-a',
      status: 'needs_fix',
      verdict: 'red',
      payload: {
        contentHash: 'hash-1',
        findings: [
          {
            rule_id: 'PKG-MANIFEST-MISSING',
            stage: 'static-validation',
            severity: 'error',
            message: 'ない',
            path: null,
            line: null,
          },
        ],
      },
    });

    const response = await detailRoute(await buildRequest('GET', '/publish/req-a'), params({ id: 'req-a' }));
    const body = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe('needs_fix');
    expect(body.findings).toHaveLength(1);
  });

  it('他テナントの要求は 404 (テナント境界は port が閉じる)', async () => {
    // 行は存在するが tenant-b のもの。header は tenant-a を名乗っているので見えてはいけない
    createPublishHarness();
    const response = await detailRoute(await buildRequest('GET', '/publish/req-x'), params({ id: 'req-x' }));

    expect(response.status).toBe(404);
    expect(await bodyOf(response)).toEqual({ error: 'request_not_found' });
  });
});

describe('PUT /publish/{id}/package: 本体のアップロード', () => {
  it('ZIP upload にも変更要求の上限が適用され、超過分は本文の検査前に 429 で拒否される', async () => {
    setPublishRateLimiterForTest(createFixedWindowRateLimiter({ maxRequests: 1, windowMs: 60_000 }));
    publish.putRequest({ id: 'req-a' });
    const bytes = await buildValidPackage();

    const first = await packageRoute(
      await buildRequest('PUT', '/publish/req-a/package', {
        body: bytes,
        idempotencyKey: 'key-package-rate-1',
      }),
      params({ id: 'req-a' }),
    );
    const limited = await packageRoute(
      await buildRequest('PUT', '/publish/req-a/package', {
        body: bytes,
        idempotencyKey: 'key-package-rate-2',
      }),
      params({ id: 'req-a' }),
    );

    expect(first.status).toBe(200);
    expect(first.headers.get('ratelimit-limit')).toBe('1');
    expect(limited.status).toBe(429);
    expect(await bodyOf(limited)).toEqual({ error: 'rate_limited' });
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(publish.storedPackages()).toHaveLength(1);
  });

  it('検査に通れば 200 で content_hash と size_bytes を返す', async () => {
    publish.putRequest({ id: 'req-a' });
    const bytes = await buildValidPackage();

    const request = await buildRequest('PUT', '/publish/req-a/package', { body: bytes });
    const response = await packageRoute(request, params({ id: 'req-a' }));
    const body = await bodyOf(response);

    expect(response.status).toBe(200);
    expect(body.size_bytes).toBe(bytes.byteLength);
    expect(String(body.content_hash)).toMatch(/^[0-9a-f]{64}$/);
    expect(publish.storedPackages()).toHaveLength(1);
  });

  it('Content-Length が上限を超えていれば本文を読まずに 413', async () => {
    publish.putRequest({ id: 'req-a' });

    const request = await buildRequest('PUT', '/publish/req-a/package', {
      body: new Uint8Array([1, 2, 3]),
      // 実バイト数ではなく申告値で判定する。上限超えを最後まで読んでから断るのは、
      // 断る理由 (資源を使わせない) そのものと矛盾する
      headers: { 'content-length': String(64 * 1024 * 1024) },
    });
    const response = await packageRoute(request, params({ id: 'req-a' }));

    expect(response.status).toBe(413);
    expect(await bodyOf(response)).toEqual({ error: 'package_rejected' });
    expect(publish.storedPackages()).toHaveLength(0);
  });

  it('Content-Length が無くても実バイト数が上限を超えれば読取を打ち切って 413', async () => {
    publish.putRequest({ id: 'req-a' });
    const request = await buildRequest('PUT', '/publish/req-a/package', {
      body: new Uint8Array(PUBLISH_ARCHIVE_LIMITS.maxCompressedBytes + 1),
    });
    request.headers.delete('content-length');

    const response = await packageRoute(request, params({ id: 'req-a' }));

    expect(response.status).toBe(413);
    expect(await bodyOf(response)).toEqual({ error: 'package_rejected' });
    expect(publish.storedPackages()).toHaveLength(0);
  });

  it('検査で落ちた本体は 422 と findings を返し、保管しない', async () => {
    publish.putRequest({ id: 'req-a' });
    const bytes = await buildTestZip([
      { path: 'plugin.json', content: VALID_MANIFEST },
      { path: '../escape.md', content: 'x' },
    ]);

    const request = await buildRequest('PUT', '/publish/req-a/package', { body: bytes });
    const response = await packageRoute(request, params({ id: 'req-a' }));
    const body = await bodyOf(response);

    expect(response.status).toBe(422);
    expect(body.error).toBe('package_rejected');
    expect((body.findings as { rule_id: string }[]).map((finding) => finding.rule_id)).toContain(
      'ARCHIVE-PATH-TRAVERSAL',
    );
    expect(publish.storedPackages()).toHaveLength(0);

    const submitted = await submitRoute(await buildRequest('POST', '/publish/req-a/submit'), params({ id: 'req-a' }));
    expect(submitted.status).toBe(200);
    expect((await bodyOf(submitted)).status).toBe('needs_fix');
  });

  it('冪等鍵の指紋は本文のバイト列から作る — 同じ鍵で同じ本体なら 1 度しか保管しない', async () => {
    publish.putRequest({ id: 'req-a' });
    const bytes = await buildValidPackage();

    const send = async () =>
      packageRoute(
        await buildRequest('PUT', '/publish/req-a/package', { body: bytes, idempotencyKey: IDEMPOTENCY_KEY }),
        params({ id: 'req-a' }),
      );

    const first = await send();
    const second = await send();

    expect(first.status).toBe(200);
    expect(second.headers.get(IDEMPOTENCY_REPLAY_HEADER)).toBe('true');
    expect(await second.json()).toEqual(await first.json());
  });

  it('同じ鍵で違う本体を送ると 422 — 別のパッケージが再生されない', async () => {
    publish.putRequest({ id: 'req-a' });

    await packageRoute(
      await buildRequest('PUT', '/publish/req-a/package', {
        body: await buildValidPackage(),
        idempotencyKey: IDEMPOTENCY_KEY,
      }),
      params({ id: 'req-a' }),
    );
    const response = await packageRoute(
      await buildRequest('PUT', '/publish/req-a/package', {
        body: await buildValidPackage([{ path: 'skills/other/SKILL.md', content: '# other\n' }]),
        idempotencyKey: IDEMPOTENCY_KEY,
      }),
      params({ id: 'req-a' }),
    );

    expect(response.status).toBe(422);
    expect(await bodyOf(response)).toEqual({ error: 'idempotency_key_reused' });
  });
});
