/**
 * P13 hearing production smoke の契約テスト。
 *
 * 本番資格情報を CI 以外へ配らないため、ここでは「資格情報なしでも entrypoint が生きているか」と
 * 「release-notes §7.1 の 2 件 (実データ E2E / SEC8 本番挙動) を検査する構造が残っているか」を見る。
 * 実行結果そのものは本番 deploy job の step が証跡になる。
 */

// biome-ignore-all lint/suspicious/noTemplateCurlyInString: 検査対象が GitHub Actions の `${{ steps.X.outcome }}` 記法そのもの。JS のテンプレート展開ではなく本番 workflow と同じ文字列で突合することが検査の前提

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const HUB_ROOT = resolve(import.meta.dirname, '..', '..');
const SCRIPT = resolve(HUB_ROOT, 'scripts/smoke-production-hearing.ts');
const SUPPORT = resolve(HUB_ROOT, 'scripts/smoke-production-hearing-support.ts');
const WORKFLOW = resolve(HUB_ROOT, '..', '..', '.github/workflows/ci.yml');

describe('P13 production hearing smoke script', () => {
  it('資格情報なしでも --help を実行できる', () => {
    const output = execFileSync('pnpm', ['run', 'smoke:hearing-production', '--', '--help'], {
      cwd: HUB_ROOT,
      encoding: 'utf8',
      env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '' },
    });

    expect(output).toContain('smoke:hearing-production');
    expect(output).toContain('HUB_PUBLIC_URL');
    expect(output).toContain('TURSO_DATABASE_URL');
    // 新しい CI secret を要求しないことがこの smoke の前提。追加したら help に現れて落ちる。
    expect(output).not.toContain('AUTH_ACCESS_TOKEN_SECRET');
    expect(output).not.toContain('GOOGLE_CLIENT_SECRET');
  });

  it('実データ E2E (提出 -> pull -> complete -> S12) を同じ fail-closed entrypoint に閉じる', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    for (const marker of [
      'createHearingSmokeDbProbe',
      'createHearingIntakeService',
      'HS-\\d{4,}',
      "status === 'generating'",
      "kind === 'sheet_generation'",
      'claimedByTokenId === workerGrant.claims.token_id',
      "afterComplete?.status === 'review'",
      'service.getSheet',
      'generated_sections',
      'cleanupTenant',
      'cleanup failed',
    ]) {
      expect(source).toContain(marker);
    }

    // device 認可の 2 endpoint は support 側の acquireDeviceToken にある。
    // 経路が 1 本つながっているかを見たいので entrypoint の source 一式で突合する。
    const sources = `${source}\n${readFileSync(SUPPORT, 'utf8')}`;
    for (const path of [
      '/api/v1/device/code',
      '/api/v1/device/token',
      '/api/v1/ai-jobs/pull',
      '/complete',
      '/api/v1/sheets',
    ]) {
      expect(sources).toContain(path);
    }
  });

  it('SEC8 の 2 経路と SEC5 を実挙動として検査する', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    // SEC8-a: 他 tenant からは queue が空に見え、header を騙れば tenant_mismatch で落ちる。
    expect(source).toContain('tenant_mismatch');
    expect(source).toContain('expected: 204');
    // 他 tenant の資源存在を伏せる authz 契約は 404。403 への退行を静的に検出する。
    expect(source).toContain('tenant_mismatch は 404');
    expect(source).toContain('expected: 404');
    // SEC8-b: claim していない token の complete は not_owner で、job を変更しない。
    expect(source).toContain('not_owner');
    expect(source).toContain('SEC8-b: 拒否されたはずの complete が job を変更しました');
    // SEC5: salary は form_json にも AI payload にも出ない。
    expect(source).toContain('SEC5: form_json に salary が保存されています');
    expect(source).toContain('SEC5: AI へ渡す payload に salary が含まれています');
    // session-only 契約 (sheets.create は Bearer で通らない)。
    expect(source).toContain('credential_not_allowed');
  });

  it('状態変更要求へ Origin を必ず付ける (untrusted_origin で認可判定へ到達しない事故を防ぐ)', () => {
    const support = readFileSync(SUPPORT, 'utf8');

    expect(support).toContain("headers.set('origin', config.origin)");
    expect(support).toContain('MUTATING');
    expect(support).toContain('untrusted_origin');
    expect(support).toContain('HUB_SMOKE_ORIGIN');
  });

  it('本番 deploy job から呼ばれ、失敗時ロールバックの判定材料になる', () => {
    const workflow = readFileSync(WORKFLOW, 'utf8');

    expect(workflow).toContain('smoke:hearing-production');
    expect(workflow).toContain('id: hearing_smoke');
    expect(workflow).toContain('HEARING_SMOKE_OUTCOME: ${{ steps.hearing_smoke.outcome }}');
  });
});
