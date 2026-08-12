// DOCS-APIERR-*: problem+json 応答から利用者向けエラーメッセージを組み立てる処理。
// 従来はフロントが !response.ok を一律固定文言に潰しており、zod のフィールドエラーや
// 403 の権限不足理由が画面から分からなかった (作成エラー/画像アップロードエラーの調査対象)。

import { describe, expect, it } from 'vitest';

import { extractApiErrorMessage, problemDetailsToMessage } from '../../features/docs-cms/api-error.js';

describe('problemDetailsToMessage', () => {
  it('DOCS-APIERR-001: title のみなら title を返す', () => {
    expect(problemDetailsToMessage({ title: '入力内容を確認してください', status: 422 }, 'fallback')).toBe(
      '入力内容を確認してください',
    );
  });

  it('DOCS-APIERR-002: title + detail を連結する', () => {
    expect(
      problemDetailsToMessage(
        { title: '入力内容を確認してください', detail: 'タイトルは必須です。', status: 422 },
        'fallback',
      ),
    ).toBe('入力内容を確認してください: タイトルは必須です。');
  });

  it('DOCS-APIERR-003: errors[].message をフィールドエラーとして連結する', () => {
    expect(
      problemDetailsToMessage(
        {
          title: '入力内容を確認してください',
          status: 422,
          errors: [
            { field: 'title', code: 'too_small', message: 'タイトルは1文字以上で入力してください。' },
            { field: 'body_markdown', code: 'too_big', message: '本文が長すぎます。' },
          ],
        },
        'fallback',
      ),
    ).toBe('入力内容を確認してください: タイトルは1文字以上で入力してください。 / 本文が長すぎます。');
  });

  it('DOCS-APIERR-004: 403 権限不足のような title のみの応答でも読める文言になる', () => {
    expect(problemDetailsToMessage({ title: '権限が不足しています', status: 403 }, 'fallback')).toBe(
      '権限が不足しています',
    );
  });

  it('DOCS-APIERR-005: 空オブジェクト/壊れた形は fallback にする', () => {
    expect(problemDetailsToMessage({}, 'fallback')).toBe('fallback');
    expect(problemDetailsToMessage(null, 'fallback')).toBe('fallback');
    expect(problemDetailsToMessage('unexpected string body', 'fallback')).toBe('fallback');
    expect(problemDetailsToMessage({ title: '' }, 'fallback')).toBe('fallback');
  });

  it('DOCS-APIERR-006: errors が空配列/不正要素だけなら title に留める', () => {
    expect(problemDetailsToMessage({ title: 'エラー', errors: [] }, 'fallback')).toBe('エラー');
    expect(problemDetailsToMessage({ title: 'エラー', errors: [{ field: 'x' }] }, 'fallback')).toBe('エラー');
  });
});

describe('extractApiErrorMessage', () => {
  it('DOCS-APIERR-007: Response の JSON 本文から problem details を読み取る', async () => {
    const response = new Response(JSON.stringify({ title: '権限が不足しています', status: 403 }), {
      status: 403,
      headers: { 'content-type': 'application/problem+json' },
    });
    await expect(extractApiErrorMessage(response, 'fallback')).resolves.toBe('権限が不足しています');
  });

  it('DOCS-APIERR-008: JSON として読めない本文は fallback を返す', async () => {
    const response = new Response('<html>500</html>', { status: 500 });
    await expect(extractApiErrorMessage(response, 'fallback')).resolves.toBe('fallback');
  });
});
