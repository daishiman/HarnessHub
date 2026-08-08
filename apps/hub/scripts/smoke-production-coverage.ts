#!/usr/bin/env node
/**
 * 本番 smoke の未カバー領域を塞ぐ実行手順 (HarnessHub-p0lr)。
 *
 * 既存の本番 smoke は OIDC 入口 (smoke-production-oidc.mjs)、配信 (smoke-production-publish.ts)、
 * hearing-intake E2E (smoke-production-hearing.ts) の 3 本だった。残っていた穴は 3 つ:
 *   1. **サインイン後の scope 判定** — 認可の拒否理由 6 種が本番でどの status/コードになるか
 *      を誰も測っていなかった。特に `tenant_mismatch` は route 層 (403) と middleware 層 (404) で
 *      対応表が食い違った実績があり、単体テストでは middleware 側が到達不能で緑のまま素通りする。
 *   2. **Feedback Loop** — 投稿 → AI queue → 応答書戻し → 状態遷移が本番で通っていない。
 *   3. **Docs CMS** — 作成 → AI 下書き queue → 本文書戻し → tenant 越境不可視が本番で通っていない。
 *
 * **新しい secret を足さないことが設計制約** (hearing smoke と同じ)。その帰結として経路が 2 系統に割れる:
 *   - `credential: TOKEN` / `EITHER` の action は Device Flow で得た**本物の access token** で
 *     本番 Worker の HTTP を通す。scope 別の拒否もここで実測できる。
 *   - `credential: SESSION` の action (feedback.read / docs.*) は Google OIDC 無しでは HTTP で
 *     駆動できない。route と同じ server code (service / repository) を本番 DB へ実行して再現し、
 *     HTTP 側では「Bearer では通らない」ことだけを確認する。
 *
 * 使い捨て tenant を 2 つ本番へ作り、検査後に全行を削除する。残数が 0 でなければ失敗させる。
 */

import {
  createDocsCmsRepository,
  createFeedbackRepository,
  createHearingSmokeDbProbe,
  createRepositoryContext,
  createTursoClient,
} from '@harness-hub/db';

import { buildDocDraftPayload } from '../src/features/docs-cms/ai-job-adapter/index.js';
import { createFeedbackLoopService } from '../src/features/feedback-loop/service.js';
import {
  acquireDeviceToken,
  apiClient,
  assert,
  type DeviceApprover,
  errorCode,
  expectObject,
  expectString,
  FEEDBACK_SCOPE,
  loadConfig,
} from './smoke-production-hearing-support.js';

const HELP = `Usage:
  pnpm --filter @harness-hub/hub run smoke:coverage-production

Required environment:
  HUB_PUBLIC_URL           production Hub origin (for example https://harness-hub.example.workers.dev)
  TURSO_DATABASE_URL       production libSQL URL
  TURSO_AUTH_TOKEN         production libSQL auth token

Optional environment:
  HUB_SMOKE_ORIGIN         Origin header value. default: origin of HUB_PUBLIC_URL.

The command creates two disposable tenants and checks, against production:
  S1-S8  post-signin scope denials (unauthenticated / missing_tenant_scope / ambiguous_scope /
         tenant_mismatch / workspace_not_member / credential_not_allowed / missing_scope)
         and where a provider-admin cross-tenant request is actually stopped (edge vs route)
  F1-F5  feedback loop (create -> queue -> AI writeback -> status transition)
  D1-D6  docs CMS (create -> draft queue -> body writeback -> cross-tenant invisibility)
Both tenants and every row they created are deleted before the process exits.
`;

const FEEDBACK_BODY = 'P13 本番 smoke: 週次レポートの整形を自動化したい。手作業の転記が毎週発生している。';
const AI_RESPONSE = 'P13 本番 smoke が書き戻した AI 応答。転記の自動化案を 3 つ提示する。';
const DOC_TITLE = 'P13 本番 smoke の運用メモ';
const DOC_BODY_INITIAL = '初期本文。AI 下書きで置き換わることを確認する。';
const DOC_BODY_FROM_AI = '# AI 下書き\n\nP13 本番 smoke が書き戻した本文。';

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }

  const config = loadConfig();
  const adapter = createTursoClient({ url: config.databaseUrl, authToken: config.databaseToken });
  const probe = createHearingSmokeDbProbe(adapter);
  // route と同じ合成。通知 port は既定の no-op を使う — smoke が本番から外部通知を出さないため。
  const feedback = createFeedbackLoopService(createFeedbackRepository(adapter));
  const docs = createDocsCmsRepository(adapter);
  const api = apiClient(config);

  const tenantIds: string[] = [];
  let runError: unknown;
  const cleanupErrors: string[] = [];
  const observed: Record<string, unknown> = {};

  try {
    // ---- 準備: 使い捨て tenant 2 件と、本番 Worker が署名した access token 3 本。
    const primary = await probe.createTenantFixture({
      slug: `cv-smoke-a-${config.suffix}`,
      memberIdpSubject: `cv-member-a-${config.suffix}`,
      workerIdpSubject: `cv-worker-a-${config.suffix}`,
      // S8 (provider-admin の越境がどの層で止まるか) の観測に要る。
      providerAdminIdpSubject: `cv-provider-a-${config.suffix}`,
    });
    tenantIds.push(primary.tenantId);
    const other = await probe.createTenantFixture({
      slug: `cv-smoke-b-${config.suffix}`,
      memberIdpSubject: `cv-member-b-${config.suffix}`,
      workerIdpSubject: `cv-worker-b-${config.suffix}`,
    });
    tenantIds.push(other.tenantId);

    const approve: DeviceApprover = (input) => probe.approveDeviceAuthorization(input);
    const queueGrant = await acquireDeviceToken(api, approve, {
      tenantSlug: primary.tenantSlug,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
      userId: primary.workerUserId,
      label: 'cv-worker-a',
    });
    // `feedback.create` は `feedback:write` を要求する。queue token と分けることで、
    // 「scope が足りない token は本番で本当に落ちる」(S7) を token 差だけで観測できる。
    const feedbackGrant = await acquireDeviceToken(api, approve, {
      tenantSlug: primary.tenantSlug,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
      userId: primary.memberUserId,
      label: 'cv-feedback-a',
      scopes: [FEEDBACK_SCOPE],
    });
    const otherGrant = await acquireDeviceToken(api, approve, {
      tenantSlug: other.tenantSlug,
      tenantId: other.tenantId,
      workspaceId: other.workspaceId,
      userId: other.workerUserId,
      label: 'cv-worker-b',
    });
    assert(primary.providerAdminUserId !== null, '準備: provider-admin fixture が作られていません');
    const providerAdminGrant = await acquireDeviceToken(api, approve, {
      tenantSlug: primary.tenantSlug,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
      userId: primary.providerAdminUserId,
      label: 'cv-provider-a',
    });
    observed.setup = {
      tenants: 2,
      scopes: { queue: queueGrant.claims.scope, feedback: feedbackGrant.claims.scope },
      roles: [queueGrant.claims.role, feedbackGrant.claims.role, otherGrant.claims.role],
    };

    // ---- S1: 資格情報なし。非 public path は deny-by-default で 401。
    const anonymous = await api({ method: 'GET', path: '/api/v1/feedback', expected: 401 });
    assert(
      errorCode(anonymous.body) === 'unauthenticated',
      `S1: 未認証要求が unauthenticated で拒否されません (${JSON.stringify(anonymous.body)})`,
    );

    // ---- S2: tenant を申告しない要求。「申告なし＝自テナント」に倒れていないことを見る。
    const noTenant = await api({
      method: 'GET',
      path: '/api/v1/feedback',
      expected: 403,
      token: queueGrant.accessToken,
    });
    assert(
      errorCode(noTenant.body) === 'missing_tenant_scope',
      `S2: tenant 無申告が missing_tenant_scope で拒否されません (${JSON.stringify(noTenant.body)})`,
    );

    // ---- S3: path scope と header scope の二重申告が食い違う要求。
    // `/t/{tenantId}/w/{workspaceId}/...` は middleware が path から scope を読む形。
    // どちらが正かを推測せず ambiguous_scope へ倒すことを本番で確認する。
    const ambiguous = await api({
      method: 'GET',
      path: `/t/${primary.tenantId}/w/${primary.workspaceId}/probe`,
      expected: 403,
      token: queueGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: other.workspaceId,
    });
    assert(
      errorCode(ambiguous.body) === 'ambiguous_scope',
      `S3: path と header の食い違いが ambiguous_scope で拒否されません (${JSON.stringify(ambiguous.body)})`,
    );

    // ---- S4: 他 tenant を騙る要求。存在秘匿 (T-ISO-06) により 403 ではなく **404**。
    // ここが 403 に戻ると「その ID の資源が他テナントに在る」ことが応答から読み取れてしまう。
    const crossTenant = await api({
      method: 'GET',
      path: '/api/v1/feedback',
      expected: 404,
      token: otherGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(
      errorCode(crossTenant.body) === 'tenant_mismatch',
      `S4: 他 tenant 要求が tenant_mismatch で拒否されません (${JSON.stringify(crossTenant.body)})`,
    );

    // ---- S5: tenant は自分のものだが、所属していない workspace を指す要求。
    // 他 tenant の workspace id を借りて「tenant 一致・workspace 非所属」だけを作る。
    const foreignWorkspace = await api({
      method: 'GET',
      path: '/api/v1/feedback',
      expected: 403,
      token: queueGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: other.workspaceId,
    });
    assert(
      errorCode(foreignWorkspace.body) === 'workspace_not_member',
      `S5: 非所属 workspace が workspace_not_member で拒否されません (${JSON.stringify(foreignWorkspace.body)})`,
    );

    // ---- S6: `feedback.read` は session-only。scope も role も足りている Bearer でも通らない。
    const bearerRead = await api({
      method: 'GET',
      path: '/api/v1/feedback',
      expected: 403,
      token: feedbackGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(
      errorCode(bearerRead.body) === 'credential_not_allowed',
      `S6: feedback.read が session-only 契約を守りません (${JSON.stringify(bearerRead.body)})`,
    );

    // ---- S7: scope 不足。queue token (aijob:process のみ) では feedback を投稿できない。
    const wrongScope = await api({
      method: 'POST',
      path: '/api/v1/feedback',
      expected: 403,
      json: { project_id: `p-${config.suffix}`, type: 'improvement', priority: 'medium', body: FEEDBACK_BODY },
      token: queueGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(
      errorCode(wrongScope.body) === 'missing_scope',
      `S7: scope 不足の投稿が missing_scope で拒否されません (${JSON.stringify(wrongScope.body)})`,
    );

    /*
     * ---- S8: provider-admin の越境が**どの層で**止まるかの実測。
     *
     * route 層 (`withAuthz`) は provider-admin の越境を許可し `provider.cross_tenant_access` を
     * 監査する契約になっている (FL-SEC8-102)。しかし edge middleware の `authorize()` は role を
     * 見ずに `scope.tenantId !== principal.tenantId` を 404 で落とすため、本番では route 層へ
     * 到達しない。status だけでは「越境を拒否した」としか読めないので、監査行の件数で到達点を測る。
     *
     * ここでは現行挙動を固定するだけで、認可判定そのものは変更しない (本課題の scope_out)。
     * 「route 層の越境監査が本番で到達不能」という設計判断は別課題へ送る。
     */
    const providerCross = await api({
      method: 'POST',
      path: '/api/v1/ai-jobs/pull',
      expected: 404,
      json: { kind: 'feedback_response' },
      token: providerAdminGrant.accessToken,
      tenantId: other.tenantId,
      workspaceId: other.workspaceId,
    });
    assert(
      errorCode(providerCross.body) === 'tenant_mismatch',
      `S8: provider-admin の越境が tenant_mismatch で拒否されません (${JSON.stringify(providerCross.body)})`,
    );
    const crossTenantAudits = await probe.countCrossTenantAuditEvents(other.tenantId);
    assert(
      crossTenantAudits === 0,
      `S8: edge で止まったはずの越境要求が provider.cross_tenant_access を ${crossTenantAudits} 件残しました。` +
        'route 層まで到達したなら、この smoke の前提 (edge 遮断) が変わっているので設計判断をやり直すこと。',
    );

    observed.scope_denials = {
      S1_unauthenticated: anonymous.status,
      S2_missing_tenant_scope: noTenant.status,
      S3_ambiguous_scope: ambiguous.status,
      // 403 ではなく 404 であることが検査の要点なので、値を成果物へ残す。
      S4_tenant_mismatch: crossTenant.status,
      S5_workspace_not_member: foreignWorkspace.status,
      S6_credential_not_allowed: bearerRead.status,
      S7_missing_scope: wrongScope.status,
      S8_provider_admin_cross_tenant: providerCross.status,
      S8_cross_tenant_audit_rows: crossTenantAudits,
    };

    const primaryContext = createRepositoryContext({
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
      actorId: primary.memberUserId,
    });
    const projectId = `p-${config.suffix}`;

    // ---- F1: Harness (Bearer) からの投稿。source は申告ではなく principal から導出される (B6)。
    const created = await api({
      method: 'POST',
      path: '/api/v1/feedback',
      expected: 201,
      json: { project_id: projectId, type: 'improvement', priority: 'medium', body: FEEDBACK_BODY },
      token: feedbackGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    const feedbackId = expectString(created.body.id, 'F1 feedback id');
    const feedbackCode = expectString(created.body.code, 'F1 feedback code');
    assert(/^FR-\d{4,}$/.test(feedbackCode), `F1: 受付番号が FR-xxxx 形式ではありません (${feedbackCode})`);
    assert(created.body.status === 'open', `F1: 投稿直後の status が open ではありません (${created.body.status})`);

    // ---- F2: session-only の読み取り経路を route と同じ service で再現する。
    const detail = await feedback.getFeedback({ context: primaryContext, id: feedbackId });
    assert(detail !== null, 'F2: 投稿した feedback を読み出せません');
    assert(detail.source === 'harness', `F2: Bearer 投稿の source が harness ではありません (${detail.source})`);
    assert(detail.ai_job_id !== null, 'F2: 同一 transaction で enqueue された ai_job がありません');
    assert(detail.ai_response === null, 'F2: AI 応答が投稿直後に入っています');
    observed.F = { code: feedbackCode, source: detail.source, ai_job_id: detail.ai_job_id };

    // ---- F3: 本番 HTTP で feedback_response job を pull。
    const pulledFeedbackJob = await api({
      method: 'POST',
      path: '/api/v1/ai-jobs/pull',
      expected: 200,
      json: { kind: 'feedback_response' },
      token: queueGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(pulledFeedbackJob.body.id === detail.ai_job_id, 'F3: pull で返った job が投稿した job ではありません');
    const feedbackPayload = expectObject(pulledFeedbackJob.body.payload, 'F3 payload');
    assert(feedbackPayload.feedback_code === feedbackCode, 'F3: payload の feedback_code が受付番号と一致しません');
    assert(feedbackPayload.body === FEEDBACK_BODY, 'F3: payload の body が投稿内容と一致しません');

    // ---- F4: complete で AI 応答が書き戻る。status は AI が動かさない (SEC8-103)。
    const completedFeedbackJob = await api({
      method: 'POST',
      path: `/api/v1/ai-jobs/${detail.ai_job_id}/complete`,
      expected: 200,
      json: { ai_response: AI_RESPONSE },
      token: queueGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(
      completedFeedbackJob.body.status === 'completed',
      'F4: complete 後の job status が completed ではありません',
    );
    const afterAi = await feedback.getFeedback({ context: primaryContext, id: feedbackId });
    assert(afterAi?.ai_response === AI_RESPONSE, 'F4: AI 応答が feedback へ書き戻っていません');
    assert(afterAi.status === 'open', `F4: AI 完了が feedback の status を動かしました (${afterAi.status})`);

    // ---- F5: 状態遷移 open -> in_progress -> resolved (session-only 経路を service で再現)。
    await feedback.updateFeedbackStatus({ context: primaryContext, id: feedbackId, status: 'in_progress' });
    const resolved = await feedback.updateFeedbackStatus({
      context: primaryContext,
      id: feedbackId,
      status: 'resolved',
    });
    assert(resolved.status === 'resolved', `F5: 状態遷移後の status が resolved ではありません (${resolved.status})`);
    observed.F = {
      ...(observed.F as Record<string, unknown>),
      ai_response_written_back: true,
      status_after_ai: afterAi.status,
      final_status: resolved.status,
    };

    // ---- D1: Docs CMS の作成 (session-only なので route と同じ repository を通す)。
    const tenantContext = createRepositoryContext({ tenantId: primary.tenantId, actorId: primary.memberUserId });
    const document = await docs.createDocument(tenantContext, {
      scope: 'tenant',
      title: DOC_TITLE,
      bodyMarkdown: DOC_BODY_INITIAL,
      actorId: primary.memberUserId,
    });
    assert(document.status === 'draft', `D1: 作成直後の status が draft ではありません (${document.status})`);

    // ---- D2: AI 下書きの enqueue。route と同じ payload builder を使う。
    await docs.enqueueDocDraft(
      tenantContext,
      document.id,
      primary.workspaceId,
      JSON.stringify(
        buildDocDraftPayload({ documentId: document.id, title: document.title, outline: ['目的', '手順'] }),
      ),
    );

    // ---- D3: 本番 HTTP で doc_draft job を pull。kind が違えば同じ queue でも混ざらない。
    const pulledDocJob = await api({
      method: 'POST',
      path: '/api/v1/ai-jobs/pull',
      expected: 200,
      json: { kind: 'doc_draft' },
      token: queueGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    const docJobId = expectString(pulledDocJob.body.id, 'D3 doc job id');
    const docPayload = expectObject(pulledDocJob.body.payload, 'D3 payload');
    assert(docPayload.document_id === document.id, 'D3: payload の document_id が作成した文書と一致しません');

    // ---- D4: complete で本文が書き戻る。
    const completedDocJob = await api({
      method: 'POST',
      path: `/api/v1/ai-jobs/${docJobId}/complete`,
      expected: 200,
      json: { body_markdown: DOC_BODY_FROM_AI },
      token: queueGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(completedDocJob.body.status === 'completed', 'D4: complete 後の job status が completed ではありません');
    const afterDraft = await docs.getDocument(tenantContext, document.id);
    assert(afterDraft?.bodyMarkdown === DOC_BODY_FROM_AI, 'D4: AI 下書きが document へ書き戻っていません');

    // ---- D5: 越境不可視。tenant B の context からは tenant スコープの doc が見えない。
    const foreignContext = createRepositoryContext({ tenantId: other.tenantId, actorId: other.memberUserId });
    const foreignRead = await docs.getDocument(foreignContext, document.id);
    assert(foreignRead === null, 'D5: 他 tenant から tenant スコープの document が読めています');
    const foreignList = await docs.listDocuments(foreignContext, { limit: 50 });
    assert(
      !foreignList.items.some((item) => item.id === document.id),
      'D5: 他 tenant の一覧に tenant スコープの document が現れています',
    );

    // ---- D6: docs.* は session-only。Bearer では本番でも通らない。
    const bearerDocs = await api({
      method: 'GET',
      path: '/api/v1/docs',
      expected: 403,
      token: queueGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(
      errorCode(bearerDocs.body) === 'credential_not_allowed',
      `D6: docs.read が session-only 契約を守りません (${JSON.stringify(bearerDocs.body)})`,
    );
    observed.D = {
      document_id: document.id,
      body_written_back: true,
      cross_tenant_visible: false,
      bearer_read: bearerDocs.status,
    };
  } catch (error) {
    runError = error;
  } finally {
    const cleanup: Record<string, number> = {};
    for (const tenantId of tenantIds) {
      try {
        const result = await probe.cleanupTenant(tenantId);
        cleanup[tenantId] = result.remainingRows;
        if (!result.clean) cleanupErrors.push(`tenant ${tenantId}: ${result.remainingRows} 行が残りました`);
      } catch (error) {
        cleanupErrors.push(`tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    observed.cleanup = { tenants: tenantIds.length, remaining_rows: cleanup };
    try {
      adapter.close();
    } catch (error) {
      cleanupErrors.push(`database close: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (runError !== undefined) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [runError, ...cleanupErrors.map((message) => new Error(message))],
        `production coverage smoke failed and cleanup failed: ${cleanupErrors.join(' / ')}`,
      );
    }
    throw runError;
  }
  if (cleanupErrors.length > 0) {
    throw new Error(`production coverage smoke cleanup failed: ${cleanupErrors.join(' / ')}`);
  }

  process.stdout.write(
    `${JSON.stringify({ status: 'pass', origin: config.origin, tenant_cleanup: 'deleted', checks: observed }, null, 2)}\n`,
  );
}

await main();
