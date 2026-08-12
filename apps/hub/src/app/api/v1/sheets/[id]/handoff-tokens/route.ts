/**
 * `POST /api/v1/sheets/{id}/handoff-tokens` — Claude Code 引き渡し用トークン付き共有URLの発行。
 * `GET  /api/v1/sheets/{id}/handoff-tokens` — 発行済み一覧 (トークン平文は含まない)。
 *
 * トークン本体は SHA-256 ハッシュのみ DB に残す。平文が現れるのはこの発行応答だけ
 * (`packages/db/repository/hearing-share-tokens.ts` の CAS/検証方針を踏襲)。
 */
import { createRepositoryContext } from '@harness-hub/db';
import {
  hearingShareTokenListItemSchema,
  issueHearingShareTokenRequestSchema,
  issueHearingShareTokenResponseSchema,
  problemDetails,
} from '@harness-hub/schemas';

import {
  findSheetRow,
  resolveSheetResource,
  type SheetParams,
} from '../../../../../../features/hearing-intake/authz-resource.js';
import {
  buildHarnessCreatorHandoffInstruction,
  buildSystemOrchestratorHandoffInstruction,
} from '../../../../../../features/hearing-intake/export-adapter/index.js';
import { parseJsonRequest, problemResponse } from '../../../../../../features/hearing-intake/http.js';
import { generateOpaqueToken } from '../../../../../../lib/auth/device-flow/codes.js';
import { sha256Hex } from '../../../../../../lib/auth/jwt.js';
import { authRuntime, readAuthRuntimeEnv, withAuthz } from '../../../../../../lib/authz/index.js';
import { hearingShareRuntime } from '../../../../../../lib/hearing-share/index.js';

/**
 * 共有URLの有効期間。依頼者要件に明示値が無いため、Claude Code へ渡してすぐ使い切る
 * 想定の運用に合わせた判断値 (7日) — device flow の user_code (数分オーダー) より長く、
 * publisher token (無期限運用) より短く取る。
 */
const SHARE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

export const POST = withAuthz<SheetParams>(
  {
    action: 'sheets.handoff_tokens.issue',
    deps: () => authRuntime().authz,
    resolveResource: resolveSheetResource,
  },
  async (request, authz, params) => {
    const sheet = await findSheetRow(authz.resource.tenantId, params.id);
    if (sheet === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }

    const parsed = await parseJsonRequest(request, issueHearingShareTokenRequestSchema);
    if (!parsed.ok) return parsed.response;

    const runtime = await hearingShareRuntime();
    const context = createRepositoryContext({
      tenantId: authz.resource.tenantId,
      workspaceId: sheet.workspaceId,
      actorId: authz.principal.userId,
    });

    const plaintextToken = generateOpaqueToken();
    const tokenHash = await sha256Hex(plaintextToken);
    const expiresAt = Date.now() + SHARE_TOKEN_TTL_MS;

    const row = await runtime.shareTokens.create(context, {
      id: crypto.randomUUID(),
      workspaceId: sheet.workspaceId,
      sheetId: params.id,
      audience: parsed.data.audience,
      tokenHash,
      expiresAt,
      createdByUserId: authz.principal.userId,
    });

    const canonicalOrigin = readAuthRuntimeEnv().canonicalOrigin;
    const shareUrl = `${canonicalOrigin}/api/hearing/${plaintextToken}`;
    const instructionText =
      parsed.data.audience === 'harness_creator'
        ? buildHarnessCreatorHandoffInstruction({ shareUrl })
        : buildSystemOrchestratorHandoffInstruction({ shareUrl });

    await authRuntime().authz.audit.record({
      actorSubject: authz.principal.userId,
      tenantId: authz.resource.tenantId,
      workspaceId: sheet.workspaceId,
      action: 'hearing_share_token.issued',
      resourceType: 'hearing_sheet',
      resourceId: params.id,
      metadata: { token_id: row.id, audience: row.audience, credential: authz.principal.credential },
    });

    return Response.json(
      issueHearingShareTokenResponseSchema.parse({
        id: row.id,
        token: plaintextToken,
        url: shareUrl,
        instruction_text: instructionText,
        audience: row.audience,
        expires_at: row.expiresAt,
      }),
      { status: 201, headers: { 'cache-control': 'no-store' } },
    );
  },
);

export const GET = withAuthz<SheetParams>(
  {
    action: 'sheets.handoff_tokens.read',
    deps: () => authRuntime().authz,
    resolveResource: resolveSheetResource,
  },
  async (_request, authz, params) => {
    const sheet = await findSheetRow(authz.resource.tenantId, params.id);
    if (sheet === null) {
      return problemResponse(problemDetails({ title: 'シートが見つかりません', status: 404 }));
    }

    const runtime = await hearingShareRuntime();
    const context = createRepositoryContext({ tenantId: authz.resource.tenantId });
    const rows = await runtime.shareTokens.listBySheetId(context, params.id);

    return Response.json(
      {
        items: rows.map((row) =>
          hearingShareTokenListItemSchema.parse({
            id: row.id,
            audience: row.audience,
            expires_at: row.expiresAt,
            revoked_at: row.revokedAt,
            last_accessed_at: row.lastAccessedAt,
            access_count: row.accessCount,
            created_at: row.createdAt,
          }),
        ),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  },
);
