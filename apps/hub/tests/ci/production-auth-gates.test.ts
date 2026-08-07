// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub Actions の `${{ ... }}` 式を文字列として検査する

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const WORKFLOW = readFileSync(path.join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');
const PACKAGE_JSON = JSON.parse(readFileSync(path.join(REPO_ROOT, 'apps/hub/package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};

describe('production OIDC / owner authorization release gates', () => {
  it('main の push と明示 dispatch だけが、全ゲート後の production deploy へ進める', () => {
    expect(WORKFLOW).toContain(
      "if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')",
    );
    expect(WORKFLOW).toContain('needs: [static-gates, test]');
  });

  it('owner 認可と OIDC の契約を、名前付き package script で fail-closed 実行する', () => {
    const script = PACKAGE_JSON.scripts?.['test:auth-release-contract'] ?? '';
    expect(script).toContain('authz-decision-matrix.test.ts');
    expect(script).toContain('authz-entry.test.ts');
    expect(script).toContain('tenant-isolation.test.ts');
    expect(script).toContain('authjs-handler.test.ts');
    expect(script).toContain('tenant-oidc-signin-form.test.ts');
    expect(script).toContain('production-oidc-smoke.test.ts');

    expect(WORKFLOW).toContain('G14 OIDC / owner authorization contract');
    expect(WORKFLOW).toContain('check-required-package-script.mjs apps/hub/package.json test:auth-release-contract');
    expect(WORKFLOW).toContain('pnpm --filter @harness-hub/hub run test:auth-release-contract');
  });

  it('全 required 設定を migration より前に検査し、設定名だけを報告する', () => {
    const preflight = WORKFLOW.indexOf('- name: production deploy preflight');
    const migration = WORKFLOW.indexOf('- name: production migration 適用');
    expect(preflight).toBeGreaterThan(-1);
    expect(preflight).toBeLessThan(migration);

    const step = WORKFLOW.slice(preflight, migration);
    for (const name of [
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_R2_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID',
      'TURSO_DATABASE_URL',
      'TURSO_AUTH_TOKEN',
      'HUB_HEALTH_URL',
      'HUB_PUBLIC_URL',
    ]) {
      expect(step).toContain(name);
    }
    expect(step).not.toContain('echo "$value"');
  });

  it('health 後・DB/R2 smoke 前に OIDC smoke を実行し、失敗時 rollback 判定へ含める', () => {
    const health = WORKFLOW.indexOf('- name: デプロイ後 /health');
    const oidc = WORKFLOW.indexOf('- name: 本番 OIDC start-flow smoke');
    const dataSmoke = WORKFLOW.indexOf('- name: 本番 DB / R2 スモークテスト');
    expect(health).toBeGreaterThan(-1);
    expect(oidc).toBeGreaterThan(health);
    expect(dataSmoke).toBeGreaterThan(oidc);

    expect(WORKFLOW).toContain('OIDC_SMOKE_OUTCOME: ${{ steps.oidc_smoke.outcome }}');
    expect(WORKFLOW).toContain('PREFLIGHT_OUTCOME: ${{ steps.preflight.outcome }}');
  });

  // 2026-08-07: deploy が 2 run 連続で success を返しながら、配信されていたのは 8/4 の rollback で
  // 固定された古い version のままだった。以降の smoke は古いコードを検査するため、修正済みの契約が
  // 直っていないように見え、その失敗がまた rollback を呼んで固定を強めていた。
  // 「deploy した版 == 配信中の版」を突き合わせる step が、この一連の検証の前提になる。
  it('deploy した version と /health の配信 version を突合し、不一致なら smoke より前で止める', () => {
    const health = WORKFLOW.indexOf('- name: デプロイ後 /health');
    const versionGate = WORKFLOW.indexOf('- name: 配信版が今デプロイした版であることの検査');
    const oidc = WORKFLOW.indexOf('- name: 本番 OIDC start-flow smoke');
    expect(versionGate).toBeGreaterThan(health);
    // 古い版に対して smoke を走らせない。順序が逆だと「無関係な差分で赤くなる」状態に戻る
    expect(oidc).toBeGreaterThan(versionGate);

    const step = WORKFLOW.slice(versionGate, oidc);
    // 比較対象は deploy step が控えた実 version id であり、固定文字列や自己申告ではない
    expect(step).toContain('DEPLOYED_VERSION: ${{ steps.deploy.outputs.deployed_version }}');
    expect(step).toContain('.version // ""');
    expect(step).toContain('exit 1');
    expect(WORKFLOW).toContain('echo "deployed_version=$version" >> "$GITHUB_OUTPUT"');
  });

  it('配信版が入れ替わっていないときは rollback しない (古い版への固定を強めないため)', () => {
    expect(WORKFLOW).toContain('VERSION_GATE_OUTCOME: ${{ steps.version_gate.outcome }}');
    const rollback = WORKFLOW.indexOf('- name: 失敗時ロールバック');
    expect(rollback).toBeGreaterThan(-1);
    const step = WORKFLOW.slice(rollback);
    expect(step).toContain('if [ "${VERSION_GATE_OUTCOME}" != "success" ]; then');
  });
});
