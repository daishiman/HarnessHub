// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-PII-*: salary の PII 非露出 (acceptance 1 / SEC4 / quality_constraint salary-pii-guard)。
//
// AD-5 の決定: salary の可視性判定は `apps/hub/src/shared/pii/` の `maskPii`/`canView`/`maskPiiForExport`
// をそのまま消費する。独自マスク関数は作らない。role 語彙の変換 (`toPiiViewer`) だけを本 feature 側に
// 1 関数として閉じ、role の順序知識 (`atLeast`) は `lib/authz/types.ts` から借りる。
// このテストは AD-5 のコード例をそのまま使い、共通層の実関数を直接呼ぶ (模型に置き換えない)。

import { describe, expect, it } from 'vitest';
import { atLeast, type EffectiveRole } from '../../src/lib/authz/types.js';
import {
  ADMIN_ROLE,
  canView,
  maskPii,
  maskPiiForExport,
  type PiiFieldPolicy,
  type PiiViewer,
} from '../../src/shared/pii/index.js';

// AD-5 §5「role 語彙のマッピング問題」のコード例そのもの。
// role の順序判定は行わず、lib/authz が公開する atLeast() の結果を PiiViewer へ詰め替えるだけ。
function toPiiViewer(role: EffectiveRole): PiiViewer {
  return { roles: atLeast(role, 'workspace-admin') ? [ADMIN_ROLE] : [] };
}

const salaryPolicy: PiiFieldPolicy = { field: 'salary', sensitivity: 'admin_only' };

interface UserRecord extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly department: string | null;
  readonly salary: number | null;
}

const sampleUser: UserRecord = { id: 'u-1', name: '山田太郎', department: '営業', salary: 6_000_000 };

describe('契約: salary PII ガード (AD-5 / SEC4)', () => {
  it('UOA-PII-001: workspace-admin は salary を閲覧できる (toPiiViewer 経由でも共通層の判定結果と一致)', () => {
    const viewer = toPiiViewer('workspace-admin');
    expect(canView(salaryPolicy, viewer)).toBe(true);
    expect(maskPii(sampleUser, [salaryPolicy], viewer).salary).toBe(6_000_000);
  });

  it('UOA-PII-002: provider-admin (workspace-admin より上位) も salary を閲覧できる', () => {
    const viewer = toPiiViewer('provider-admin');
    expect(maskPii(sampleUser, [salaryPolicy], viewer).salary).toBe(6_000_000);
  });

  it('UOA-PII-003: member は salary が "***" にマスクされる', () => {
    const viewer = toPiiViewer('member');
    expect(maskPii(sampleUser, [salaryPolicy], viewer).salary).toBe('***');
  });

  it('UOA-PII-004: owner (workspace-admin 未満) も salary が "***" にマスクされる', () => {
    // owner は資源との関係から合成される role で、role 順序上は workspace-admin の 1 つ下。
    // salary は「role の強さ」だけで見るので owner でも非公開側になる。
    const viewer = toPiiViewer('owner');
    expect(maskPii(sampleUser, [salaryPolicy], viewer).salary).toBe('***');
  });

  it('UOA-PII-005: マスク対象外の属性 (name/department) はそのまま通る', () => {
    const viewer = toPiiViewer('member');
    const masked = maskPii(sampleUser, [salaryPolicy], viewer);
    expect(masked.name).toBe('山田太郎');
    expect(masked.department).toBe('営業');
  });

  it('UOA-PII-006: salary が null の場合はマスク文字列ではなく null のまま (共通層の既定動作)', () => {
    const viewer = toPiiViewer('member');
    const masked = maskPii({ ...sampleUser, salary: null }, [salaryPolicy], viewer);
    expect(masked.salary).toBeNull();
  });

  it('UOA-PII-007: export は閲覧者に関わらず常にマスクする (maskPiiForExport / AD-5 決定3)', () => {
    // viewer を渡さない = 常に非 admin 扱い。workspace-admin が export した場合でも同じ結果になることを固定する。
    expect(maskPiiForExport(sampleUser, [salaryPolicy]).salary).toBe('***');
  });

  it('UOA-PII-008 (Goodhart対策): 未知の role 文字列は atLeast が -1 を返し fail-closed になる', () => {
    // EffectiveRole の型を迂回して未知値を渡すのは、実装が「知らない role は緩める」方向に
    // 倒れていないことを固定するため。型で防げても実装の分岐が誤っていれば意味が無い。
    const viewer = toPiiViewer('guest-unknown' as EffectiveRole);
    expect(viewer.roles).toStrictEqual([]);
    expect(maskPii(sampleUser, [salaryPolicy], viewer).salary).toBe('***');
  });

  it('UOA-PII-009: toPiiViewer は role リテラル比較・isAdmin 系識別子を使わない (AD-5 の checker 適合をコード上でも再確認)', () => {
    // check-single-authz-middleware.mjs は静的走査でしか検査できないため、ここでは
    // 「atLeast の戻り値だけを見て判定している」という契約を実行結果として固定する。
    // atLeast が false を返す role では必ず [] になり、true を返す role では必ず [ADMIN_ROLE] になる。
    const roles: EffectiveRole[] = ['member', 'owner', 'workspace-admin', 'provider-admin'];
    for (const role of roles) {
      const expected = atLeast(role, 'workspace-admin') ? [ADMIN_ROLE] : [];
      expect(toPiiViewer(role).roles).toStrictEqual(expected);
    }
  });
});

describe('P05 受入層への引き継ぎ (実装対象のため it.todo)', () => {
  it.todo(
    'UOA-PII-101: GET /api/v1/users のレスポンス DTO で、maskPii が admin 以外の salary を実際に "***" へ置換する (HTTP 結合)',
  );
  it.todo(
    'UOA-PII-102: 個別ダッシュボード画面の salary 表示/編集 UI が admin 限定で分岐する (role 別 UI スナップショット)',
  );
  it.todo('UOA-PII-103: CSV export エンドポイントが maskPiiForExport を通す (export DTO 結合)');
  it.todo(
    'UOA-PII-104: decryptSalary() 呼出しが withAuthz(users.read_salary | users.write_salary) を通過した後にのみ発生する (呼出し順序の結合検証)',
  );
});
