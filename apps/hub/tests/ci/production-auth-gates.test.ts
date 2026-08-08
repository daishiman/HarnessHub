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

  // 2026-08-07 の run 31221676748: /health は 1.3 秒後に新版へ切替わりゲートは通ったが、続く hearing
  // smoke は修正前のコード (tenant_mismatch=403) を叩いて落ちた。colo ごとに切替時刻が違うため、
  // 単発の一致では「全拠点で入れ替わった」ことにならない。連続一致を通過条件にして窓を狭める。
  it('配信版の一致は連続 N 回を要求し、単発の一致では smoke へ進まない', () => {
    const versionGate = WORKFLOW.indexOf('- name: 配信版が今デプロイした版であることの検査');
    const oidc = WORKFLOW.indexOf('- name: 本番 OIDC start-flow smoke');
    const step = WORKFLOW.slice(versionGate, oidc);

    // 連続一致の回数を数え、不一致で streak を 0 へ戻す (通算一致回数で代用しない)
    expect(step).toContain('required_streak="${VERSION_GATE_STREAK:-3}"');
    expect(step).toContain('streak=$(( streak + 1 ))');
    expect(step).toContain('streak=0');
    expect(step).toContain('if [ "$streak" -ge "$required_streak" ]; then break; fi');
    // 期限切れは fail-open にしない。streak 未達のまま抜けたら必ず落とす
    expect(step).toContain('if [ "$streak" -lt "$required_streak" ]; then');
    expect(step).toContain('exit 1');
  });

  it('配信版の観測はキャッシュ済み応答を配信中の版と誤認せず、観測した colo を記録する', () => {
    const versionGate = WORKFLOW.indexOf('- name: 配信版が今デプロイした版であることの検査');
    const oidc = WORKFLOW.indexOf('- name: 本番 OIDC start-flow smoke');
    const step = WORKFLOW.slice(versionGate, oidc);

    expect(step).toContain("-H 'Cache-Control: no-cache'");
    expect(step).toContain('?_version_gate=${attempt}');
    // どの拠点を観測したうえで通したかを後から検証できるようにする
    expect(step).toContain('cf-ray');
    expect(step).toContain('colos=');
  });

  // 判定材料を wrangler の一覧出力に置くと、表示仕様が変わったときパース失敗が空文字になって素通りしうる。
  // 通過判定は /health の JSON だけに寄せ、wrangler は診断表示に留める。
  it('通過判定は /health の JSON だけを根拠にし、wrangler の一覧出力は診断に留める', () => {
    const versionGate = WORKFLOW.indexOf('- name: 配信版が今デプロイした版であることの検査');
    const oidc = WORKFLOW.indexOf('- name: 本番 OIDC start-flow smoke');
    const step = WORKFLOW.slice(versionGate, oidc);

    const listIndex = step.indexOf('wrangler deployments list');
    const diagIndex = step.indexOf('--- 診断: 現在の deployment / version 一覧 ---');
    expect(listIndex).toBeGreaterThan(-1);
    // wrangler 呼び出しは診断ブロックより後にだけ現れる = 判定には使われていない
    expect(listIndex).toBeGreaterThan(diagIndex);
    expect(step).toContain('|| true');
  });

  it('配信版が入れ替わっていないときは rollback しない (古い版への固定を強めないため)', () => {
    expect(WORKFLOW).toContain('VERSION_GATE_OUTCOME: ${{ steps.version_gate.outcome }}');
    const rollback = WORKFLOW.indexOf('- name: 失敗時ロールバック');
    expect(rollback).toBeGreaterThan(-1);
    const step = WORKFLOW.slice(rollback);
    expect(step).toContain('if [ "${VERSION_GATE_OUTCOME}" != "success" ]; then');
  });
});

// 2026-08-07: 着地先を直した commit が 4 日間本番へ反映されないまま、deploy は success を返し続けた。
// 「稼働している成果物がどの commit か」を問い合わせる手段が無かったことが、この 4 日間の本体である。
describe('稼働ビルドの素性と鮮度のゲート', () => {
  it('deploy 時に稼働成果物へ commit を埋め込む (wrangler.jsonc へ値を書かない経路で)', () => {
    // --var は deploy 時注入なので、設定ファイルへ値を保存しない規約と両立する。
    // commit sha は公開情報なので secret 扱いにしない
    expect(WORKFLOW).toContain('--var "HUB_COMMIT_SHA:${GITHUB_SHA}"');
  });

  it('配信版一致の検査を通した直後、smoke の前に鮮度検査を実行する', () => {
    const versionGate = WORKFLOW.indexOf('- name: 配信版が今デプロイした版であることの検査');
    const freshness = WORKFLOW.indexOf('- name: 稼働ビルドの鮮度検査');
    const oidc = WORKFLOW.indexOf('- name: 本番 OIDC start-flow smoke');

    expect(freshness).toBeGreaterThan(versionGate);
    expect(oidc).toBeGreaterThan(freshness);

    const step = WORKFLOW.slice(freshness, oidc);
    // 検査本体は package script 経由で呼ぶ (しきい値と判定を workflow へ二重定義しない)
    expect(step).toContain('run check:deploy-freshness');
    expect(step).toContain('id: deploy_freshness');
    expect(step).toContain('--health-url "$HUB_HEALTH_URL"');
    // 判定根拠を後から検証できるよう JSON 証跡を残す
    expect(step).toContain('--json');
  });

  it('鮮度検査で止まったときは rollback しない (素性の確認できない版へ後退させない)', () => {
    expect(WORKFLOW).toContain('DEPLOY_FRESHNESS_OUTCOME: ${{ steps.deploy_freshness.outcome }}');

    const rollback = WORKFLOW.indexOf('- name: 失敗時ロールバック');
    const step = WORKFLOW.slice(rollback);

    // 鮮度検査で止まった時点で後続 smoke は未実行 = 「新しい版が壊れている」証拠が無い。
    // ここで戻すと、素性を確認できない古い版へ後退するだけになる
    expect(step).toContain('if [ "${DEPLOY_FRESHNESS_OUTCOME}" != "success" ]');
    expect(step).toContain('鮮度検査で停止');
  });
});
