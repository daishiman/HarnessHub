// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-COEF-*: tenant_coefficients の port 越し消費 (AD-4 / quality_constraint coefficient-and-user-entities)。
//
// AD-4 の決定: `tenant_coefficients` は feat-hearing-intake が owner。本 feature はスキーマ定義・migration を
// 一切行わず、読取り/書込みとも `HearingIntakeRepository` の port を消費する。書込みは owner が公開する
// `updateCoefficients(context, input)` だけを使い、監査記録は consumer service の責務として別に記録する。
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

type CoefficientUpdateInput = Parameters<HearingIntakeRepository['updateCoefficients']>[1];

async function updateCoefficientsForFeature(
  repo: Pick<HearingIntakeRepository, 'updateCoefficients'>,
  context: RepositoryContext,
  input: CoefficientUpdateInput,
): Promise<TenantCoefficientRow> {
  return repo.updateCoefficients(context, input);
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

describe('P05 受入層: tenant_coefficients owner port の書込み消費 (AD-4)', () => {
  it('UOA-COEF-101: 更新は owner の updateCoefficients(context, input) にだけ委譲し、actor を含む context を渡す', async () => {
    const calls: Array<{ readonly context: RepositoryContext; readonly input: CoefficientUpdateInput }> = [];
    const repo: Pick<HearingIntakeRepository, 'updateCoefficients'> = {
      async updateCoefficients(context, input) {
        calls.push({ context, input });
        return { ...SAMPLE_ROW, ...input, updatedBy: context.actorId ?? 'system-default' };
      },
    };
    const context: RepositoryContext = { tenantId: 'tenant-1', actorId: 'workspace-admin-1' };

    const result = await updateCoefficientsForFeature(repo, context, { annualHours: 1_920 });

    expect(calls).toStrictEqual([{ context, input: { annualHours: 1_920 } }]);
    expect(result).toMatchObject({ annualHours: 1_920, updatedBy: 'workspace-admin-1' });
  });
});
