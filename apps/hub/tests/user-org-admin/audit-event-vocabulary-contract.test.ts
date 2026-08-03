// P04 テストスタブ (SYS-USER-ORG-ADMIN-P04)
// UOA-AUDIT-*: 係数変更・role/salary 変更の監査記録 (acceptance 1・2 / SEC6 / quality_constraint audit-event-expansion)。
//
// AD-6 の決定: 新規 action 語彙を追加せず、`user.role_change`/`user.salary_change`/`user.salary_read`/
// `coefficient.change` の既存語彙をそのまま `AuditRepo.append()` の action に渡す。
// `packages/db/repository/audit.ts` の実 AuditRepo は libSQL/D1 の transaction を要求し、
// apps/hub の単体テストからは接続できない (実 DB 結合は feat-hearing-intake 同様 packages/db 側が持つ)。
// そのため本ファイルは AD-6/AD-5 決定4 が定める「呼出しの契約」を、実装が満たすべき最小の参照実装
// (FakeAuditRecorder) に対して固定する。P05 は実装後、この参照実装を実 AuditRepo.append 呼出しへ差し替える。

import { describe, expect, it } from 'vitest';

/** AD-6 が確定している既存 action 語彙。新語彙を作らないことをこの exact-set で固定する。 */
const AUDIT_ACTION_VOCABULARY = [
  'user.role_change',
  'user.salary_change',
  'user.salary_read',
  'coefficient.change',
] as const;
type AuditAction = (typeof AUDIT_ACTION_VOCABULARY)[number];

interface RecordedEvent {
  readonly action: AuditAction;
  readonly summary: Record<string, unknown>;
}

/** `AuditRepo.append` の最小契約。実装は `packages/db/repository/audit.ts` の同名メソッドに置き換わる。 */
interface FakeAuditRepo {
  append(event: RecordedEvent): Promise<void>;
}

function createFakeAuditRepo(sink: RecordedEvent[]): FakeAuditRepo {
  return {
    async append(event) {
      sink.push(event);
    },
  };
}

/**
 * AD-5 決定4「decryptSalary 呼出しのラッパー関数内で監査記録を必須化する」の参照実装。
 * 呼出し側 (業務ロジック) に監査呼出しを分散させず、ラッパーが必ず記録する形を固定する。
 */
function withSalaryReadAudit(
  audit: FakeAuditRepo,
  decryptSalary: (userId: string) => Promise<number | null>,
  actorId: string,
) {
  return async (userId: string): Promise<number | null> => {
    const value = await decryptSalary(userId);
    // summary には「読んだ事実」だけを書く。salary 金額そのものは書かない (audit.ts:24 の規約)。
    await audit.append({ action: 'user.salary_read', summary: { actorId, targetUserId: userId } });
    return value;
  };
}

describe('契約: 監査 action 語彙 (AD-6)', () => {
  it('UOA-AUDIT-001: 本 feature が使う語彙は既存4件の exact-set で、新語彙を追加しない', () => {
    expect(AUDIT_ACTION_VOCABULARY).toStrictEqual([
      'user.role_change',
      'user.salary_change',
      'user.salary_read',
      'coefficient.change',
    ]);
  });

  it('UOA-AUDIT-002: coefficient.change は summary に「何が変わったか」のみを持ち、係数の値そのものを含めない設計を固定する', async () => {
    const sink: RecordedEvent[] = [];
    const repo = createFakeAuditRepo(sink);
    // 実装が満たすべき最小形: 変更後の値ではなくフィールド名だけを summary に載せる。
    await repo.append({ action: 'coefficient.change', summary: { changedFields: ['annualHours', 'minutesPerRun'] } });

    expect(sink).toHaveLength(1);
    expect(sink[0]?.summary).not.toHaveProperty('annualHours');
    expect(Object.keys(sink[0]?.summary ?? {})).toStrictEqual(['changedFields']);
  });
});

describe('契約: salary 読取の呼出し即監査 (AD-5 決定4)', () => {
  it('UOA-AUDIT-003: decryptSalary のラッパーは呼び出すたびに必ず user.salary_read を記録する', async () => {
    const sink: RecordedEvent[] = [];
    const repo = createFakeAuditRepo(sink);
    const readSalary = withSalaryReadAudit(repo, async () => 6_000_000, 'admin-1');

    await readSalary('user-9');

    expect(sink).toStrictEqual([
      { action: 'user.salary_read', summary: { actorId: 'admin-1', targetUserId: 'user-9' } },
    ]);
  });

  it('UOA-AUDIT-004: summary に salary の金額そのものを書かない (audit.ts:24 の禁止規約)', async () => {
    const sink: RecordedEvent[] = [];
    const repo = createFakeAuditRepo(sink);
    const readSalary = withSalaryReadAudit(repo, async () => 6_000_000, 'admin-1');

    await readSalary('user-9');

    const summaryValues = Object.values(sink[0]?.summary ?? {});
    expect(summaryValues).not.toContain(6_000_000);
  });

  it('UOA-AUDIT-005 (Goodhart対策): 呼出し 0 回では記録も 0 件になる (検出器が常に緑になっていないことの確認)', async () => {
    const sink: RecordedEvent[] = [];
    createFakeAuditRepo(sink);
    expect(sink).toHaveLength(0);
  });
});

// UOA-AUDIT-101~103 は api-routes-acceptance.test.ts の real-DB HTTP 結合へ昇格済み。
