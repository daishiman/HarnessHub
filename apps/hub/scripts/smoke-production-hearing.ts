#!/usr/bin/env node
/**
 * feat-hearing-intake P13 production smoke の実行手順。
 *
 * release-notes.md §7.1 に残っていた 2 件を、毎デプロイ再実行できる形へ落とす:
 *   1. 実データ E2E (提出 -> `HS-xxxx` 発番 -> pull -> complete -> S12 表示)
 *   2. SEC8 の本番実挙動 (他 tenant の job が pull で見えない / 別 claim token で complete できない)
 *
 * 使い捨て tenant を 2 つ本番へ作り、検査後に全行を削除する。残数が 0 でなければ失敗させる。
 */

import {
  createHearingIntakeRepository,
  createHearingSmokeDbProbe,
  createRepositoryContext,
  createTursoClient,
} from '@harness-hub/db';

import { createHearingIntakeService } from '../src/features/hearing-intake/service.js';
import {
  acquireDeviceToken,
  apiClient,
  assert,
  type DeviceApprover,
  errorCode,
  expectString,
  HELP,
  loadConfig,
} from './smoke-production-hearing-support.js';

/** 提出 fixture。salary を含める — 保存されないことがこの smoke の SEC5 検査になる。 */
const FORM_INPUT = {
  taskName: 'P13 本番 smoke の議事録要約',
  company: 'HarnessHub production smoke',
  applicant: 'production-smoke',
  domain: 'operations',
  issue: '会議のたびに議事録を手作業で整形しており、担当者の時間が奪われている。',
  tools: 'Google Meet / Google Docs',
  hours: 10,
  people: 3,
  salary: 6_000_000,
  features: '文字起こしの要約と決定事項の抽出、担当者への割り当て。',
  output: 'Markdown の議事録と ToDo 一覧',
  priority: 'high',
} as const;

/** worker が返す生成結果。S12 詳細まで往復することを確認するため固定値にする。 */
const GENERATION_RESULT = {
  generated_sections: {
    overview: 'P13 production smoke が生成した概要。',
    issue: '議事録整形の手作業が担当者の時間を奪っている。',
    feature_tags: ['summarize', 'extract'],
    estimated_effect: '年間の整形作業を削減できる見込み。',
  },
} as const;

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} が JSON object ではありません`);
  }
  return parsed as Record<string, unknown>;
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }

  const config = loadConfig();
  const adapter = createTursoClient({ url: config.databaseUrl, authToken: config.databaseToken });
  const probe = createHearingSmokeDbProbe(adapter);
  // route と同じ合成 (repository -> service)。session を持てない CI でも提出経路の実装は本物を通す。
  const service = createHearingIntakeService(createHearingIntakeRepository(adapter));
  const api = apiClient(config);

  const tenantIds: string[] = [];
  let runError: unknown;
  const cleanupErrors: string[] = [];
  const observed: Record<string, unknown> = {};

  try {
    // ---- H1: 使い捨て tenant 2 件と、本番 Worker が署名した access token 3 本。
    const primary = await probe.createTenantFixture({
      slug: `hs-smoke-a-${config.suffix}`,
      memberIdpSubject: `hs-member-a-${config.suffix}`,
      workerIdpSubject: `hs-worker-a-${config.suffix}`,
    });
    tenantIds.push(primary.tenantId);
    const other = await probe.createTenantFixture({
      slug: `hs-smoke-b-${config.suffix}`,
      memberIdpSubject: `hs-member-b-${config.suffix}`,
      workerIdpSubject: `hs-worker-b-${config.suffix}`,
    });
    tenantIds.push(other.tenantId);

    const approve: DeviceApprover = (input) => probe.approveDeviceAuthorization(input);
    const workerGrant = await acquireDeviceToken(api, approve, {
      tenantSlug: primary.tenantSlug,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
      userId: primary.workerUserId,
      label: 'worker-a',
    });
    // SEC8-b 用。同じ workspace / 同じ scope だが claim していない別 token を代表させる。
    const memberGrant = await acquireDeviceToken(api, approve, {
      tenantSlug: primary.tenantSlug,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
      userId: primary.memberUserId,
      label: 'member-a',
    });
    const otherGrant = await acquireDeviceToken(api, approve, {
      tenantSlug: other.tenantSlug,
      tenantId: other.tenantId,
      workspaceId: other.workspaceId,
      userId: other.workerUserId,
      label: 'worker-b',
    });
    assert(
      workerGrant.claims.token_id !== memberGrant.claims.token_id,
      'H1: 別々の device 認可から同じ token_id が出ました',
    );
    observed.H1 = {
      tokens: 3,
      roles: [workerGrant.claims.role, memberGrant.claims.role, otherGrant.claims.role],
      scope: workerGrant.claims.scope,
    };

    // ---- H2: 提出。受付番号発番・同一 transaction の enqueue・SEC5 (salary 非保存) を確認する。
    const memberContext = createRepositoryContext({
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
      actorId: primary.memberUserId,
    });
    const submitted = await service.createSheet({
      context: memberContext,
      workspaceId: primary.workspaceId,
      applicantUserId: primary.memberUserId,
      request: { ...FORM_INPUT },
    });
    assert(/^HS-\d{4,}$/.test(submitted.code), `H2: 受付番号が HS-xxxx 形式ではありません (${submitted.code})`);
    assert(
      submitted.status === 'generating',
      `H2: 提出直後の status が generating ではありません (${submitted.status})`,
    );

    const afterSubmit = await probe.findSheet(memberContext, submitted.id);
    assert(afterSubmit !== null, 'H2: 提出した sheet を本番 DB から読み出せません');
    const jobId = expectString(afterSubmit.aiJobId, 'H2 ai_job_id');
    const formSnapshot = parseJsonObject(afterSubmit.formJson, 'H2 form_json');
    assert(!('salary' in formSnapshot), 'SEC5: form_json に salary が保存されています');
    const estimateSnapshot = parseJsonObject(afterSubmit.estimateJson, 'H2 estimate_json');
    assert(!('hourlyRate' in estimateSnapshot), 'SEC5: estimate_json に hourlyRate が保存されています');
    assert(
      typeof estimateSnapshot.savedAmountPerYear === 'number' && estimateSnapshot.savedAmountPerYear > 0,
      'H2: server 側 sheetEstimate の savedAmountPerYear が正の数ではありません',
    );

    const queued = await probe.findJob(memberContext, jobId);
    assert(queued !== null, 'H2: 同一 transaction で enqueue された ai_job がありません');
    assert(queued.kind === 'sheet_generation', `H2: job kind が sheet_generation ではありません (${queued.kind})`);
    assert(queued.status === 'queued', `H2: enqueue 直後の job status が queued ではありません (${queued.status})`);
    assert(queued.claimedByTokenId === null, 'H2: enqueue 直後の job が既に claim されています');
    assert(
      queued.refType === 'hearing_sheet' && queued.refId === submitted.id,
      'H2: job の ref が提出した sheet を指していません',
    );
    observed.H2 = {
      code: submitted.code,
      status: submitted.status,
      ai_job_id: jobId,
      salary_persisted: false,
      saved_amount_per_year: estimateSnapshot.savedAmountPerYear,
    };

    // ---- SEC8-a: 他 tenant からは同じ job へ到達できない。
    // a1: 自 tenant の workspace を正しく指しても、tenant A の queued job は見えない (204)。
    const isolatedPull = await api({
      method: 'POST',
      path: '/api/v1/ai-jobs/pull',
      expected: 204,
      json: { kind: 'sheet_generation' },
      token: otherGrant.accessToken,
      tenantId: other.tenantId,
      workspaceId: other.workspaceId,
    });
    // a2: tenant A の header を騙っても、token claims と一致しないため認可の手前で落ちる。
    // 他 tenant の資源の存在を伏せる既存契約により、tenant_mismatch は 404 で応答する。
    const crossTenantPull = await api({
      method: 'POST',
      path: '/api/v1/ai-jobs/pull',
      expected: 404,
      json: { kind: 'sheet_generation' },
      token: otherGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(
      errorCode(crossTenantPull.body) === 'tenant_mismatch',
      `SEC8-a: 他 tenant header の pull が tenant_mismatch で拒否されません (${JSON.stringify(crossTenantPull.body)})`,
    );
    const stillQueued = await probe.findJob(memberContext, jobId);
    assert(
      stillQueued?.status === 'queued' && stillQueued.claimedByTokenId === null,
      'SEC8-a: 他 tenant の要求後に job が claim されています',
    );
    observed.SEC8_a = {
      same_tenant_empty_queue: isolatedPull.status,
      cross_tenant_header: { status: crossTenantPull.status, error: errorCode(crossTenantPull.body) },
      job_untouched: true,
    };

    // ---- H3: workspace header は必須。未指定は 400 で、queue に触れない。
    const missingWorkspace = await api({
      method: 'POST',
      path: '/api/v1/ai-jobs/pull',
      expected: 400,
      json: { kind: 'sheet_generation' },
      token: workerGrant.accessToken,
      tenantId: primary.tenantId,
    });
    observed.H3 = { status: missingWorkspace.status };

    // ---- H4: 本番 HTTP 経由で pull。claim は token_id へ束縛される。
    const pulled = await api({
      method: 'POST',
      path: '/api/v1/ai-jobs/pull',
      expected: 200,
      json: { kind: 'sheet_generation' },
      token: workerGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(pulled.body.id === jobId, 'H4: pull で返った job が提出した job ではありません');
    assert(pulled.body.kind === 'sheet_generation', 'H4: pull で返った job の kind が違います');
    const payload = parseJsonObject(JSON.stringify(pulled.body.payload), 'H4 payload');
    assert(payload.sheet_code === submitted.code, 'H4: payload の sheet_code が受付番号と一致しません');
    const payloadForm = parseJsonObject(JSON.stringify(payload.form), 'H4 payload.form');
    assert(!('salary' in payloadForm), 'SEC5: AI へ渡す payload に salary が含まれています');

    const claimed = await probe.findJob(memberContext, jobId);
    assert(claimed?.status === 'processing', 'H4: pull 後の job status が processing ではありません');
    assert(
      claimed.claimedByTokenId === workerGrant.claims.token_id,
      'H4: claimed_by_token_id が pull した token の token_id と一致しません',
    );
    observed.H4 = { job_id: jobId, status: claimed.status, claim_bound_to_token: true };

    // ---- SEC8-b: claim していない別 token では complete できない。
    // 同 workspace・同 scope の member token を使う。job.claimed_by_token_id と principal.tokenId が
    // 一致しないため resolveResource が ownerUserId を null にし、selfOnly の aijob.complete が
    // not_owner で落ちる (403)。認可判定で止まるので queue の状態は一切動かない。
    const foreignComplete = await api({
      method: 'POST',
      path: `/api/v1/ai-jobs/${jobId}/complete`,
      expected: 403,
      json: GENERATION_RESULT,
      token: memberGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(
      errorCode(foreignComplete.body) === 'not_owner',
      `SEC8-b: 別 claim token の complete が not_owner で拒否されません (${JSON.stringify(foreignComplete.body)})`,
    );
    const afterForeign = await probe.findJob(memberContext, jobId);
    assert(
      afterForeign?.status === 'processing' && afterForeign.claimedByTokenId === workerGrant.claims.token_id,
      'SEC8-b: 拒否されたはずの complete が job を変更しました',
    );
    observed.SEC8_b = {
      status: foreignComplete.status,
      error: errorCode(foreignComplete.body),
      job_unchanged: true,
    };

    // ---- H5: claim した token で complete。sheet が review へ進み、S12 詳細から結果を読める。
    const completed = await api({
      method: 'POST',
      path: `/api/v1/ai-jobs/${jobId}/complete`,
      expected: 200,
      json: GENERATION_RESULT,
      token: workerGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(completed.body.id === jobId, 'H5: complete 応答の job id が違います');
    assert(completed.body.status === 'completed', 'H5: complete 後の job status が completed ではありません');

    const afterComplete = await probe.findSheet(memberContext, submitted.id);
    assert(afterComplete?.status === 'review', 'H5: complete 後の sheet status が review ではありません');
    assert(afterComplete.aiJobStatus === 'completed', 'H5: sheet から見た ai_job status が completed ではありません');

    // S12 詳細は route と同じ service.getSheet を通す (表示経路のデータがそろうことの確認)。
    const detail = await service.getSheet({ context: memberContext, id: submitted.id });
    assert(detail !== null, 'H5: S12 詳細を取得できません');
    assert(detail.status === 'review', 'H5: S12 詳細の status が review ではありません');
    assert(
      JSON.stringify(detail.generated_sections) === JSON.stringify(GENERATION_RESULT.generated_sections),
      'H5: S12 詳細の generated_sections が worker の投入内容と一致しません',
    );
    assert(detail.code === submitted.code, 'H5: S12 詳細の受付番号が提出時と一致しません');
    observed.H5 = {
      job_status: completed.body.status,
      sheet_status: detail.status,
      generated_section_keys: Object.keys(GENERATION_RESULT.generated_sections),
      s12_detail_readable: true,
    };

    // ---- H6: sheets.create は session-only。Bearer では本番でも 403 のまま。
    const bearerSubmit = await api({
      method: 'POST',
      path: '/api/v1/sheets',
      expected: 403,
      json: { ...FORM_INPUT },
      token: workerGrant.accessToken,
      tenantId: primary.tenantId,
      workspaceId: primary.workspaceId,
    });
    assert(
      errorCode(bearerSubmit.body) === 'credential_not_allowed',
      `H6: sheets.create が session-only 契約を守りません (${JSON.stringify(bearerSubmit.body)})`,
    );
    observed.H6 = { status: bearerSubmit.status, error: errorCode(bearerSubmit.body) };
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
        `production smoke failed and cleanup failed: ${cleanupErrors.join(' / ')}`,
      );
    }
    throw runError;
  }
  if (cleanupErrors.length > 0) {
    throw new Error(`production smoke cleanup failed: ${cleanupErrors.join(' / ')}`);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'pass',
        origin: config.origin,
        tenant_cleanup: 'deleted',
        checks: observed,
      },
      null,
      2,
    )}\n`,
  );
}

await main();
