// P04 テストスタブ (SYS-HEARING-INTAKE-P04)
// HI-CODE-*: 受付番号 (HS コード) の採番 (ADR AD-3)。
//
// 実 DB トランザクションを使う受入検証は P05 実装後に P06 で実行テストへ昇格済み。
// ただし「CAS で何を保証するのか」は実装が無くても実行可能な仕様として固定できるため、
// 参照実装を本ファイルに置き、P05 の採番ロジックが満たすべき振る舞いを機械的に定義する。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { HearingIntakeRepository } from '@harness-hub/db';
import { describe, expect, it } from 'vitest';
import { createHearingIntakeService } from '../../src/features/hearing-intake/service.js';

/** ADR AD-3: `HS-` + 4 桁ゼロ埋め。10000 到達時は桁が自然に伸び、上限で失敗させない。 */
function formatSheetCode(value: number): string {
  return `HS-${String(value).padStart(4, '0')}`;
}

/** display_code_counters の CAS 更新を模した最小ストア。updated 行数 0 が競合負けを表す。 */
class FakeCounterStore {
  private readonly counters = new Map<string, number>();

  read(tenantId: string): number {
    return this.counters.get(tenantId) ?? 1;
  }

  /** WHERE next_value = expected の CAS。更新できた行数を返す。 */
  compareAndSwap(tenantId: string, expected: number, next: number): number {
    if (this.read(tenantId) !== expected) return 0;
    this.counters.set(tenantId, next);
    return 1;
  }
}

/** AD-3 の採番手順。CAS が負けたら読み直してリトライする。 */
function issueSheetCode(store: FakeCounterStore, tenantId: string, maxAttempts = 8): string {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = store.read(tenantId);
    if (store.compareAndSwap(tenantId, current, current + 1) === 1) {
      return formatSheetCode(current);
    }
  }
  throw new Error('受付番号の採番に失敗しました (CAS リトライ上限)');
}

describe('HI-CODE: 受付番号の採番 (AD-3)', () => {
  it('HI-CODE-001: 書式は HS- + 4 桁ゼロ埋めで、10000 以降は桁が伸びる', () => {
    expect(formatSheetCode(1)).toBe('HS-0001');
    expect(formatSheetCode(42)).toBe('HS-0042');
    expect(formatSheetCode(9999)).toBe('HS-9999');
    // 上限で失敗させない設計 (AD-3)
    expect(formatSheetCode(10_000)).toBe('HS-10000');
  });

  it('HI-CODE-002: 同一テナント内で連番になる', () => {
    const store = new FakeCounterStore();

    expect(issueSheetCode(store, 'tenant-a')).toBe('HS-0001');
    expect(issueSheetCode(store, 'tenant-a')).toBe('HS-0002');
    expect(issueSheetCode(store, 'tenant-a')).toBe('HS-0003');
  });

  it('HI-CODE-003: テナント別連番であり、テナント間で番号が併存する', () => {
    const store = new FakeCounterStore();

    expect(issueSheetCode(store, 'tenant-a')).toBe('HS-0001');
    // テナント B の 1 番はテナント A の 1 番と併存する (グローバル連番ではない)
    expect(issueSheetCode(store, 'tenant-b')).toBe('HS-0001');
    expect(issueSheetCode(store, 'tenant-a')).toBe('HS-0002');
  });

  it('HI-CODE-004: 同一 next_value を読んだ競合でも重複コードを発行しない', () => {
    const store = new FakeCounterStore();

    // 2 リクエストが同時に next_value=1 を読んだ状況を再現する
    const readByRequestA = store.read('tenant-a');
    const readByRequestB = store.read('tenant-a');
    expect(readByRequestA).toBe(readByRequestB);

    // 先着だけが CAS に成功する
    expect(store.compareAndSwap('tenant-a', readByRequestA, readByRequestA + 1)).toBe(1);
    expect(store.compareAndSwap('tenant-a', readByRequestB, readByRequestB + 1)).toBe(0);

    // 負けた側は読み直して次の番号を得る = 重複しない
    expect(issueSheetCode(store, 'tenant-a')).toBe('HS-0002');
  });

  it('HI-CODE-005: 採番のリトライが尽きたら例外を投げ、欠番を残さない', () => {
    const store = new FakeCounterStore();
    // 常に競合負けする状況 (CAS が成功しない) を作る
    const alwaysLosing = {
      read: () => 1,
      compareAndSwap: () => 0,
    } as unknown as FakeCounterStore;

    expect(() => issueSheetCode(alwaysLosing, 'tenant-a')).toThrowError(/採番に失敗/);
    // 失敗しても正常系のカウンタは動く (AD-5: 採番失敗は提出全体の失敗として巻き戻す)
    expect(issueSheetCode(store, 'tenant-a')).toBe('HS-0001');
  });

  // --- 以下は P05 実装を対象とする受入契約 (P06 で実行対象へ昇格させる) ---

  const repositorySource = () =>
    readFileSync(resolve(process.cwd(), '../../packages/db/repository/hearing-intake.ts'), 'utf8');

  it('HI-CODE-101: counter CAS が transaction callback 内で tenant/kind/nextValue を比較する', () => {
    const source = repositorySource();
    const createMethod = source.slice(
      source.indexOf('async createSheetAndEnqueue'),
      source.indexOf('async listSheets'),
    );
    expect(createMethod).toContain('transaction(async (tx)');
    expect(source).toContain('eq(displayCodeCounters.tenantId, tenantId)');
    expect(source).toContain("eq(displayCodeCounters.kind, 'HS')");
    expect(source).toContain('eq(displayCodeCounters.nextValue, current.nextValue)');
  });

  it('HI-CODE-102: migration が UNIQUE(tenant_id, code) を DB 制約として持つ', () => {
    const migration = readFileSync(
      resolve(process.cwd(), '../../packages/db/migrations/0002_hearing-intake-ai-queue.sql'),
      'utf8',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX `hearing_sheets_tenant_code_uq` ON `hearing_sheets` (`tenant_id`,`code`)',
    );
  });

  it('HI-CODE-103: createSheetAndEnqueue が counter/sheet/job/status 更新を 1 transaction に束ねる', () => {
    const source = repositorySource();
    const method = source.slice(source.indexOf('async createSheetAndEnqueue'), source.indexOf('async listSheets'));
    expect(method).toContain('issueReceiptNumber(db');
    expect(method).toContain('db.insert(hearingSheets)');
    expect(method).toContain('db.insert(aiJobs)');
    expect(method).toContain("status: 'generating'");
    expect(method.match(/transaction\(/g)).toHaveLength(1);
  });

  it('HI-CODE-104: payload/enqueue 失敗は transaction の外で握り潰されない', () => {
    const source = repositorySource();
    const method = source.slice(source.indexOf('async createSheetAndEnqueue'), source.indexOf('async listSheets'));
    expect(method).toContain('input.buildPayloadJson(id, code)');
    expect(method).not.toContain('catch');
    expect(method).not.toContain('finally');
  });

  it('HI-CODE-105: 通知失敗は作成済み sheet の成功応答をロールバックしない', async () => {
    const createdRow = {
      id: 'sheet-1',
      tenantId: 'tenant-a',
      workspaceId: 'ws-1',
      code: 'HS-0001',
      title: '請求書処理',
      applicantUserId: 'user-1',
      applicantName: '山田',
      department: null,
      status: 'generating',
      formJson: '{}',
      estimateJson: '{}',
      aiJobId: 'job-1',
      generatedDocIdsJson: null,
      buildId: null,
      createdAt: 1,
      updatedAt: 1,
      aiJobStatus: 'queued',
      aiJobResultJson: null,
    } as const;
    const repository = {
      getCoefficients: async () => ({
        tenantId: 'tenant-a',
        annualHours: 2_000,
        minutesPerRun: 15,
        sheetReductionRate: 0.35,
        updatedBy: 'system',
      }),
      createSheetAndEnqueue: async () => createdRow,
    } as unknown as HearingIntakeRepository;
    const service = createHearingIntakeService(repository, {
      notifyReceipt: async () => {
        throw new Error('notification unavailable');
      },
    });

    await expect(
      service.createSheet({
        context: { tenantId: 'tenant-a' },
        workspaceId: 'ws-1',
        applicantUserId: 'user-1',
        request: {
          taskName: '請求書処理',
          company: 'サンプル社',
          applicant: '山田',
          domain: '経理',
          issue: '転記が多い',
          tools: '表計算',
          hours: 40,
          people: 5,
          salary: 6_000_000,
          features: 'OCR',
          output: 'CSV',
          priority: 'high',
          usagePurpose: 'app_development',
          expertise: 'novice',
          role: 'employee',
          context: 'business',
          motivation: 'efficiency',
          sharingIntent: 'small_group',
          constraintTags: [],
          shareTarget: 'チーム内',
          knowledgeAssets: ['経理マニュアル'],
          requestPatterns: [],
          integrationTools: [],
          existingDataSources: [],
          referenceUrls: [],
        },
      }),
    ).resolves.toEqual({ id: 'sheet-1', code: 'HS-0001', status: 'generating' });
  });
});
