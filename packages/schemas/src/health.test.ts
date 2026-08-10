/** `/health` 契約の単体テスト。HF-A3-HEALTH-002 / 003 が apps/hub 側で参照する契約の裏づけ。 */
import { describe, expect, it } from 'vitest';

import {
  buildHealthResponse,
  dependencyCheckSchema,
  deriveHealthStatus,
  healthHttpStatus,
  healthResponseSchema,
  healthStatusSchema,
} from './index.js';

describe('healthStatusSchema', () => {
  it.each(['ok', 'degraded', 'down'])('%s を許可する', (status) => {
    expect(healthStatusSchema.parse(status)).toBe(status);
  });

  it('契約外の状態語を拒否する', () => {
    expect(healthStatusSchema.safeParse('healthy').success).toBe(false);
  });
});

describe('dependencyCheckSchema', () => {
  it('name と status のみで成立する', () => {
    expect(dependencyCheckSchema.parse({ name: 'db', status: 'ok' })).toEqual({
      name: 'db',
      status: 'ok',
    });
  });

  it('latencyMs と detail を任意で持てる', () => {
    const parsed = dependencyCheckSchema.parse({
      name: 'r2',
      status: 'degraded',
      latencyMs: 120,
      detail: '応答が遅延しています',
    });
    expect(parsed.latencyMs).toBe(120);
  });

  it('負の latencyMs を拒否する', () => {
    expect(dependencyCheckSchema.safeParse({ name: 'db', status: 'ok', latencyMs: -1 }).success).toBe(false);
  });
});

describe('healthResponseSchema', () => {
  it('{status, version, checkedAt, dependencies[]} の契約を満たす応答を通す', () => {
    const response = {
      status: 'ok',
      version: 'abc1234',
      checkedAt: '2026-07-21T09:30:00.000Z',
      dependencies: [{ name: 'db', status: 'ok' }],
    };
    expect(healthResponseSchema.parse(response)).toEqual(response);
  });

  it.each([
    ['status 欠落', { version: 'v', checkedAt: '2026-07-21T09:30:00.000Z', dependencies: [] }],
    ['version 欠落', { status: 'ok', checkedAt: '2026-07-21T09:30:00.000Z', dependencies: [] }],
    ['checkedAt 欠落', { status: 'ok', version: 'v', dependencies: [] }],
    ['dependencies 欠落', { status: 'ok', version: 'v', checkedAt: '2026-07-21T09:30:00.000Z' }],
    ['checkedAt が ISO でない', { status: 'ok', version: 'v', checkedAt: '2026/07/21', dependencies: [] }],
  ])('%s の応答を拒否する', (_label, response) => {
    expect(healthResponseSchema.safeParse(response).success).toBe(false);
  });

  // V6: 稼働成果物がどの commit に対応するかを認証なしで確認できるようにするための field。
  // 「コードは直っている」と「本番が直っている」の区別が付かなかったことが 2026-08-07 の障害の本体。
  it('40 桁 hex の commit を載せた応答を通す', () => {
    const response = {
      status: 'ok',
      version: 'abc1234',
      commit: '150a0f14ab3c9d7e5f2b8a1c4d6e0f9a3b5c7d1e',
      checkedAt: '2026-07-21T09:30:00.000Z',
      dependencies: [],
    };
    expect(healthResponseSchema.parse(response)).toEqual(response);
  });

  it('commit が無い応答も通す (埋込前の稼働版を schema 違反で 500 にしない)', () => {
    const response = { status: 'ok', version: 'v', checkedAt: '2026-07-21T09:30:00.000Z', dependencies: [] };
    expect(healthResponseSchema.safeParse(response).success).toBe(true);
  });

  it.each([
    ['短縮 sha', '150a0f14'],
    ['大文字混じり', '150A0F14AB3C9D7E5F2B8A1C4D6E0F9A3B5C7D1E'],
    ['branch 名', 'main'],
    ['空文字', ''],
    ['41 桁', '150a0f14ab3c9d7e5f2b8a1c4d6e0f9a3b5c7d1ea'],
  ])('commit が %s なら拒否する (誤った素性を正しい素性として受け入れない)', (_label, commit) => {
    const response = { status: 'ok', version: 'v', commit, checkedAt: '2026-07-21T09:30:00.000Z', dependencies: [] };
    expect(healthResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe('deriveHealthStatus', () => {
  it('依存が無ければ ok', () => {
    expect(deriveHealthStatus([])).toBe('ok');
  });

  it('全て ok なら ok', () => {
    expect(
      deriveHealthStatus([
        { name: 'db', status: 'ok' },
        { name: 'r2', status: 'ok' },
      ]),
    ).toBe('ok');
  });

  it('1 件でも degraded があれば degraded', () => {
    expect(
      deriveHealthStatus([
        { name: 'db', status: 'ok' },
        { name: 'r2', status: 'degraded' },
      ]),
    ).toBe('degraded');
  });

  it('down が最優先される (HF-A3-HEALTH-003: 依存不通で ok にならない)', () => {
    expect(
      deriveHealthStatus([
        { name: 'db', status: 'down' },
        { name: 'r2', status: 'degraded' },
      ]),
    ).toBe('down');
  });
});

describe('healthHttpStatus', () => {
  it('ok と degraded は 200 (監視は body で判定する)', () => {
    expect(healthHttpStatus('ok')).toBe(200);
    expect(healthHttpStatus('degraded')).toBe(200);
  });

  it('down は 503', () => {
    expect(healthHttpStatus('down')).toBe(503);
  });
});

describe('buildHealthResponse', () => {
  it('依存状態から status を導出した契約準拠の応答を返す', () => {
    const response = buildHealthResponse({
      version: 'abc1234',
      checkedAt: new Date('2026-07-21T09:30:00.000Z'),
      dependencies: [
        { name: 'db', status: 'ok', latencyMs: 3 },
        { name: 'r2', status: 'down', detail: '接続できません' },
      ],
    });

    expect(response.status).toBe('down');
    expect(response.checkedAt).toBe('2026-07-21T09:30:00.000Z');
    expect(healthResponseSchema.safeParse(response).success).toBe(true);
  });

  it('依存が全て健全なら ok を返す', () => {
    expect(
      buildHealthResponse({
        version: 'v1',
        checkedAt: new Date('2026-07-21T09:30:00.000Z'),
        dependencies: [{ name: 'db', status: 'ok' }],
      }).status,
    ).toBe('ok');
  });
});
