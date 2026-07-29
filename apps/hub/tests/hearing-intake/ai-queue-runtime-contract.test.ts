// P05 実装を対象とする queue/runtime 受入契約。
// 参照模型と分離し、500 行以下の単一責務ファイルとして保つ。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { APP_ROOT, APP_SRC } from '../shared-layers/source-scan.js';

const sheetRepository = () =>
  readFileSync(path.resolve(APP_ROOT, '../../packages/db/repository/hearing-intake.ts'), 'utf8');
const queueRepository = () =>
  readFileSync(path.resolve(APP_ROOT, '../../packages/db/repository/hearing-intake-queue.ts'), 'utf8');

describe('HI-QUEUE / HI-SEC8: P05 実装後の受入契約', () => {
  it('HI-QUEUE-101: POST sheets の server 試算値が transaction 内の sheet/job へ渡る', () => {
    const service = readFileSync(path.resolve(APP_SRC, 'features/hearing-intake/service.ts'), 'utf8');
    const repo = sheetRepository();
    expect(service).toContain('estimateHearingSheet(input.request, coefficients)');
    expect(service).toContain('estimateJson: JSON.stringify(estimate)');
    expect(service).toContain('buildSheetGenerationPayload');
    expect(repo).toContain('transaction(async (tx)');
    expect(repo).toContain('db.insert(hearingSheets)');
    expect(repo).toContain('db.insert(aiJobs)');
  });

  it('HI-QUEUE-102: create transaction は enqueue 例外を握り潰さず rollback へ伝播する', () => {
    const repo = sheetRepository();
    const method = repo.slice(repo.indexOf('async createSheetAndEnqueue'), repo.indexOf('async listSheets'));
    expect(method).toContain('input.buildPayloadJson(id, code)');
    expect(method).not.toContain('catch');
  });

  it('HI-QUEUE-103: 通知は createSheetAndEnqueue 完了後に呼ばれ、通知例外だけを処理する', () => {
    const service = readFileSync(path.resolve(APP_SRC, 'features/hearing-intake/service.ts'), 'utf8');
    expect(service.indexOf('repository.createSheetAndEnqueue')).toBeLessThan(
      service.indexOf('notifications.notifyReceipt'),
    );
    expect(service).toContain('通知は transaction 外の補助経路');
  });

  it('HI-QUEUE-104: regenerate が同じ sheet id を ref_id にして sheet_generation を再投入する', () => {
    const repo = sheetRepository();
    const method = repo.slice(repo.indexOf('async regenerate'));
    expect(method).toContain('refId: sheet.id');
    expect(method).toContain('enqueueValues');
    expect(repo).toContain("kind: 'sheet_generation'");
    expect(method).toContain("status: 'generating'");
  });

  it('HI-QUEUE-105: ai_jobs migration に hearing 固有列が無く共通列だけを持つ', () => {
    const migration = readFileSync(
      path.resolve(APP_ROOT, '../../packages/db/migrations/0002_hearing-intake-ai-queue.sql'),
      'utf8',
    );
    const block = migration.slice(migration.indexOf('CREATE TABLE `ai_jobs`'), migration.indexOf('CREATE INDEX'));
    for (const required of ['kind', 'status', 'payload_json', 'result_json', 'ref_type', 'ref_id']) {
      expect(block).toContain(`\`${required}\``);
    }
    expect(block).not.toMatch(/hearing|sheet_code|form_json|estimate_json/);
  });

  it('HI-SEC8-101: pull/complete/fail route は withAuthz を通り role 比較を持たない', () => {
    const files = [
      'app/api/v1/ai-jobs/pull/route.ts',
      'app/api/v1/ai-jobs/[id]/complete/route.ts',
      'app/api/v1/ai-jobs/[id]/fail/route.ts',
    ];
    for (const file of files) {
      const source = readFileSync(path.resolve(APP_SRC, file), 'utf8');
      expect(source).toContain('withAuthz');
      expect(source).not.toMatch(/principal\.role|effectiveRole\s*===/);
    }
  });

  it('HI-SEC8-102: cross-tenant pull は request resource tenant を withAuthz の共通監査へ渡す', () => {
    const pullRoute = readFileSync(path.resolve(APP_SRC, 'app/api/v1/ai-jobs/pull/route.ts'), 'utf8');
    const wrapper = readFileSync(path.resolve(APP_SRC, 'lib/authz/with-authz.ts'), 'utf8');
    expect(pullRoute).toContain("type: 'ai_job_queue'");
    expect(pullRoute).toContain('workspaceId: authz.resource.workspaceId');
    expect(wrapper).toContain("action: 'provider.cross_tenant_access'");
    expect(wrapper).toContain('tenantId: resource.tenantId');
  });

  it('HI-SEC8-103: complete route が成功時に ai_job.complete を必ず監査記録する', () => {
    const route = readFileSync(path.resolve(APP_SRC, 'app/api/v1/ai-jobs/[id]/complete/route.ts'), 'utf8');
    expect(route).toContain("action: 'ai_job.complete'");
    expect(route.indexOf('completeSheetGenerationJob')).toBeLessThan(route.indexOf('authz.audit.record'));
  });

  it('HI-SEC8-104: complete は workspace と job.refId と現在の aiJobId へ束縛される', () => {
    const repo = queueRepository();
    const method = repo.slice(
      repo.indexOf('async completeSheetGenerationJob'),
      repo.indexOf('async failSheetGenerationJob'),
    );
    expect(method).toContain('eq(hearingSheets.workspaceId, job.workspaceId)');
    expect(method).toContain('eq(hearingSheets.id, job.refId)');
    expect(method).toContain('eq(hearingSheets.aiJobId, job.id)');
    expect(method).toContain('eq(hearingSheets.tenantId, context.tenantId)');
  });
});
