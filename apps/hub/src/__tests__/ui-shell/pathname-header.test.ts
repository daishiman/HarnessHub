/**
 * UIS-MW-*: middleware が Server Component へ現在の pathname を渡す配線。
 *
 * 「header を足した」だけでは足りない。認可判定より **後** で足していること (判定へ影響しない) と、
 * 外部から同名 header を送られても実際の pathname で必ず上書きされることを固定する。
 * ここが崩れると、細工した header でサイドバーの現在地表示を偽装できてしまう。
 */
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { PATHNAME_HEADER } from '../../lib/routing/pathname-header.js';

const { middleware } = await import('../../middleware.js');

/** `/legal` は PUBLIC_PATH_PREFIXES に含まれるため、認証なしで通過する経路として使える。 */
function requestFor(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(`https://hub.example.com${pathname}`), { headers: new Headers(headers) });
}

describe('UIS-MW: pathname header の伝播', () => {
  it('UIS-MW-001: 通過した要求には実際の pathname が付く', async () => {
    const response = await middleware(requestFor('/legal'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-override-headers')).toContain(PATHNAME_HEADER);
  });

  it('UIS-MW-002: 外部から同名 header を送られても実際の pathname で上書きされる', async () => {
    const response = await middleware(requestFor('/legal', { [PATHNAME_HEADER]: '/settings/auth' }));

    // NextResponse.next({request:{headers}}) は上書き後の値を x-middleware-request-* へ写す
    expect(response.headers.get(`x-middleware-request-${PATHNAME_HEADER}`)).toBe('/legal');
  });

  it('UIS-MW-003: 拒否された要求には header を付けない (認可判定より後で足している証拠)', async () => {
    // 認証情報の無い保護 path は 401/403 で畳まれ、NextResponse.next() 経路へ入らない
    const response = await middleware(requestFor('/sheets'));

    expect(response.status).not.toBe(200);
    expect(response.headers.get('x-middleware-override-headers')).toBeNull();
  });
});
