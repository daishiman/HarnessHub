import { describe, expect, it } from 'vitest';

import { canWriteDocument, extractErrorMessage } from '../../features/docs-cms/client-errors.js';

describe('DOCS-CLIENT-ERROR: 権限導線とproblem+json表示', () => {
  it('DOCS-CLIENT-ERROR-001: tenant/commonの編集導線をrole別にfail-closedで判定する', () => {
    expect(canWriteDocument(null, 'tenant')).toBe(false);
    expect(canWriteDocument('member', 'tenant')).toBe(false);
    expect(canWriteDocument('workspace-admin', 'tenant')).toBe(true);
    expect(canWriteDocument('workspace-admin', 'common')).toBe(false);
    expect(canWriteDocument('provider-admin', 'common')).toBe(true);
  });

  it('DOCS-CLIENT-ERROR-002: problem errorsの具体的な検証理由を表示する', async () => {
    const response = Response.json(
      {
        type: 'about:blank',
        title: '入力内容を確認してください',
        detail: 'リクエストに問題があります',
        status: 422,
        errors: [{ field: 'publish_at', code: 'custom', message: '現在より未来の日時を指定してください' }],
      },
      { status: 422, headers: { 'content-type': 'application/problem+json' } },
    );

    await expect(extractErrorMessage(response, '保存できませんでした。')).resolves.toBe(
      '現在より未来の日時を指定してください',
    );
  });

  it('DOCS-CLIENT-ERROR-003: JSONでない応答はfallbackへ戻す', async () => {
    const response = new Response('gateway error', { status: 502 });
    await expect(extractErrorMessage(response, '保存できませんでした。')).resolves.toBe('保存できませんでした。');
  });
});
