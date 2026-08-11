/**
 * P13 publish production smoke の契約テスト。
 *
 * 本番資格情報を CI 以外へ配らないため、ここでは「資格情報なしでも entrypoint が生きているか」と
 * 「S1-S6 / 409 / R2 / audit / 後始末を同じ fail-closed entrypoint に閉じているか」を静的に見る。
 * 実行結果そのものは本番 deploy job の step が証跡になる。
 */

// biome-ignore-all lint/suspicious/noTemplateCurlyInString: 検査対象が GitHub Actions の `${{ steps.X.outcome }}` 記法そのもの。JS のテンプレート展開ではなく本番 workflow と同じ文字列で突合することが検査の前提

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cleanupPublishThenIdentity,
  smokeFixtureLifecycle,
  smokeRunId,
  sweepSmokeTenants,
} from '../../scripts/smoke-production-publish-support.js';

const HUB_ROOT = resolve(import.meta.dirname, '..', '..');
const SCRIPT = resolve(HUB_ROOT, 'scripts/smoke-production-publish.ts');
const SUPPORT = resolve(HUB_ROOT, 'scripts/smoke-production-publish-support.ts');
const HEARING_SCRIPT = resolve(HUB_ROOT, 'scripts/smoke-production-hearing.ts');
const COVERAGE_SCRIPT = resolve(HUB_ROOT, 'scripts/smoke-production-coverage.ts');
const DB_SMOKE_SCRIPT = resolve(HUB_ROOT, '..', '..', 'packages/db/scripts/smoke-production.ts');
const PROBE = resolve(HUB_ROOT, '..', '..', 'packages/db/repository/publish-smoke.ts');
const WORKFLOW = resolve(HUB_ROOT, '..', '..', '.github/workflows/ci.yml');
const SWEEPER_WORKFLOW = resolve(HUB_ROOT, '..', '..', '.github/workflows/smoke-fixture-sweeper.yml');

describe('P13 production publish smoke script', () => {
  // Hub 全スイートは複数の Next/tsx 子プロセスを並列起動する。負荷下でも契約を
  // 検査できるよう、実際の package script を呼ぶこの integration test だけ余裕を持たせる。
  it('資格情報なしでも --help を実行できる', () => {
    const output = execFileSync('pnpm', ['run', 'smoke:publish-production', '--', '--help'], {
      cwd: HUB_ROOT,
      encoding: 'utf8',
      env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '' },
    });

    expect(output).toContain('smoke:publish-production');
    expect(output).toContain('HUB_PUBLIC_URL');
    expect(output).toContain('CLOUDFLARE_API_TOKEN');
    // 台帳に無い secret を要求すると CI から一度も呼べない runner に戻る (HarnessHub-pf5o)。
    // 長命 token の env 名が help に現れたら、その退行が起きている。
    expect(output).not.toContain('PUBLISH_ACCESS_TOKEN');
    expect(output).not.toContain('HUB_BASE_URL');
  }, 90_000);

  it('S1-S6・409・R2・audit・cleanup を同じ fail-closed entrypoint に閉じる', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    for (const marker of [
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'channel_busy',
      'downloadR2',
      'createPublishSmokeDbProbe',
      'auditChain',
      'cleanupPublishTenant',
      'cleanup failed',
      'stable_unchanged',
      'publish.approve',
      'release.suspend',
      'deployment.register',
      'contract_paths: 12',
    ]) {
      expect(source).toContain(marker);
    }

    for (const path of [
      '/api/v1/publish?project_id=',
      '/package',
      '/submit',
      '/approve',
      '/cancel',
      '/releases',
      '/promote',
      '/rollback',
      '/suspend',
      '/deployment',
    ]) {
      expect(source).toContain(path);
    }
  });

  it('S3 の needs_fix が直列化 slot を占有したまま 409 検証へ進まない', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    const rejectedCancel = source.indexOf('`/api/v1/publish/${rejectedRequest}/cancel`');
    const blockerReady = source.indexOf('db.markRequestReady(repositoryContext, blockerRequest)');

    // needs_fix は publish_requests_channel_active_uq の対象。先に draft へ戻さないと、
    // blockerRequest を ready にした時点で channel_id の UNIQUE 制約に衝突する。
    expect(rejectedCancel).toBeGreaterThan(-1);
    expect(blockerReady).toBeGreaterThan(rejectedCancel);
    expect(source).toContain('S3 cleanup: rejected request cancel が draft を返しません');
    // cancel したつもりで status を見ていない、を防ぐ (API 応答と DB の双方で draft を確かめる)
    expect(source).toContain('rejectedAfterCancel');
    expect(source).toContain('channel_slot_released');
  });
  it('新しい secret を足さず Device Flow の短命 token で認可される', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    const support = readFileSync(SUPPORT, 'utf8');

    // 使い捨て tenant を作り、本番 Worker が署名した publish:write token を取り直す。
    expect(source).toContain('createTenantFixture');
    expect(source).toContain('acquireDeviceToken');
    expect(source).toContain('scopes: [PUBLISH_SCOPE]');
    expect(support).toContain("const PUBLISH_SCOPE = 'publish:write'");
    // token を環境変数から読む経路が復活したら、長命 token の CI 常置に戻っている。
    // 経緯を説明する散文には名前が出るので、**読み取り**だけを禁止する。
    expect(support).not.toMatch(/required\(['"]PUBLISH_ACCESS_TOKEN|process\.env\.PUBLISH_ACCESS_TOKEN/);
    expect(support).toContain("required('HUB_PUBLIC_URL')");
    // 変更系は Origin 検査が認可判定より前にある。付け忘れると全 POST が untrusted_origin で落ちる。
    expect(support).toContain("headers.set('origin', config.origin)");
  });

  it('使い捨て tenant の後始末が publish 領域の表も含む', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    const probe = readFileSync(PROBE, 'utf8');

    // identity 側 (cleanupTenant) は publish の表を知らない。両方呼ばないと孤児が残る。
    expect(source).toContain('db.cleanupPublishTenant(tenantId)');
    expect(source).toContain('identity.cleanupTenant(tenantId)');

    for (const table of [
      'projects',
      'targetChannels',
      'releases',
      'publishRequests',
      'deploymentReferences',
      'catalogEntries',
      'idempotencyLedger',
    ]) {
      expect(probe).toContain(`delete(${table})`);
      // 残数カウント側にも入っていないと「消し漏れたまま clean」を返してしまう。
      expect(probe).toContain(`.from(${table})`);
    }
    // packages は content-addressed で tenant 非スコープ。消すと他 tenant の Release を壊す。
    expect(probe).not.toContain('delete(packages)');
  });

  it('publish cleanup が完了しない限り identity tenant を削除しない', async () => {
    let identityCalls = 0;
    const cleanupIdentity = async () => {
      identityCalls += 1;
      return { clean: true, remainingRows: 0 };
    };

    const thrown = await cleanupPublishThenIdentity(
      'tenant-throw',
      async () => {
        throw new Error('publish database unavailable');
      },
      cleanupIdentity,
    );
    expect(thrown.identityAttempted).toBe(false);
    expect(thrown.errors).toEqual(['tenant tenant-throw (publish): publish database unavailable']);
    expect(identityCalls).toBe(0);

    const residual = await cleanupPublishThenIdentity(
      'tenant-residual',
      async () => ({ clean: false, remainingRows: 2 }),
      cleanupIdentity,
    );
    expect(residual.identityAttempted).toBe(false);
    expect(residual.errors).toEqual(['tenant tenant-residual (publish): 2 行が残りました']);
    expect(identityCalls).toBe(0);

    // 陰性だけだと identity cleanup 自体を削除した実装も緑になる。publish clean 後は必ず進む。
    const clean = await cleanupPublishThenIdentity(
      'tenant-clean',
      async () => ({ clean: true, remainingRows: 0 }),
      cleanupIdentity,
    );
    expect(clean.identityAttempted).toBe(true);
    expect(clean.remainingRows).toEqual({ 'tenant-clean:publish': 0, 'tenant-clean:identity': 0 });
    expect(clean.errors).toEqual([]);
    expect(identityCalls).toBe(1);
  });

  it('中断 run が残した fixture を回収する経路が同じ entrypoint にある', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    const support = readFileSync(SUPPORT, 'utf8');

    // fixture を専用 lease 台帳へ登録しないと、finally が走らなかった run の残骸を特定できない。
    expect(source).toContain("smokeFixtureLifecycle('publish')");
    expect(source).toContain('lifecycle,');
    expect(source).toContain("process.argv.includes('--sweep')");
    expect(source).toContain('listSweepableTenants');
    // 回収も通常 cleanup と同じ publish 先行の順序に乗せる。
    expect(source).toContain('cleanupPublish: (tenantId) => publish.cleanupPublishTenant(tenantId)');
    expect(source).toContain('cleanupIdentity: (tenantId) => identity.cleanupTenant(tenantId)');
    // 失敗の観測: 試行ごとの warning と、残留時の error annotation。
    expect(source).toContain('::warning::smoke fixture 回収の試行');
    expect(source).toContain('::error::使い捨て smoke fixture を回収できませんでした');
    // 上限の無い再試行は cancel の猶予を食い潰して回収そのものを落とす。
    expect(support).toContain('const DEFAULT_SWEEP_MAX_ATTEMPTS = 3');
    expect(support).toContain('const SWEEP_ATTEMPT_LIMIT = 5');
    // 通常終了の finally cleanup を消していない (中断経路の回収はその代替ではない)。
    expect(source).toContain('cleanupPublishThenIdentity(');
  });

  it('回収は publish を消し切るまで identity へ進まず、再試行に上限を持つ', async () => {
    const candidates = [
      { tenantId: 'tenant-a', slug: 'pb-smoke-a', runId: 'gha-1-1', kind: 'publish', expiresAt: 1 },
    ] as const;
    const sleep = async () => {};

    // 陰性: publish 側が残り続けるなら identity は一度も呼ばれず、試行は上限で打ち切られる。
    let identityCalls = 0;
    const attempts: number[] = [];
    const stuck = await sweepSmokeTenants({
      candidates,
      cleanupPublish: async () => ({ clean: false, remainingRows: 3 }),
      cleanupIdentity: async () => {
        identityCalls += 1;
        return { clean: true, remainingRows: 0 };
      },
      maxAttempts: 3,
      onAttempt: (event) => attempts.push(event.attempt),
      sleep,
    });
    expect(identityCalls).toBe(0);
    expect(attempts).toEqual([1, 2, 3]);
    expect(stuck.failed).toBe(1);
    expect(stuck.swept).toBe(0);
    expect(stuck.results[0]).toMatchObject({ tenantId: 'tenant-a', attempts: 3, swept: false });
    expect(stuck.results[0]?.errors).toEqual(['tenant tenant-a (publish): 3 行が残りました']);

    // 陽性: 一時的な失敗は上限内で吸収し、publish clean 後に identity まで進んで回収済みになる。
    let publishCalls = 0;
    const recovered = await sweepSmokeTenants({
      candidates,
      cleanupPublish: async () => {
        publishCalls += 1;
        if (publishCalls === 1) throw new Error('database unavailable');
        return { clean: true, remainingRows: 0 };
      },
      cleanupIdentity: async () => ({ clean: true, remainingRows: 0 }),
      maxAttempts: 3,
      sleep,
    });
    expect(recovered).toMatchObject({ candidates: 1, swept: 1, failed: 0, maxAttempts: 3 });
    expect(recovered.results[0]).toMatchObject({ attempts: 2, swept: true, errors: [] });

    // 上限そのものが上書きで無限化しないこと。
    const clamped = await sweepSmokeTenants({
      candidates,
      cleanupPublish: async () => ({ clean: false, remainingRows: 1 }),
      cleanupIdentity: async () => ({ clean: true, remainingRows: 0 }),
      maxAttempts: 99,
      sleep,
    });
    expect(clamped.maxAttempts).toBe(5);
    expect(clamped.results[0]?.attempts).toBe(5);
  });

  it('fixture lease は run を一意に指し、期限を持つ', () => {
    const original = { ...process.env };
    try {
      process.env.GITHUB_RUN_ID = '123';
      process.env.GITHUB_RUN_ATTEMPT = '2';
      delete process.env.HUB_SMOKE_FIXTURE_TTL_MINUTES;
      // 再実行 (attempt) は別プロセス。attempt を混ぜないと、再実行が前 attempt の生存中の
      // fixture を「自分のもの」とみなして消しに行く。
      expect(smokeRunId()).toBe('gha-123-2');
      const lifecycle = smokeFixtureLifecycle('publish', 1_000);
      expect(lifecycle).toEqual({
        runId: 'gha-123-2',
        kind: 'publish',
        expiresAt: 1_000 + 30 * 60_000,
      });

      process.env.HUB_SMOKE_FIXTURE_TTL_MINUTES = '5';
      expect(smokeFixtureLifecycle('publish', 1_000).expiresAt).toBe(1_000 + 5 * 60_000);
      // 不正値を既定値へ丸めると設定事故が見えない。整数 1 以上以外は全て fail-closed。
      for (const invalid of ['', '0', '-1', '1.5', 'abc']) {
        process.env.HUB_SMOKE_FIXTURE_TTL_MINUTES = invalid;
        expect(() => smokeFixtureLifecycle('publish', 1_000)).toThrow(/1 以上の整数/);
      }

      delete process.env.GITHUB_RUN_ID;
      expect(smokeRunId()).toMatch(/^local-[0-9a-z]+-[0-9a-f]{8}$/);
    } finally {
      process.env = original;
    }
  });

  it('database・hearing・coverage・publish の全 fixture が共通 lifecycle 契約へ登録される', () => {
    const entries = [
      [DB_SMOKE_SCRIPT, "kind: 'database'"],
      [HEARING_SCRIPT, "smokeFixtureLifecycle('hearing')"],
      [COVERAGE_SCRIPT, "smokeFixtureLifecycle('coverage')"],
      [SCRIPT, "smokeFixtureLifecycle('publish')"],
    ] as const;

    for (const [path, lifecycleMarker] of entries) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).toContain(lifecycleMarker);
      expect(source, path).toContain('lifecycle');
    }

    const dbSource = readFileSync(DB_SMOKE_SCRIPT, 'utf8');
    // DB smoke だけが tenant を直 INSERT すると lease 登録を忘れやすい。共通 probe 経由に固定する。
    expect(dbSource).toContain('createHearingSmokeDbProbe');
    expect(dbSource).not.toContain('.insert(tenants)');
  });

  it('本番 deploy job から呼ばれ、失敗時ロールバックの判定材料になる', () => {
    const workflow = readFileSync(WORKFLOW, 'utf8');

    expect(workflow).toContain('smoke:publish-production');
    expect(workflow).toContain('id: publish_smoke');
    expect(workflow).toContain('PUBLISH_SMOKE_OUTCOME: ${{ steps.publish_smoke.outcome }}');
    // 「smoke 未実行なので戻さない」判定は smoke 全件を見る必要がある。1 件でも漏れると
    // 新しい smoke だけが落ちたときに rollback が打たれなくなる。
    expect(workflow).toContain(
      '[ "${PUBLISH_SMOKE_OUTCOME}" != "failure" ] && [ "${COVERAGE_SMOKE_OUTCOME}" != "failure" ]; then',
    );
  });

  it('同一 job の回収は best-effort と明示され、ロールバック判定より後ろに置かれる', () => {
    const workflow = readFileSync(WORKFLOW, 'utf8');

    expect(workflow).toContain('id: smoke_sweep');
    expect(workflow).toContain('scripts/smoke-production-publish.ts \\\n            --sweep');
    expect(workflow).toContain('name: smoke-fixture-sweep');
    // cancel された job では `failure()` が成立しない。always() でないと回収 step ごと飛ぶ。
    const sweepIndex = workflow.indexOf('id: smoke_sweep');
    expect(workflow.slice(sweepIndex, sweepIndex + 200)).toContain('if: always()');
    // 回収の失敗で `if: failure()` を成立させると、健全な新 version を巻き戻してしまう。
    expect(sweepIndex).toBeGreaterThan(workflow.indexOf('name: 失敗時ロールバック'));
    // always() でも runner 消失・force cancel では実行不能。誤って完全保証と扱わない。
    expect(workflow).toContain('best-effort');
    expect(workflow).toContain('force-cancel や');
    expect(workflow).toContain('runner 消失では評価自体が無い');
  });

  it('runner と独立した sweeper が同じ冪等 cleanup command を実行し、cron 間隔を SLA 扱いしない', () => {
    const workflow = readFileSync(SWEEPER_WORKFLOW, 'utf8');

    expect(workflow).toContain('schedule:');
    expect(workflow).toContain('cron の設定間隔は 15 分');
    expect(workflow).toContain('15 分は回収時間の上限や SLA ではない');
    expect(workflow).not.toContain('最大 15 分');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('scripts/smoke-production-publish.ts');
    expect(workflow).toContain('--sweep');
    // 独立回収に必要なのは lease 台帳を読む Turso 資格情報だけ。deploy/Cloudflare 権限は渡さない。
    expect(workflow).toContain('TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL }}');
    expect(workflow).toContain('TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN }}');
    // repository secret は既存 backup workflow と共用する。environment approval 待ちでは定期回収にならない。
    expect(workflow).not.toContain('environment:');
    expect(workflow).not.toContain('CLOUDFLARE_API_TOKEN');
    expect(workflow).not.toContain('CLOUDFLARE_ACCOUNT_ID');
  });
});
