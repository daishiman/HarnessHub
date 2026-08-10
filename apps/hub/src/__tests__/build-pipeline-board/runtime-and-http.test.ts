/**
 * BPB-RT-* / BPB-HTTPUTIL-*: composition root の環境変数契約と JSON 受理の境界
 * (SYS-BUILD-PIPELINE-BOARD-P05)。
 *
 * route は module 読み込み時に環境変数へ触れてはならない (触ると DB 接続情報の無いビルド環境で
 * import 自体が落ちる)。その契約は「`buildPipelineBoardRuntime()` を**呼んだとき**に初めて
 * 失敗する」ことで確認する。
 */
import { buildStageTransitionRequestSchema, problemDetails } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import { parseJsonRequest, problemResponse } from '../../features/build-pipeline-board/http.js';
import { buildPipelineBoardRuntime } from '../../features/build-pipeline-board/runtime.js';

describe('BPB-RT: composition root', () => {
  it('BPB-RT-001: TURSO_DATABASE_URL 未設定なら呼び出し時に落ちる (import 時ではない)', () => {
    expect(() => buildPipelineBoardRuntime({})).toThrow('環境変数 TURSO_DATABASE_URL が未設定です');
  });

  it('BPB-RT-002: リモート URL に認証トークンが無ければ拒否する', () => {
    expect(() => buildPipelineBoardRuntime({ TURSO_DATABASE_URL: 'libsql://example.turso.io' })).toThrow(
      'TURSO_AUTH_TOKEN',
    );
  });

  it('BPB-RT-003: 同じ接続情報なら runtime を再利用し、変われば作り直す', () => {
    // 接続の作り直しはリクエストごとの新規コネクションを意味するため、キャッシュが効くことを固定する。
    // Workers 経路 (`createTursoWebClient`) はリモート URL しか受け付けないので、接続はここでは張らない前提の
    // ダミー URL を使う (runtime 生成時に通信は発生しない)。
    const env = { TURSO_DATABASE_URL: 'libsql://board-a.turso.io', TURSO_AUTH_TOKEN: 'token-a' };
    const first = buildPipelineBoardRuntime(env);
    expect(buildPipelineBoardRuntime(env)).toBe(first);

    const second = buildPipelineBoardRuntime({
      TURSO_DATABASE_URL: 'libsql://board-b.turso.io',
      TURSO_AUTH_TOKEN: 'token-a',
    });
    expect(second).not.toBe(first);
  });
});

describe('BPB-HTTPUTIL: JSON 受理', () => {
  it('BPB-HTTPUTIL-001: JSON として読めない body は 400 problem+json', async () => {
    const request = new Request('https://hub.example.com/api/v1/builds/b1/stage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    });
    const parsed = await parseJsonRequest(request, buildStageTransitionRequestSchema);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.response.status).toBe(400);
    expect(parsed.response.headers.get('content-type')).toContain('problem+json');
  });

  it('BPB-HTTPUTIL-002: schema 違反は 422 problem+json', async () => {
    const request = new Request('https://hub.example.com/api/v1/builds/b1/stage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to_stage: 'nope', expected_stage: 'design' }),
    });
    const parsed = await parseJsonRequest(request, buildStageTransitionRequestSchema);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.response.status).toBe(422);
  });

  it('BPB-HTTPUTIL-003: problemResponse は status とメディア型を problem details に合わせる', async () => {
    const response = problemResponse(problemDetails({ title: 'だめ', status: 409 }));
    expect(response.status).toBe(409);
    expect(response.headers.get('content-type')).toContain('problem+json');
  });
});
