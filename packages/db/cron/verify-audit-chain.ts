// 監査 hash chain の日次検証 cron ジョブ (security-spec §5.4.4 / P12 interface stub)。
// 不一致・seq 欠番を検出したら throw し、cron 基盤 (feat-hub-foundation) が failed として記録・通知する。
// 通知本体 (provider-admin への `audit.chain_broken`) は通知 feature の責務で、ここでは検出のみを行う。

import { verifyAuditChain } from '../backup/verify';
import type { CoreAdapter } from '../repository/db';
import type { CronJobContextLike, CronJobLike } from './export-daily';

export interface VerifyAuditChainDeps {
  readonly adapter: CoreAdapter;
}

export class AuditChainBrokenError extends Error {
  constructor(readonly tenants: readonly string[]) {
    // 秘匿値を含めない (tenant id のみ)。詳細は DB 上の再検証で得る。
    super(`audit chain 検証失敗: ${tenants.join(', ')}`);
    this.name = 'AuditChainBrokenError';
  }
}

export function createVerifyAuditChainJob(deps: VerifyAuditChainDeps): CronJobLike {
  return {
    id: 'db.verify-audit-chain',
    async run(_context: CronJobContextLike) {
      const results = await verifyAuditChain(deps.adapter);
      const broken = results.filter((r) => !r.ok).map((r) => r.tenantId);
      if (broken.length > 0) throw new AuditChainBrokenError(broken);
    },
  };
}
