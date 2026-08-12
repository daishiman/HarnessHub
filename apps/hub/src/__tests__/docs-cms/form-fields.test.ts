import { describe, expect, it } from 'vitest';

import {
  parsePublishAtInput,
  parseTagsInput,
  publishAtToInput,
  tagsToInput,
} from '../../features/docs-cms/form-fields.js';

describe('DOCS-FORM: ブログ項目の入力変換', () => {
  it('DOCS-FORM-001: タグはtrimし空要素を除き、表示値へ戻せる', () => {
    expect(parseTagsInput(' 設計, API, ,運用 ')).toEqual(['設計', 'API', '運用']);
    expect(tagsToInput(['設計', 'API'])).toBe('設計, API');
    expect(tagsToInput(null)).toBe('');
  });

  it('DOCS-FORM-002: 空欄だけを予約解除として扱う', () => {
    expect(parsePublishAtInput('  ', 100)).toEqual({ ok: true, value: null });
  });

  it('DOCS-FORM-003: 不正値と過去日時は予約解除へ潰さず理由を返す', () => {
    expect(parsePublishAtInput('not-a-date', 100)).toMatchObject({ ok: false });
    expect(parsePublishAtInput('2026-01-01T00:00', Date.parse('2026-01-02T00:00'))).toEqual({
      ok: false,
      message: '予約公開日時には、現在より後の日時を指定してください。',
    });
  });

  it('DOCS-FORM-004: 未来のローカル日時をepoch msへ変換し入力値へ戻せる', () => {
    const input = '2030-04-05T12:34';
    const parsed = parsePublishAtInput(input, Date.parse('2030-04-05T12:33'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.value === null) throw new Error('未来日時の変換に失敗しました');
    expect(publishAtToInput(parsed.value)).toBe(input);
  });
});
