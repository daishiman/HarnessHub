/**
 * `GET /api/hearing/{token}/screenshots/{screenshotId}` — 公開・トークンスコープの
 * スクリーンショット本体中継。**認証不要**。R2/署名付きURLを一切外へ出さず、常にこの app が
 * 復号済みバイト列を中継する (`packages/db/repository/tenant-data.ts` の暗号化を透過的に隠す)。
 *
 * screenshot の `sheetId` がトークンの `sheetId` と一致することを必ず検査する
 * (screenshotId を総当たりされても他 sheet の画像を読めないようにする)。
 */
import { createRepositoryContext, EntityNotFoundError } from '@harness-hub/db';

import { recordShareTokenAccess, resolveShareToken } from '../../../../../../features/hearing-intake/public-share.js';
import { hearingShareRuntime } from '../../../../../../lib/hearing-share/index.js';
import { checkHearingShareRateLimit } from '../../../../../../lib/hearing-share/rate-limit.js';
import { createSafeAttachmentDownloadResponse } from '../../../../../../lib/hearing-share/safe-attachment.js';

interface ScreenshotTokenParams {
  readonly token: string;
  readonly screenshotId: string;
}

function notFound(): Response {
  return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
}

export async function GET(
  _request: Request,
  context?: { readonly params: Promise<ScreenshotTokenParams> },
): Promise<Response> {
  const params = (await context?.params) ?? { token: '', screenshotId: '' };
  const resolved = await resolveShareToken(params.token);
  if (resolved === null) return notFound();

  const { tokenRow } = resolved;
  // token 検証より後に置き、無効 token は rate-limit oracle にせず従来どおり 404 に畳む。
  const limit = checkHearingShareRateLimit(tokenRow.id, 'screenshot', Date.now());
  if (limit.rejection !== null) return limit.rejection;

  const runtime = await hearingShareRuntime();
  const dbContext = createRepositoryContext({ tenantId: tokenRow.tenantId });

  const screenshot = await runtime.screenshots.findById(dbContext, params.screenshotId);
  if (screenshot === null || screenshot.sheetId !== tokenRow.sheetId) return notFound();

  try {
    const content = await runtime.screenshots.getContent(dbContext, params.screenshotId);
    // upload 境界を通らずに残った旧データや手動投入も、公開応答で再検査して fail-closed にする。
    const response = createSafeAttachmentDownloadResponse(screenshot.title, screenshot.contentType, content);
    if (response === null) return notFound();

    await recordShareTokenAccess(tokenRow.id);
    return response;
  } catch (error) {
    if (error instanceof EntityNotFoundError) return notFound();
    throw error;
  }
}
