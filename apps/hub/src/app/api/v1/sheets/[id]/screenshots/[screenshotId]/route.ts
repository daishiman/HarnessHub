/**
 * `GET /api/v1/sheets/{id}/screenshots/{screenshotId}` — 認証済みダウンロード。
 * `DELETE /api/v1/sheets/{id}/screenshots/{screenshotId}` — スクリーンショット削除。
 */
import { createRepositoryContext, EntityNotFoundError } from '@harness-hub/db';
import { problemDetails } from '@harness-hub/schemas';

import {
  findSheetRow,
  resolveSheetResource,
  type SheetParams,
} from '../../../../../../../features/hearing-intake/authz-resource.js';
import { problemResponse } from '../../../../../../../features/hearing-intake/http.js';
import { authRuntime, withAuthz } from '../../../../../../../lib/authz/index.js';
import { hearingShareRuntime } from '../../../../../../../lib/hearing-share/index.js';
import { createSafeImageDownloadResponse } from '../../../../../../../lib/hearing-share/safe-image.js';
import { checkTenantDataRateLimit } from '../../../../../../../lib/tenant-data/index.js';

interface ScreenshotParams extends SheetParams {
  readonly screenshotId: string;
}

export const GET = withAuthz<ScreenshotParams>(
  {
    action: 'sheets.screenshots.read',
    deps: () => authRuntime().authz,
    resolveResource: (request, params, principal) => resolveSheetResource(request, params, principal),
  },
  async (_request, authz, params) => {
    const sheet = await findSheetRow(authz.resource.tenantId, params.id);
    if (sheet === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }

    const limit = checkTenantDataRateLimit(authz.resource.tenantId, authz.principal.userId, 'readContent', Date.now());
    if (limit.rejection !== null) return limit.rejection;

    const runtime = await hearingShareRuntime();
    const context = createRepositoryContext({ tenantId: authz.resource.tenantId });
    const screenshot = await runtime.screenshots.findById(context, params.screenshotId);
    if (screenshot === null || screenshot.sheetId !== params.id) {
      return problemResponse(problemDetails({ title: 'スクリーンショットが見つかりません', status: 404 }));
    }

    try {
      const content = await runtime.screenshots.getContent(context, params.screenshotId);
      const response = createSafeImageDownloadResponse(screenshot.title, screenshot.contentType, content);
      return response ?? problemResponse(problemDetails({ title: 'スクリーンショットが見つかりません', status: 404 }));
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return problemResponse(problemDetails({ title: 'スクリーンショットが見つかりません', status: 404 }));
      }
      throw error;
    }
  },
);

export const DELETE = withAuthz<ScreenshotParams>(
  {
    action: 'sheets.screenshots.delete',
    deps: () => authRuntime().authz,
    resolveResource: (request, params, principal) => resolveSheetResource(request, params, principal),
  },
  async (_request, authz, params) => {
    const sheet = await findSheetRow(authz.resource.tenantId, params.id);
    if (sheet === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }

    // screenshot は tenant-data と同じ保存境界を使うため、削除も既存の delete budget を共有する。
    const limit = checkTenantDataRateLimit(authz.resource.tenantId, authz.principal.userId, 'delete', Date.now());
    if (limit.rejection !== null) return limit.rejection;

    const runtime = await hearingShareRuntime();
    const context = createRepositoryContext({ tenantId: authz.resource.tenantId });
    const screenshot = await runtime.screenshots.findById(context, params.screenshotId);
    if (screenshot === null || screenshot.sheetId !== params.id) {
      return problemResponse(problemDetails({ title: 'スクリーンショットが見つかりません', status: 404 }));
    }

    await runtime.screenshots.deleteScreenshot(context, params.screenshotId);

    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  },
);
