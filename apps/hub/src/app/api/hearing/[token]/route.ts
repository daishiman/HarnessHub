/**
 * `GET /api/hearing/{token}` — トークン付き共有URL方式 (feat-hearing-intake 追加要件、
 * "zip ファイル" 案の代替) の公開エンドポイント。**認証不要**。
 *
 * `withAuthz` は使わない — session を持たない Claude Code / 依頼者が直接叩く前提の設計だから。
 * その代わりここが唯一の境界になる: トークンが無効・期限切れ・失効・存在しないは
 * すべて同じ 404 (`problemResponse` すら使わず素の 404 body) に畳み、資源の存在を伏せる
 * (`scripts/ci/shared-layer-registry.json` の `route_handler_policy.exemptions` へ登録済み)。
 *
 * screenshots は R2 の実 URL を一切含めない — `download_url` はこの app 自身が中継する
 * `/api/hearing/{token}/screenshots/{screenshotId}` を指す (バイト列は常にこの app を経由する)。
 */
import { createRepositoryContext } from '@harness-hub/db';
import { decodeStoredHearingSheetFormSnapshot, hearingSharePayloadSchema } from '@harness-hub/schemas';

import { parseGenerationResult } from '../../../../features/hearing-intake/ai-job-adapter/index.js';
import {
  buildHarnessCreatorHandoff,
  buildSystemOrchestratorHandoff,
} from '../../../../features/hearing-intake/export-adapter/index.js';
import { recordShareTokenAccess, resolveShareToken } from '../../../../features/hearing-intake/public-share.js';
import { readAuthRuntimeEnv } from '../../../../lib/authz/index.js';
import { hearingShareRuntime } from '../../../../lib/hearing-share/index.js';
import {
  checkHearingSharePreResolveRateLimit,
  checkHearingShareRateLimit,
} from '../../../../lib/hearing-share/rate-limit.js';

interface TokenParams {
  readonly token: string;
}

function notFound(): Response {
  // problem+json ではなく素の 404 を返す。「トークンが不正だった」と「JSON parse に失敗した」を
  // 応答形から見分けられるようにしない (existence-hiding を徹底する)。
  return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
}

export async function GET(request: Request, context?: { readonly params: Promise<TokenParams> }): Promise<Response> {
  const params = (await context?.params) ?? { token: '' };

  // token に依存しない上限を **DB read より前** に置く。ここを後ろへ動かすと、無効 token を
  // 投げるだけで DB read を無制限に誘発でき、増幅型 DoS と token 総当たりが両方通る。
  const preResolveLimit = checkHearingSharePreResolveRateLimit(request, Date.now());
  if (preResolveLimit.rejection !== null) return preResolveLimit.rejection;

  const resolved = await resolveShareToken(params.token);
  if (resolved === null) return notFound();

  const { tokenRow, sheet } = resolved;
  const limit = checkHearingShareRateLimit(tokenRow.id, 'payload', Date.now());
  if (limit.rejection !== null) return limit.rejection;

  const runtime = await hearingShareRuntime();
  const dbContext = createRepositoryContext({ tenantId: tokenRow.tenantId });

  const form = decodeStoredHearingSheetFormSnapshot(JSON.parse(sheet.formJson) as unknown);
  const estimate = JSON.parse(sheet.estimateJson) as Record<string, unknown>;
  const generatedSections = parseGenerationResult(sheet.aiJobResultJson)?.generated_sections ?? null;

  const handoffText =
    tokenRow.audience === 'harness_creator'
      ? buildHarnessCreatorHandoff({ formSnapshot: form, generatedSections })
      : buildSystemOrchestratorHandoff({ formSnapshot: form, generatedSections });

  const canonicalOrigin = readAuthRuntimeEnv().canonicalOrigin;
  const screenshotRows = await runtime.screenshots.listBySheetId(dbContext, tokenRow.sheetId);

  await recordShareTokenAccess(tokenRow.id);

  const payload = hearingSharePayloadSchema.parse({
    sheet_code: sheet.code,
    audience: tokenRow.audience,
    form_snapshot: form,
    estimate_snapshot: estimate,
    generated_sections: generatedSections,
    reference_urls: form.referenceUrls,
    screenshots: screenshotRows.map((row) => ({
      id: row.id,
      title: row.title,
      linked_item: row.linkedItem,
      note: row.note,
      download_url: `${canonicalOrigin}/api/hearing/${params.token}/screenshots/${row.id}`,
    })),
    handoff_text: handoffText,
    expires_at: tokenRow.expiresAt,
  });

  return Response.json(payload, { headers: { 'cache-control': 'no-store' } });
}
