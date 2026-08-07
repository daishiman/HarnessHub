// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-AUTHZ-*: role 4 種の認可判定への完全委譲 (AD-8 / acceptance 全般の前提 / quality_constraint role-4-integration)。
//
// AD-8 の決定: role 判定は本 feature 側で再実装せず、`apps/hub/src/lib/authz/` の `ACTION_RULES`/`atLeast` に
// 完全委譲する。このテストは既存の正本 (`rules.ts`/`types.ts`) を直接 import して実測する。
// 独自の role 比較や authz 表を feature 側に定義しない (`check-single-authz-middleware.mjs` の検査対象)。

import { describe, expect, it } from 'vitest';
import { ACTION_RULES, findActionRule } from '../../src/lib/authz/rules.js';
import { atLeast, ROLE_ORDER } from '../../src/lib/authz/types.js';

describe('契約: 本 feature が消費する ACTION_RULES (AD-3 / AD-8)', () => {
  it('UOA-AUTHZ-001: users.* / coefficients.change の6 action が既定義で workspace-admin 限定である', () => {
    const featureActions = [
      'users.read',
      'users.write',
      'users.role_change',
      'users.read_salary',
      'users.write_salary',
      'coefficients.change',
    ] as const;

    for (const action of featureActions) {
      const rule = findActionRule(action);
      expect(rule, `${action} が ACTION_RULES に未定義`).not.toBeNull();
      expect(rule?.minRole).toBe('workspace-admin');
      expect(rule?.credential).toBe('session');
      expect(rule?.requiredScope).toBeNull();
      expect(rule?.selfOnly).toBe(false);
    }
  });

  it('UOA-AUTHZ-002 (前提の明記 / P03 申し送り対応): GET /api/v1/users は現行実装 (rules.ts) を正とする', () => {
    // docs/backend-spec-api-state.md は同エンドポイントを「member (簡易) / admin (全列)」と記載しているが、
    // design-review-notes.md 指摘事項3 (P03 3回目レビュー) はこれをドリフトと認定し、
    // 実装済み rules.ts / security-spec-authorization.md 側 (workspace-admin 限定) を正としてブロッカー扱いしない
    // と判定した。本テストはその前提を実測値として固定する。member 向け簡易一覧を要求する記載は
    // requirements-baseline.md の acceptance/quality_constraints に無いため、機能的な抜け漏れではない。
    expect(findActionRule('users.read')?.minRole).toBe('workspace-admin');
  });

  it('UOA-AUTHZ-003: me.read/me.update/coefficients.read が P05 で登録済み (AD-3/AD-8)', () => {
    // P04 時点では未登録だったが、P05 で rules.ts へ追加登録した。selfOnly の 2 件 (me.*) は
    // 「自分の情報のみ」を role 下限 member で許可し、coefficients.read は users.read と同強度。
    expect(findActionRule('me.read')).toStrictEqual({
      minRole: 'member',
      requiredScope: null,
      credential: 'session',
      selfOnly: true,
    });
    expect(findActionRule('me.update')).toStrictEqual({
      minRole: 'member',
      requiredScope: null,
      credential: 'session',
      selfOnly: true,
    });
    expect(findActionRule('coefficients.read')).toStrictEqual({
      minRole: 'workspace-admin',
      requiredScope: null,
      credential: 'session',
      selfOnly: false,
    });
  });

  it('UOA-AUTHZ-004 (Goodhart対策): ACTION_RULES の総数が本 feature の6件を含む既知件数以上である (空表で緑にしない)', () => {
    expect(Object.keys(ACTION_RULES).length).toBeGreaterThanOrEqual(6);
  });
});

describe('契約: role 順序の単一情報源 (lib/authz/types.ts) を feature 側から借りるだけであること', () => {
  it('UOA-AUTHZ-005: ROLE_ORDER は qa-005 の4 role (member/owner/workspace-admin/provider-admin) の弱い順', () => {
    expect(ROLE_ORDER).toStrictEqual(['member', 'owner', 'workspace-admin', 'provider-admin']);
  });

  it('UOA-AUTHZ-006: atLeast は role の順序を単調に判定する (feature 側は判定結果だけを消費する)', () => {
    expect(atLeast('workspace-admin', 'workspace-admin')).toBe(true);
    expect(atLeast('provider-admin', 'workspace-admin')).toBe(true);
    expect(atLeast('owner', 'workspace-admin')).toBe(false);
    expect(atLeast('member', 'workspace-admin')).toBe(false);
  });
});

describe('P05 受入層への引き継ぎ (実装対象のため it.todo)', () => {
  it('UOA-AUTHZ-101 (P05 で昇格): me.read/me.update/coefficients.read が登録済みで妥当な強度である', () => {
    expect(findActionRule('me.read')?.minRole).toBe('member');
    expect(findActionRule('me.update')?.minRole).toBe('member');
    expect(findActionRule('coefficients.read')?.minRole).toBe('workspace-admin');
  });
  it.todo(
    'UOA-AUTHZ-102: apps/hub/src/app/api/v1/users/**/route.ts が全て withAuthz() でラップされている (check-single-authz-middleware.mjs の EXPECTED_EXEMPTIONS に本 feature の route が追加されないこと)',
  );
  it.todo(
    'UOA-AUTHZ-103: apps/hub/src/features/user-org-admin/ 配下に role リテラル比較・isAdmin 系識別子が無い (静的走査。P05 実装後に対象ディレクトリが実在してから検査できる)',
  );
});
