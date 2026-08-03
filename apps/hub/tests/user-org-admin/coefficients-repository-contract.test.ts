// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-COEF-*: tenant_coefficients の port 越し消費 (AD-4 / quality_constraint coefficient-and-user-entities)。
//
// AD-4 の決定: `tenant_coefficients` は feat-hearing-intake が owner。本 feature はスキーマ定義・migration を
// 一切行わず、読取りは `HearingIntakeRepository.getCoefficients(context)` を port として消費するのみ。
// 書込み用 port (`updateCoefficients`) は現時点で存在せず、feat-hearing-intake への cross-feature follow-up
// として依頼中 (P05 着手前に確定が必要)。
//
// 実 DB (libSQL/D1) への接続は apps/hub の単体テストからは行わない (packages/db/__tests__/hearing-intake.test.ts
// が実装 owner 側の統合テストを持つ)。ここでは「読取り専用の port だけを呼ぶ」という消費契約を、
// HearingIntakeRepository の型を借りた最小の consumer 関数に対して固定する。

import type { HearingIntakeRepository, RepositoryContext, TenantCoefficientRow } from '@harness-hub/db';
import { describe, expect, it } from 'vitest';

/** AD-4 決定2: 読取りは getCoefficients() だけを呼ぶ。本 feature 側で他メソッド (queue 系等) を呼ばない。 */
async function readCoefficientsForFeature(
  repo: Pick<HearingIntakeRepository, 'getCoefficients'>,
  context: RepositoryContext,
): Promise<TenantCoefficientRow> {
  return repo.getCoefficients(context);
}

function fakeCoefficientsRepo(
  row: TenantCoefficientRow,
  calls: string[],
): Pick<HearingIntakeRepository, 'getCoefficients'> {
  return {
    async getCoefficients(context) {
      calls.push(`getCoefficients:${context.tenantId}`);
      return row;
    },
  };
}

const SAMPLE_ROW: TenantCoefficientRow = {
  tenantId: 'tenant-1',
  annualHours: 2_000,
  minutesPerRun: 15,
  sheetReductionRate: 0.35,
  updatedBy: 'system-default',
};

describe('契約: tenant_coefficients の読取り port 消費 (AD-4)', () => {
  it('UOA-COEF-001: getCoefficients(context) を1回だけ呼び、他メソッドを呼ばない', async () => {
    const calls: string[] = [];
    const repo = fakeCoefficientsRepo(SAMPLE_ROW, calls);

    const result = await readCoefficientsForFeature(repo, { tenantId: 'tenant-1' });

    expect(result).toStrictEqual(SAMPLE_ROW);
    expect(calls).toStrictEqual(['getCoefficients:tenant-1']);
  });

  it('UOA-COEF-002: 返り値の型 (annualHours/minutesPerRun/sheetReductionRate/updatedBy) が AD-4 の記述と一致する', async () => {
    const calls: string[] = [];
    const repo = fakeCoefficientsRepo(SAMPLE_ROW, calls);
    const result = await readCoefficientsForFeature(repo, { tenantId: 'tenant-1' });

    expect(Object.keys(result).sort()).toStrictEqual(
      ['tenantId', 'annualHours', 'minutesPerRun', 'sheetReductionRate', 'updatedBy'].sort(),
    );
  });

  it('UOA-COEF-003 (Goodhart対策): テナントを変えると呼出し引数も変わる (固定値を返しているだけの偽実装を検出する)', async () => {
    const calls: string[] = [];
    const repo = fakeCoefficientsRepo(SAMPLE_ROW, calls);

    await readCoefficientsForFeature(repo, { tenantId: 'tenant-a' });
    await readCoefficientsForFeature(repo, { tenantId: 'tenant-b' });

    expect(calls).toStrictEqual(['getCoefficients:tenant-a', 'getCoefficients:tenant-b']);
  });
});

describe('P05 受入層 / cross-feature follow-up への引き継ぎ (実装対象のため it.todo)', () => {
  it.todo(
    'UOA-COEF-101: HearingIntakeRepository.updateCoefficients(context, input) が feat-hearing-intake 側で追加された後、書込み契約 (呼出しシグネチャ・監査記録との連携) を検証する — P05 着手前に AD-4 の cross-feature follow-up が確定していることが前提',
  );
  it.todo(
    'UOA-COEF-102: GET/PATCH /api/v1/tenant/coefficients の HTTP 結合 (coefficients.change 認可 + AuditRepo.append(coefficient.change) の一体検証)',
  );
  it.todo(
    'UOA-COEF-103: 実 DB (packages/db) 経由の getCoefficients が tenant_coefficients 行の未作成テナントに既定値 (annualHours=2000等) を返すことを、実 adapter で確認する (owner 側 packages/db/__tests__/hearing-intake.test.ts と重複させないよう、本 feature からの呼出し経路のみを見る)',
  );
});
