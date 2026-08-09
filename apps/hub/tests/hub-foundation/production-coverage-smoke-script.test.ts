/**
 * 本番 smoke 未カバー領域 (HarnessHub-p0lr) の契約テスト。
 *
 * 本番資格情報を CI 以外へ配らないため、ここでは「資格情報なしでも entrypoint が生きているか」と
 * 「サインイン後 scope / Feedback Loop / Docs CMS を検査する構造が残っているか」を見る。
 * 実行結果そのものは本番 deploy job の step が証跡になる。
 */

// biome-ignore-all lint/suspicious/noTemplateCurlyInString: 検査対象が GitHub Actions の `${{ steps.X.outcome }}` 記法そのもの。JS のテンプレート展開ではなく本番 workflow と同じ文字列で突合することが検査の前提

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const HUB_ROOT = resolve(import.meta.dirname, '..', '..');
const SCRIPT = resolve(HUB_ROOT, 'scripts/smoke-production-coverage.ts');
const SUPPORT = resolve(HUB_ROOT, 'scripts/smoke-production-hearing-support.ts');
const OIDC_SCRIPT = resolve(HUB_ROOT, 'scripts/smoke-production-oidc.mjs');
const PROBE = resolve(HUB_ROOT, '..', '..', 'packages/db/repository/hearing-smoke.ts');
const WORKFLOW = resolve(HUB_ROOT, '..', '..', '.github/workflows/ci.yml');

describe('production coverage smoke script', () => {
  it('資格情報なしでも --help を実行できる', () => {
    const output = execFileSync('pnpm', ['run', 'smoke:coverage-production', '--', '--help'], {
      cwd: HUB_ROOT,
      encoding: 'utf8',
      env: { NODE_ENV: 'test', PATH: process.env.PATH ?? '' },
    });

    expect(output).toContain('smoke:coverage-production');
    expect(output).toContain('HUB_PUBLIC_URL');
    expect(output).toContain('TURSO_DATABASE_URL');
    // 新しい CI secret を要求しないことがこの smoke の前提。追加したら help に現れて落ちる。
    expect(output).not.toContain('AUTH_ACCESS_TOKEN_SECRET');
    expect(output).not.toContain('GOOGLE_CLIENT_SECRET');
    expect(output).not.toContain('PUBLISH_ACCESS_TOKEN');
  });

  it('サインイン後 scope の拒否理由を漏れなく実測する', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    // middleware / withAuthz が返しうる拒否理由のうち、HTTP から到達できる 7 種すべて。
    for (const reason of [
      'unauthenticated',
      'missing_tenant_scope',
      'ambiguous_scope',
      'tenant_mismatch',
      'workspace_not_member',
      'credential_not_allowed',
      'missing_scope',
    ]) {
      expect(source).toContain(`=== '${reason}'`);
    }

    // 存在秘匿 (T-ISO-06) は 404。403 への退行を静的にも検出する。
    expect(source).toContain('expected: 404');
    expect(source).toContain('403 ではなく **404**');
    // ambiguous_scope は path scope と header scope の二重申告でしか作れない。
    expect(source).toContain('/t/${primary.tenantId}/w/${primary.workspaceId}/probe');
  });

  it('provider-admin 越境がどの層で止まるかを監査行で測る', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    // status だけでは edge 遮断と route 層拒否を区別できない。監査件数が唯一の観測手段。
    expect(source).toContain('countCrossTenantAuditEvents');
    expect(source).toContain('providerAdminGrant');
    expect(source).toContain("path: '/api/v1/ai-jobs/pull'");
    expect(source).toContain('crossTenantAudits === 0');
  });

  it('Feedback Loop を投稿から状態遷移まで通す', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    for (const marker of [
      'createFeedbackLoopService',
      'FR-\\d{4,}',
      "type: 'improvement'",
      "kind: 'feedback_response'",
      'ai_response',
      "detail.source === 'harness'",
      "status: 'in_progress'",
      "status: 'resolved'",
      // AI 完了は status を動かさない (SEC8-103)。動かしたら落ちる。
      'F4: AI 完了が feedback の status を動かしました',
    ]) {
      expect(source).toContain(marker);
    }
  });

  it('Docs CMS を作成から AI 書戻し・越境不可視まで通す', () => {
    const source = readFileSync(SCRIPT, 'utf8');

    for (const marker of [
      'createDocsCmsRepository',
      'buildDocDraftPayload',
      'enqueueDocDraft',
      "kind: 'doc_draft'",
      'body_markdown',
      'D5: 他 tenant から tenant スコープの document が読めています',
      'D6: docs.read が session-only 契約を守りません',
    ]) {
      expect(source).toContain(marker);
    }
  });

  it('token の scope を呼び出し側が選べる (scope 別拒否を token 差だけで観測できる)', () => {
    const support = readFileSync(SUPPORT, 'utf8');

    expect(support).toContain('FEEDBACK_SCOPE');
    expect(support).toContain("'feedback:write'");
    expect(support).toContain('input.scopes ?? [QUEUE_SCOPE]');
    // 要求していない scope が付いて返ると、S7 (missing_scope) の観測が無意味になる。
    expect(support).toContain('要求していない scope が付与されました');
  });

  it('サインイン後の遷移先に外部 URL を差し込めないことを OIDC smoke で確認する', () => {
    const source = readFileSync(OIDC_SCRIPT, 'utf8');

    expect(source).toContain("id: 'O5'");
    expect(source).toContain('returnTo=');
    expect(source).toContain('value="/sheets"');
    // 「HTML に文字列が出現しない」ではなく「遷移に使われる属性へ入らない」を条件にしている。
    expect(source).toContain('navigable ${attribute} attribute');
  });

  it('使い捨て tenant の後始末が新しく触る表まで含む', () => {
    const probe = readFileSync(PROBE, 'utf8');

    for (const table of ['feedbacks', 'documents', 'builds']) {
      expect(probe).toContain(`delete(${table})`);
      // 残数カウント側にも入っていないと「消し漏れたまま clean」を返してしまう。
      expect(probe).toContain(`.from(${table})`);
    }
  });

  it('本番 deploy job から呼ばれ、失敗時ロールバックの判定材料になる', () => {
    const workflow = readFileSync(WORKFLOW, 'utf8');

    expect(workflow).toContain('smoke:coverage-production');
    expect(workflow).toContain('id: coverage_smoke');
    expect(workflow).toContain('COVERAGE_SMOKE_OUTCOME: ${{ steps.coverage_smoke.outcome }}');
    // 「smoke 未実行なので戻さない」判定は smoke 全件を見る必要がある。1 件でも漏れると
    // 新しい smoke だけが落ちたときに rollback が打たれなくなる。
    expect(workflow).toContain('&& [ "${COVERAGE_SMOKE_OUTCOME}" != "failure" ]; then');
  });
});
