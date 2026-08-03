// P06 実行テスト (SYS-DOCS-CMS-P06)
// DOCS-HTTP-*: docs-cms route が共有する JSON parse / problem+json 応答ヘルパー。

import { documentDetailSchema, PROBLEM_JSON_MEDIA_TYPE } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { parseJsonRequest, problemResponse } from '../../features/docs-cms/http.js';

describe('DOCS-HTTP: problemResponse', () => {
  it('DOCS-HTTP-001: problem+json の content-type と status を返す', async () => {
    const response = problemResponse({
      type: 'about:blank',
      title: '見つかりません',
      status: 404,
      instance: '/api/v1/docs/doc-1',
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe(PROBLEM_JSON_MEDIA_TYPE);
    expect(await response.json()).toMatchObject({ title: '見つかりません', status: 404 });
  });
});

describe('DOCS-HTTP: parseJsonRequest', () => {
  const SCOPED_SCHEMA = documentDetailSchema.pick({ scope: true, title: true });

  it('DOCS-HTTP-002: JSON を読み取れないとき 400 の problem+json を返す', async () => {
    const request = new Request('https://example.test/api/v1/docs', {
      method: 'POST',
      body: '{invalid',
      headers: { 'content-type': 'application/json' },
    });
    const result = await parseJsonRequest(request, SCOPED_SCHEMA);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.response.status).toBe(400);
  });

  it('DOCS-HTTP-003: schema に違反する JSON は 422 の problem+json を返す', async () => {
    const request = new Request('https://example.test/api/v1/docs', {
      method: 'POST',
      body: JSON.stringify({ scope: 'invalid-scope', title: 'x' }),
      headers: { 'content-type': 'application/json' },
    });
    const result = await parseJsonRequest(request, SCOPED_SCHEMA);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.response.status).toBe(422);
  });

  it('DOCS-HTTP-004: schema を満たす JSON は data を返す', async () => {
    const request = new Request('https://example.test/api/v1/docs', {
      method: 'POST',
      body: JSON.stringify({ scope: 'tenant', title: '導入ガイド' }),
      headers: { 'content-type': 'application/json' },
    });
    const result = await parseJsonRequest(request, SCOPED_SCHEMA);
    expect(result).toEqual({ ok: true, data: { scope: 'tenant', title: '導入ガイド' } });
  });
});
