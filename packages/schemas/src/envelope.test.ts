/** 共通エンベロープ (cursor ページング / RFC 9457) 公開 API の単体テスト。 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  fieldErrorSchema,
  PROBLEM_JSON_MEDIA_TYPE,
  paginatedSchema,
  parseRequest,
  problemDetails,
  problemDetailsFromZodError,
  problemDetailsSchema,
} from './index.js';

describe('PROBLEM_JSON_MEDIA_TYPE', () => {
  it('RFC 9457 の media type を公開する', () => {
    expect(PROBLEM_JSON_MEDIA_TYPE).toBe('application/problem+json');
  });
});

describe('paginatedSchema', () => {
  const schema = paginatedSchema(z.object({ id: z.string() }));

  it('items と next_cursor を検証する', () => {
    expect(schema.parse({ items: [{ id: 'a' }], next_cursor: 'abc' })).toEqual({
      items: [{ id: 'a' }],
      next_cursor: 'abc',
    });
  });

  it('終端は next_cursor = null で表す', () => {
    expect(schema.parse({ items: [], next_cursor: null }).next_cursor).toBeNull();
  });

  it('item schema に合わない要素を拒否する', () => {
    expect(schema.safeParse({ items: [{ id: 1 }], next_cursor: null }).success).toBe(false);
  });

  it('next_cursor の欠落を拒否する (終端かどうかを曖昧にしない)', () => {
    expect(schema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe('fieldErrorSchema', () => {
  it('field / code / message の 3 点を要求する', () => {
    expect(fieldErrorSchema.parse({ field: 'title', code: 'too_small', message: '必須です' })).toEqual({
      field: 'title',
      code: 'too_small',
      message: '必須です',
    });
    expect(fieldErrorSchema.safeParse({ field: 'title', code: '', message: 'x' }).success).toBe(false);
  });
});

describe('problemDetailsSchema', () => {
  it('type 未指定なら about:blank を既定にする', () => {
    expect(problemDetailsSchema.parse({ title: 'エラー', status: 500 }).type).toBe('about:blank');
  });

  it('4xx/5xx 以外の status を拒否する', () => {
    expect(problemDetailsSchema.safeParse({ title: 'エラー', status: 200 }).success).toBe(false);
  });
});

describe('problemDetails', () => {
  it('指定した値を保持したまま組み立てる', () => {
    const problem = problemDetails({
      title: '権限がありません',
      status: 403,
      detail: '管理者に権限の付与を依頼してください',
      instance: '/api/v1/users',
    });

    expect(problem).toEqual({
      type: 'about:blank',
      title: '権限がありません',
      status: 403,
      detail: '管理者に権限の付与を依頼してください',
      instance: '/api/v1/users',
    });
  });
});

describe('problemDetailsFromZodError', () => {
  const schema = z.object({ title: z.string().min(1), people: z.number().int() });

  it('zod の issue をフィールド単位の errors[] へ写像する', () => {
    const result = schema.safeParse({ title: '', people: 1.5 });
    expect(result.success).toBe(false);
    if (result.success) return;

    const problem = problemDetailsFromZodError(result.error, { instance: '/api/v1/sheets' });

    expect(problem.status).toBe(422);
    expect(problem.instance).toBe('/api/v1/sheets');
    expect(problem.errors?.map((error) => error.field).sort()).toEqual(['people', 'title']);
    for (const error of problem.errors ?? []) {
      expect(error.code.length).toBeGreaterThan(0);
      expect(error.message.length).toBeGreaterThan(0);
    }
  });

  it('ネストした path をドット区切りで表す', () => {
    const nested = z.object({ items: z.array(z.object({ id: z.string() })) });
    const result = nested.safeParse({ items: [{ id: 1 }] });
    if (result.success) throw new Error('検証が失敗するはずのケースです');

    expect(problemDetailsFromZodError(result.error).errors?.[0]?.field).toBe('items.0.id');
  });

  it('title / status を上書きできる', () => {
    const result = schema.safeParse({});
    if (result.success) throw new Error('検証が失敗するはずのケースです');

    const problem = problemDetailsFromZodError(result.error, { title: '不正な要求', status: 400 });
    expect(problem.title).toBe('不正な要求');
    expect(problem.status).toBe(400);
  });
});

describe('parseRequest', () => {
  const schema = z.object({ title: z.string().min(1) });

  it('成功時は data を返す', () => {
    const outcome = parseRequest(schema, { title: 'ok' });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.data.title).toBe('ok');
  });

  it('失敗時は problem details を返す (例外を投げない)', () => {
    const outcome = parseRequest(schema, { title: '' }, { instance: '/api/v1/docs' });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.problem.status).toBe(422);
    expect(outcome.problem.instance).toBe('/api/v1/docs');
    expect(outcome.problem.errors).toHaveLength(1);
  });
});
