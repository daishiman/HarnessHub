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

import { cleanupPublishThenIdentity } from '../../scripts/smoke-production-publish-support.js';

const HUB_ROOT = resolve(import.meta.dirname, '..', '..');
const SCRIPT = resolve(HUB_ROOT, 'scripts/smoke-production-publish.ts');
const SUPPORT = resolve(HUB_ROOT, 'scripts/smoke-production-publish-support.ts');
const PROBE = resolve(HUB_ROOT, '..', '..', 'packages/db/repository/publish-smoke.ts');
const WORKFLOW = resolve(HUB_ROOT, '..', '..', '.github/workflows/ci.yml');

describe('P13 production publish smoke script', () => {
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
  });

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
});
