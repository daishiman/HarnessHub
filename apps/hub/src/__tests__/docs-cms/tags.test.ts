// DOCS-TAGS-*: タグ入力欄 (カンマ区切り文字列) と wire 契約 (tags: string[] | null) の相互変換。

import { describe, expect, it } from 'vitest';

import { parseTagsInput, tagsToInputValue } from '../../features/docs-cms/tags.js';

describe('parseTagsInput', () => {
  it('DOCS-TAGS-001: カンマ区切りを trim して配列にする', () => {
    expect(parseTagsInput('設計, API ,  運用')).toEqual(['設計', 'API', '運用']);
  });

  it('DOCS-TAGS-002: 連続カンマ・前後の空白・末尾カンマの空要素を除外する', () => {
    expect(parseTagsInput(' 設計,, API, ')).toEqual(['設計', 'API']);
  });

  it('DOCS-TAGS-003: 空文字/空白のみは null (タグ無し) にする', () => {
    expect(parseTagsInput('')).toBeNull();
    expect(parseTagsInput('   ')).toBeNull();
    expect(parseTagsInput(',,,')).toBeNull();
  });
});

describe('tagsToInputValue', () => {
  it('DOCS-TAGS-004: 配列をカンマ区切り文字列へ戻す', () => {
    expect(tagsToInputValue(['設計', 'API'])).toBe('設計, API');
  });

  it('DOCS-TAGS-005: null/undefined は空文字にする', () => {
    expect(tagsToInputValue(null)).toBe('');
    expect(tagsToInputValue(undefined)).toBe('');
  });

  it('DOCS-TAGS-006: parseTagsInput と組み合わせて往復できる (空でない場合)', () => {
    const original = ['設計', 'API', '運用'];
    expect(parseTagsInput(tagsToInputValue(original))).toEqual(original);
  });
});
