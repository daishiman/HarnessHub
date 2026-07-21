/** primitives 公開 API の単体テスト (test-design §2.1「公開 API は全て 1 件以上の test を持つ」)。 */
import { describe, expect, it } from 'vitest';

import {
  cursorSchema,
  emailSchema,
  identifierSchema,
  isoDateTimeSchema,
  localeSchema,
  paginationQuerySchema,
  semVerSchema,
  tenantIdSchema,
  toIsoDateTime,
  userIdSchema,
  workspaceIdSchema,
} from './index.js';

describe('identifierSchema', () => {
  it('URL に置ける識別子を通す', () => {
    expect(identifierSchema.parse('ws_01HZX-9')).toBe('ws_01HZX-9');
  });

  it.each(['', 'a'.repeat(65), '-leading', 'has space', 'slash/inside'])('不正な識別子 %j を拒否する', (input) => {
    expect(identifierSchema.safeParse(input).success).toBe(false);
  });
});

describe('テナント境界の ID', () => {
  it('tenantIdSchema は識別子を通す', () => {
    expect(tenantIdSchema.parse('acme')).toBe('acme');
  });

  it('workspaceIdSchema は識別子を通す', () => {
    expect(workspaceIdSchema.parse('ws-1')).toBe('ws-1');
  });

  it('userIdSchema は識別子を通す', () => {
    expect(userIdSchema.parse('u-1')).toBe('u-1');
  });

  it('空文字は拒否する', () => {
    expect(tenantIdSchema.safeParse('').success).toBe(false);
  });
});

describe('isoDateTimeSchema', () => {
  it.each(['2026-07-21T09:30:00Z', '2026-07-21T09:30:00.123Z', '2026-07-21T18:30:00+09:00'])('%s を通す', (input) => {
    expect(isoDateTimeSchema.parse(input)).toBe(input);
  });

  it.each([
    '2026-07-21',
    '2026-07-21 09:30:00',
    '2026-07-21T09:30:00',
    '2026-13-01T00:00:00Z',
    '2026-02-30T00:00:00Z',
    '2025-02-29T00:00:00Z',
    '2026-07-21T25:00:00Z',
    '2026-07-21T09:60:00Z',
    '2026-07-21T09:30:00+25:00',
  ])('%s を拒否する', (input) => {
    expect(isoDateTimeSchema.safeParse(input).success).toBe(false);
  });

  it('閏年の 2/29 は受理する', () => {
    expect(isoDateTimeSchema.parse('2028-02-29T00:00:00Z')).toBe('2028-02-29T00:00:00Z');
  });
});

describe('toIsoDateTime', () => {
  it('Date を契約形式の文字列へ変換する', () => {
    expect(toIsoDateTime(new Date('2026-07-21T09:30:00.000Z'))).toBe('2026-07-21T09:30:00.000Z');
  });
});

describe('emailSchema', () => {
  it('妥当なアドレスを通し、不正なものを拒否する', () => {
    expect(emailSchema.parse('a@example.com')).toBe('a@example.com');
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });
});

describe('semVerSchema', () => {
  it('semver を通し、それ以外を拒否する', () => {
    expect(semVerSchema.parse('1.2.3')).toBe('1.2.3');
    expect(semVerSchema.parse('1.0.0-rc.1')).toBe('1.0.0-rc.1');
    expect(semVerSchema.safeParse('1.2').success).toBe(false);
    expect(semVerSchema.safeParse('v1.2.3').success).toBe(false);
  });
});

describe('localeSchema', () => {
  it('ja / en のみ許可する', () => {
    expect(localeSchema.parse('ja')).toBe('ja');
    expect(localeSchema.parse('en')).toBe('en');
    expect(localeSchema.safeParse('fr').success).toBe(false);
  });
});

describe('cursorSchema', () => {
  it('不透明な文字列を通し、空文字を拒否する', () => {
    expect(cursorSchema.parse('eyJpZCI6MX0')).toBe('eyJpZCI6MX0');
    expect(cursorSchema.safeParse('').success).toBe(false);
  });
});

describe('paginationQuerySchema', () => {
  it('limit 未指定時は 50 を既定にする', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: 50 });
  });

  it('query string 由来の文字列 limit を数値へ強制する', () => {
    expect(paginationQuerySchema.parse({ limit: '20', cursor: 'abc' })).toEqual({
      limit: 20,
      cursor: 'abc',
    });
  });

  it.each([0, 101, 1.5])('範囲外の limit %s を拒否する', (limit) => {
    expect(paginationQuerySchema.safeParse({ limit }).success).toBe(false);
  });
});
