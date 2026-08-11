#!/usr/bin/env node
/** feat-publish-pipeline P13 production smoke の実行手順。 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createHearingSmokeDbProbe, createPublishSmokeDbProbe, createTursoClient } from '@harness-hub/db';

import {
  acquireDeviceToken,
  type DeviceApprover,
  apiClient as deviceApiClient,
} from './smoke-production-hearing-support.js';
import {
  type ApiResult,
  apiClient,
  assert,
  cleanupPublishThenIdentity,
  downloadR2,
  expectString,
  greenZip,
  HELP,
  loadConfig,
  loadSweepConfig,
  PUBLISH_SCOPE,
  secretZip,
  sha256,
  smokeFixtureLifecycle,
  smokeId,
  smokeRunId,
  sweepSmokeTenants,
} from './smoke-production-publish-support.js';

/**
 * 中断された run が残した使い捨て fixture の回収。
 *
 * `cancel-in-progress` や runner の強制終了では main() の `finally` が完走しない。この経路は
 * 通常 cleanup の代わりではなく**独立した回収**で、CI からは `if: always()` の step が呼ぶ。
 * 対象は専用 lease 台帳へ登録された tenant だけ (期限切れ、または自分の run が作ったもの)。
 */
async function sweep(reportPath: string | null): Promise<void> {
  const config = loadSweepConfig();
  const adapter = createTursoClient({ url: config.databaseUrl, authToken: config.databaseToken });
  const publish = createPublishSmokeDbProbe(adapter);
  const identity = createHearingSmokeDbProbe(adapter);
  const runId = smokeRunId();
  try {
    const candidates = await identity.listSweepableTenants({ now: Date.now(), runId });
    const outcome = await sweepSmokeTenants({
      candidates,
      cleanupPublish: (tenantId) => publish.cleanupPublishTenant(tenantId),
      cleanupIdentity: (tenantId) => identity.cleanupTenant(tenantId),
      // 試行のたびに annotation を出す。「消えたが 2 回かかった」も観測できないと、
      // 回収経路が徐々に壊れていく過程が最後の失敗まで見えない。
      onAttempt: (event) => {
        process.stdout.write(
          `::warning::smoke fixture 回収の試行 ${event.attempt}/${event.maxAttempts} が未完了 ` +
            `(tenant=${event.tenantId} slug=${event.slug}): ${event.errors.join(' / ')}\n`,
        );
      },
    });
    const report = {
      status: outcome.failed === 0 ? 'pass' : 'fail',
      mode: 'sweep',
      run_id: runId,
      candidates: outcome.candidates,
      swept: outcome.swept,
      failed: outcome.failed,
      max_attempts: outcome.maxAttempts,
      results: outcome.results,
    };
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (reportPath !== null) await writeFile(reportPath, serialized, 'utf8');
    process.stdout.write(serialized);
    if (outcome.failed > 0) {
      const failed = outcome.results.filter((result) => !result.swept);
      process.stdout.write(
        `::error::使い捨て smoke fixture を回収できませんでした (${outcome.failed} tenant): ` +
          `${failed.map((result) => `${result.tenantId}(${result.errors.join(' / ')})`).join(' , ')}\n`,
      );
      throw new Error(`production smoke fixture sweep failed: ${outcome.failed} tenant(s) remain`);
    }
  } finally {
    adapter.close();
  }
}

/** `--report <path>` の値。指定が無ければ null (stdout だけに出す)。 */
function reportPathArg(argv: readonly string[]): string | null {
  const index = argv.indexOf('--report');
  if (index === -1) return null;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new Error('--report にはファイルパスが必要です');
  return value;
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }
  if (process.argv.includes('--sweep')) {
    await sweep(reportPathArg(process.argv));
    return;
  }

  const config = loadConfig();
  // tenant と同じ transaction で専用 lease を登録する。中断で finally が動かなくても、
  // 利用者向けの名前や slug を削除権限にせず残骸を一意に列挙できる。
  const lifecycle = smokeFixtureLifecycle('publish');
  const adapter = createTursoClient({ url: config.databaseUrl, authToken: config.databaseToken });
  const db = createPublishSmokeDbProbe(adapter);
  // tenant / workspace /利用者と device 承認は identity 側の probe が持つ (hearing / coverage smoke と共用)。
  const identity = createHearingSmokeDbProbe(adapter);
  const deviceApi = deviceApiClient(config);
  const projectId = smokeId('project');
  const channelId = smokeId('channel');
  const webChannelId = smokeId('web_channel');
  const webReleaseId = smokeId('web_release');
  const temp = await mkdtemp(join(tmpdir(), 'harness-hub-publish-smoke-'));
  const tenantIds: string[] = [];
  let runError: unknown;
  const cleanupErrors: string[] = [];
  const observed: Record<string, unknown> = {};

  try {
    // ---- 準備: 使い捨て tenant 1 件と、本番 Worker が署名した publish:write の access token 1 本。
    const fixture = await identity.createTenantFixture({
      slug: `pb-smoke-${config.suffix}`,
      memberIdpSubject: `pb-member-${config.suffix}`,
      workerIdpSubject: `pb-publisher-${config.suffix}`,
      lifecycle,
    });
    tenantIds.push(fixture.tenantId);
    // publish 系 action は `minRole: 'owner'`。`owner` は DB の列値ではなく資源との関係から
    // 合成される実効 role で、ROLE_ORDER 上は `workspace-admin` > `owner` > `member`。
    // つまり workspace-admin の利用者は Project の所有者でなくても publish を通せる。
    // fixture が作る利用者のうち workspace-admin はこの `workerUserId`。
    const approve: DeviceApprover = (input) => identity.approveDeviceAuthorization(input);
    const grant = await acquireDeviceToken(deviceApi, approve, {
      tenantSlug: fixture.tenantSlug,
      tenantId: fixture.tenantId,
      workspaceId: fixture.workspaceId,
      userId: fixture.workerUserId,
      label: `pb-publisher-${config.suffix}`,
      scopes: [PUBLISH_SCOPE],
    });
    const repositoryContext = {
      tenantId: fixture.tenantId,
      workspaceId: fixture.workspaceId,
      actorId: fixture.workerUserId,
    };
    const api = apiClient(config, grant);

    const now = Date.now();
    await db.createProjectChannelFixture(repositoryContext, {
      projectId,
      channelId,
      ownerUserId: fixture.workerUserId,
      createdAt: now,
    });

    const createRequest = async (): Promise<string> => {
      const result = await api('POST', '/api/v1/publish', {
        expected: 201,
        json: { project_id: projectId, target: 'skill', visibility: 'workspace' },
      });
      assert(result.body.status === 'draft', 'S1: 新規 request が draft ではありません');
      return expectString(result.body.id, 'S1 request id');
    };
    const upload = async (id: string, bytes: Uint8Array, expected: number): Promise<ApiResult> =>
      api('PUT', `/api/v1/publish/${id}/package`, { expected, bytes });
    const submit = async (id: string, expected: number): Promise<ApiResult> =>
      api('POST', `/api/v1/publish/${id}/submit`, { expected });

    // S1/S2/S4: Green v1。
    const v1Bytes = greenZip('1.0.0');
    const v1Request = await createRequest();
    const v1Upload = await upload(v1Request, v1Bytes, 200);
    const v1Hash = expectString(v1Upload.body.content_hash, 'S2 v1 content_hash');
    assert(v1Hash === sha256(v1Bytes), 'S2: v1 API hash と fixture hash が一致しません');
    const v1Submit = await submit(v1Request, 200);
    assert(v1Submit.body.status === 'published', 'S4: v1 が published ではありません');
    const v1Release = expectString(v1Submit.body.release_id, 'S4 v1 release_id');

    // S3: secret ZIP は 422/needs_fix、Release と R2 registry を作らず stable を変えない。
    const rejectedBytes = secretZip();
    const rejectedHash = sha256(rejectedBytes);
    const rejectedRequest = await createRequest();
    const rejectedUpload = await upload(rejectedRequest, rejectedBytes, 422);
    assert(rejectedUpload.body.error === 'package_rejected', 'S3: secret ZIP が package_rejected ではありません');
    const findings = Array.isArray(rejectedUpload.body.findings) ? rejectedUpload.body.findings : [];
    assert(
      findings.some(
        (finding) =>
          typeof finding === 'object' &&
          finding !== null &&
          (finding as Record<string, unknown>).rule_id === 'secret-scan/aws-access-key-id',
      ),
      'S3: AWS access key finding がありません',
    );
    const rejectedSubmit = await submit(rejectedRequest, 200);
    assert(rejectedSubmit.body.status === 'needs_fix', 'S3: rejected request が needs_fix ではありません');
    const stableAfterRejection = await db.findStableReleaseId(repositoryContext, channelId);
    assert(stableAfterRejection === v1Release, 'S3: secret ZIP 後に旧 stable v1 が変化しました');
    const rejectedRow = await db.findRequest(repositoryContext, rejectedRequest);
    assert(rejectedRow?.releaseId === null, 'S3: secret ZIP の PublishRequest に Release が結び付きました');
    // needs_fix は partial UNIQUE index 上では非終端で、この channel を占有し続ける。
    // 409 検証用の別 request を ready にする前に API 経由で draft へ戻し、
    // 本番と同じ状態遷移を通して直列化 slot を明示的に解放する。
    const rejectedCancelled = await api('POST', `/api/v1/publish/${rejectedRequest}/cancel`, { expected: 200 });
    assert(rejectedCancelled.body.status === 'draft', 'S3 cleanup: rejected request cancel が draft を返しません');
    const rejectedAfterCancel = await db.findRequest(repositoryContext, rejectedRequest);
    assert(rejectedAfterCancel?.status === 'draft', 'S3: cancel 後も needs_fix が channel slot を保持しています');

    // 409 直列化: 先行 request を ready fixture にして、後続 submit を拒否させる。
    const blockerRequest = await createRequest();
    await upload(blockerRequest, greenZip('1.1.0'), 200);
    await db.markRequestReady(repositoryContext, blockerRequest);

    const v2Bytes = greenZip('2.0.0');
    const v2Request = await createRequest();
    const v2Upload = await upload(v2Request, v2Bytes, 200);
    const v2Hash = expectString(v2Upload.body.content_hash, 'S2 v2 content_hash');
    assert(v2Hash === sha256(v2Bytes), 'S2: v2 API hash と fixture hash が一致しません');
    const blocked = await submit(v2Request, 409);
    assert(blocked.body.error === 'channel_busy', '409: channel_busy ではありません');
    const cancelled = await api('POST', `/api/v1/publish/${blockerRequest}/cancel`, { expected: 200 });
    assert(cancelled.body.status === 'draft', 'cleanup: blocker cancel が draft を返しません');

    const v2Submit = await submit(v2Request, 200);
    assert(v2Submit.body.status === 'published', 'S4: v2 が published ではありません');
    const v2Release = expectString(v2Submit.body.release_id, 'S4 v2 release_id');

    // 12 route contract のうち Bearer 対応経路は成功、session-only 経路は明示的な 403 を確認する。
    const listed = await api('GET', `/api/v1/publish?project_id=${encodeURIComponent(projectId)}&limit=100`, {
      expected: 200,
    });
    const listedItems = Array.isArray(listed.body.items) ? listed.body.items : [];
    assert(
      listedItems.some(
        (item) => typeof item === 'object' && item !== null && (item as Record<string, unknown>).id === v2Request,
      ),
      'route coverage: GET publish list に v2 request がありません',
    );
    const detailed = await api('GET', `/api/v1/publish/${v2Request}`, { expected: 200 });
    assert(
      detailed.body.id === v2Request && detailed.body.status === 'published',
      'route coverage: GET publish detail 不一致',
    );
    const approveDenied = await api('POST', `/api/v1/publish/${v2Request}/approve`, { expected: 403 });
    assert(
      approveDenied.body.error === 'credential_not_allowed',
      'route coverage: approve が Bearer を fail-closed で拒否しません',
    );
    const releasesDenied = await api('GET', `/api/v1/projects/${projectId}/releases`, { expected: 403 });
    assert(
      releasesDenied.body.error === 'credential_not_allowed',
      'route coverage: releases list が session-only 契約を守りません',
    );

    // S5: v2 -> v1 rollback、v1 -> v2 promote。
    const rolledBack = await api('POST', `/api/v1/channels/${channelId}/rollback`, {
      expected: 200,
      json: { release_id: v1Release },
    });
    assert(rolledBack.body.stable_release_id === v1Release, 'S5: rollback 後 stable が v1 ではありません');
    const promoted = await api('POST', `/api/v1/channels/${channelId}/promote`, {
      expected: 200,
      json: { release_id: v2Release },
    });
    assert(promoted.body.stable_release_id === v2Release, 'S5: promote 後 stable が v2 ではありません');

    const suspended = await api('POST', `/api/v1/releases/${v1Release}/suspend`, { expected: 200 });
    assert(suspended.body.status === 'suspended', 'route coverage: 非 stable v1 を suspend できません');

    // deployment は web_app 出口なので、同じ Project 配下に専用 channel/release fixture を作る。
    const fixtureNow = Date.now();
    await db.createWebReleaseFixture(repositoryContext, {
      projectId,
      channelId: webChannelId,
      releaseId: webReleaseId,
      packageHash: v2Hash,
      createdBy: repositoryContext.actorId,
      createdAt: fixtureNow,
    });
    const deployment = await api('POST', `/api/v1/projects/${projectId}/deployment`, {
      expected: 201,
      json: {
        channel_id: webChannelId,
        release_id: webReleaseId,
        url: `https://example.invalid/${projectId}`,
        provider: 'cloudflare',
        exit_code: 1,
      },
    });
    const deploymentId = expectString(deployment.body.id, 'route coverage deployment id');
    assert(
      deployment.body.orphan_candidate === true,
      'route coverage: failed deployment が orphan_candidate ではありません',
    );

    const smokeIds = new Set([
      v1Request,
      rejectedRequest,
      blockerRequest,
      v2Request,
      v1Release,
      v2Release,
      channelId,
      webChannelId,
      webReleaseId,
      deploymentId,
    ]);
    const evidence = await db.collectEvidence(repositoryContext, {
      projectId,
      channelId,
      contentHashes: [v1Hash, v2Hash, rejectedHash],
      entityIds: smokeIds,
    });
    assert(evidence.stableReleaseId === v2Release, 'S5: DB stable pointer が v2 ではありません');
    const releaseRows = evidence.releaseRows;
    assert(
      releaseRows.some((row) => row.id === v1Release) && releaseRows.some((row) => row.id === v2Release),
      'S4: v1/v2 Release が DB にそろっていません',
    );
    assert(!releaseRows.some((row) => row.packageHash === rejectedHash), 'S3: secret ZIP の Release が存在します');

    // R2 content-addressed object を再取得し、API/DB/実体の SHA-256 を一致させる。
    const packageRows = evidence.packageRows;
    for (const hash of [v1Hash, v2Hash]) {
      const row = packageRows.find((item) => item.contentHash === hash);
      assert(row, `R2: packages row がありません (${hash})`);
      const destination = join(temp, `${hash}.zip`);
      downloadR2(config.r2Bucket, row.r2Key, destination);
      const downloaded = await readFile(destination);
      assert(sha256(downloaded) === hash, `R2: 再取得 SHA-256 が不一致です (${hash})`);
    }
    assert(!packageRows.some((row) => row.contentHash === rejectedHash), 'S3: secret ZIP が registry に存在します');

    // S6: 共通検証器で全 chain を再計算し、この smoke の必須 action も確認する。
    const chain = evidence.auditChain;
    assert(chain?.ok, `S6: audit chain error: ${chain?.errors.join(' / ') ?? 'tenant chain missing'}`);
    const actions = new Set(evidence.auditActions);
    for (const action of [
      'publish.request',
      'publish.package_upload',
      'publish.submit',
      'publish.approve',
      'publish.cancel',
      'channel.rollback',
      'channel.promote',
      'release.suspend',
      'deployment.register',
    ]) {
      assert(actions.has(action), `S6: audit action ${action} がありません`);
    }

    observed.S1 = { request_id: v1Request, status: 'draft' };
    observed.S2 = { v1_hash: v1Hash, v2_hash: v2Hash };
    observed.S3 = {
      request_id: rejectedRequest,
      status: 'needs_fix',
      registry_rows: 0,
      release_id: null,
      stable_unchanged: v1Release,
      // 差戻しが channel を掴んだままにならないこと (cancel で draft へ戻し slot を返す)
      channel_slot_released: 'draft',
    };
    observed.S4 = { v1_release: v1Release, v2_release: v2Release };
    observed.S5 = { rollback_to: v1Release, promote_to: v2Release };
    observed.S6 = { checked: chain.checked, errors: chain.errors.length, actions: [...actions].sort() };
    observed.serialization = { status: 409, error: 'channel_busy' };
    observed.r2 = { verified_hashes: [v1Hash, v2Hash] };
    observed.routes = {
      contract_paths: 12,
      bearer_success_paths: 10,
      session_only_bearer_denials: ['publish.approve', 'project.releases'],
      deployment_reference_id: deploymentId,
    };
  } catch (error) {
    runError = error;
  } finally {
    // 使い捨て tenant なので Project を archived に戻すのではなく、作った行を全て消す。
    // publish 領域 (projects / channels / releases / requests / deployments) は publish 側の
    // probe が、identity 領域 (tenant / users / audit / device 認可) は identity 側の probe が
    // それぞれ所有する表を消す。**publish を先に**消す — identity 側が tenant 行を消した後だと、
    // 残った publish 行がどの tenant のものか追えなくなる。
    const cleanup: Record<string, number> = {};
    for (const tenantId of tenantIds) {
      const outcome = await cleanupPublishThenIdentity(
        tenantId,
        () => db.cleanupPublishTenant(tenantId),
        () => identity.cleanupTenant(tenantId),
      );
      Object.assign(cleanup, outcome.remainingRows);
      cleanupErrors.push(...outcome.errors);
    }
    observed.cleanup = {
      tenants: tenantIds.length,
      remaining_rows: cleanup,
      // 通常終了ではここで消え切る。中断された run の分は `--sweep` が同じ順序で回収する。
      run_id: lifecycle.runId,
      fixture_expires_at: lifecycle.expiresAt,
    };
    try {
      adapter.close();
    } catch (error) {
      cleanupErrors.push(`database close: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      await rm(temp, { recursive: true, force: true });
    } catch (error) {
      cleanupErrors.push(`temporary files: ${error instanceof Error ? error.message : String(error)}`);
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
        project_id: projectId,
        target_channel_id: channelId,
        project_cleanup: 'tenant_deleted',
        // R2 実体だけは残る。content-addressed で tenant 非スコープのため、同一 hash を
        // 参照する他 tenant の Release を壊さないよう消さない (packages 表も同じ理由)。
        retained: ['r2_objects', 'packages_registry'],
        checks: observed,
      },
      null,
      2,
    )}\n`,
  );
}

await main();
