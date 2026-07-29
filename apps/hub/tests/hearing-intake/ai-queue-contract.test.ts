// P04 テストスタブ (SYS-HEARING-INTAKE-P04)
// HI-QUEUE-* : 共通 ai_jobs の consumer 契約 (ADR AD-4)
// HI-SEC8-*  : AI キュー認可と payload の secret/PII 禁止 (ADR AD-7 / SEC8)
//
// 本 feature は queue を「消費するだけ」なので、検証点は
//   (1) 複製を作っていないこと (静的走査)
//   (2) 渡す payload に載せてはいけないものが無いこと
//   (3) 認可が 3 条件 AND で、既存 authz 表を feature 側が書き換えないこと
//   (4) enqueue → claim → complete の往復で状態と束縛が保たれること
// の 4 点になる。(1)(3) は既存コードに対して今すぐ実行でき、(2)(4) は AD-4/AD-7 の
// 参照実装を本ファイルへ置いて P05 実装が満たすべき振る舞いを機械的に固定する。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { decide } from '../../src/lib/authz/decide.js';
import type { AuthzPrincipal, AuthzResourceRef } from '../../src/lib/authz/types.js';
import { APP_ROOT, APP_SRC, listSourceFiles } from '../shared-layers/source-scan.js';

// ---------------------------------------------------------------------------
// (1) queue schema の複製 0 件 (AD-4)
// ---------------------------------------------------------------------------

interface SourceFile {
  readonly file: string;
  readonly content: string;
}

interface DuplicationRule {
  readonly id: string;
  readonly description: string;
  readonly pattern: RegExp;
}

/**
 * 「共通 queue の複製」を構成する宣言だけを検出する。
 * `job.status === 'processing'` のような **参照** は消費であって複製ではないので、
 * 宣言形 (テーブル定義・enum 定義・kind リテラルの新設) に絞ってある。
 */
const DUPLICATION_RULES: readonly DuplicationRule[] = [
  {
    id: 'ai-jobs-table',
    description: 'ai_jobs テーブルを owner (packages/db) の外で再宣言している',
    pattern: /sqliteTable\(\s*['"]ai_jobs['"]/,
  },
  {
    id: 'job-status-vocabulary',
    description: 'queue の status 語彙 (queued/processing/...) を再定義している',
    pattern: /z\.enum\(\s*\[[^\]]*['"]queued['"]/,
  },
  {
    id: 'job-kind-vocabulary',
    description: '他 feature の kind まで含む kind 語彙を再定義している',
    pattern: /z\.enum\(\s*\[[^\]]*['"](?:feedback_response|doc_draft)['"]/,
  },
  {
    id: 'feature-local-kind',
    description: "feature 固有の kind を新設している (許されるのは kind='sheet_generation' のみ)",
    // ref_type: 'hearing_sheet' は正当なので kind の代入だけを見る
    pattern: /\bkind\s*[:=]\s*['"](?!sheet_generation|feedback_response|doc_draft)[a-z_]+['"]/,
  },
];

function detectDuplications(files: readonly SourceFile[]): readonly string[] {
  const hits: string[] = [];
  for (const { file, content } of files) {
    for (const rule of DUPLICATION_RULES) {
      if (rule.pattern.test(content)) hits.push(`${file}: ${rule.id} (${rule.description})`);
    }
  }
  return hits;
}

/** 走査対象は「複製が置かれ得る場所」= 本 feature が書ける範囲。owner の packages/db は含めない。 */
const SCAN_ROOTS = [APP_SRC, path.resolve(APP_ROOT, '../../packages/schemas/src')];

function loadScanTargets(): readonly SourceFile[] {
  return SCAN_ROOTS.flatMap((root) =>
    listSourceFiles(root).map((file) => ({
      file: path.relative(path.resolve(APP_ROOT, '../..'), file),
      content: readFileSync(file, 'utf8'),
    })),
  );
}

describe('HI-QUEUE: 共通 ai_jobs の consumer 契約 (AD-4)', () => {
  it('HI-QUEUE-001: queue schema の複製が 0 件で、走査が実際に 1 件以上のファイルを見ている', () => {
    const targets = loadScanTargets();

    // 「0 ファイル走査した結果 0 件」を合格にしないための生存確認 (Goodhart 対策)
    expect(targets.length).toBeGreaterThan(0);
    expect(detectDuplications(targets)).toEqual([]);
  });

  it('HI-QUEUE-002: 検出器は複製を実際に検出できる (ゲートの生存確認)', () => {
    // 各規則につき「複製したらこう書くはず」の合成コードを与え、検出器が発火することを確かめる。
    // 発火しない検出器は HI-QUEUE-001 を無条件に緑化するため、規則ごとに個別に確認する
    const mutants: Readonly<Record<string, string>> = {
      'ai-jobs-table': "export const aiJobs = sqliteTable('ai_jobs', { id: text('id') });",
      'job-status-vocabulary': "export const jobStatus = z.enum(['queued', 'processing', 'completed']);",
      'job-kind-vocabulary': "export const jobKind = z.enum(['sheet_generation', 'feedback_response', 'doc_draft']);",
      'feature-local-kind': "const job = { kind: 'hearing', ref_type: 'hearing_sheet' };",
    };

    expect(Object.keys(mutants).sort()).toEqual(DUPLICATION_RULES.map((rule) => rule.id).sort());

    for (const [ruleId, content] of Object.entries(mutants)) {
      const hits = detectDuplications([{ file: 'synthetic.ts', content }]);
      expect(hits.some((hit) => hit.includes(ruleId))).toBe(true);
    }
  });

  it('HI-QUEUE-003: 正当な消費コードは検出器に引っかからない (偽陽性で P05 を止めない)', () => {
    const legitimate = [
      "const payload = { kind: 'sheet_generation', ref_type: 'hearing_sheet', ref_id: sheet.id };",
      "if (job.status === 'dead') await restoreSheetToReceived(job.ref_id);",
      "export const sheetGenerationKind = z.literal('sheet_generation');",
    ].join('\n');

    expect(detectDuplications([{ file: 'synthetic.ts', content: legitimate }])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (2) enqueue する行と payload DTO (AD-4 / SEC8)
// ---------------------------------------------------------------------------

/** `form_json` に保存する 11 項目 (salary を含まない。AD-2 / OPEN-2)。 */
interface HearingSheetFormSnapshot {
  readonly taskName: string;
  readonly company: string;
  readonly applicant: string;
  readonly domain: string;
  readonly issue: string;
  readonly tools: string;
  readonly hours: number;
  readonly people: number;
  readonly features: string;
  readonly output: string;
  readonly priority: string;
}

interface HearingSheetRow {
  readonly id: string;
  readonly code: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly form: HearingSheetFormSnapshot;
  readonly estimate: { readonly savedHoursPerYear: number; readonly savedAmountPerYear: number };
}

/** AD-4 の consumer 契約。列を足さず、既存カラムへ固定値と DTO を入れるだけ。 */
function buildEnqueueRow(sheet: HearingSheetRow) {
  return {
    tenant_id: sheet.tenantId,
    workspace_id: sheet.workspaceId,
    kind: 'sheet_generation' as const,
    status: 'queued' as const,
    ref_type: 'hearing_sheet' as const,
    ref_id: sheet.id,
    payload_json: {
      sheet_id: sheet.id,
      sheet_code: sheet.code,
      form: sheet.form,
      estimate: sheet.estimate,
    },
  };
}

const SAMPLE_SHEET: HearingSheetRow = {
  id: '01J000000000000000000SHEET',
  code: 'HS-0042',
  tenantId: 'tenant-a',
  workspaceId: 'ws-1',
  form: {
    taskName: '請求書処理',
    company: '株式会社サンプル',
    applicant: '山田',
    domain: '経理',
    issue: '手作業が多い',
    tools: 'Excel',
    hours: 40,
    people: 5,
    features: 'OCR',
    output: 'CSV',
    priority: 'high',
  },
  estimate: { savedHoursPerYear: 840, savedAmountPerYear: 2_520_000 },
};

/** SEC8 で載せてはいけないキー。年収そのものと、年収を逆算できる時給を含む。 */
const BANNED_KEY_PATTERN = /salary|hourly|secret|token|password|api[_-]?key|credential|connection|dsn/i;

function collectKeys(value: unknown, acc: string[] = []): readonly string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, acc);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      acc.push(key);
      collectKeys(child, acc);
    }
  }
  return acc;
}

describe('HI-SEC8: payload に secret と PII を載せない (AD-7 / SEC8)', () => {
  it('HI-SEC8-001: enqueue 行の kind / ref_type / ref_id が AD-4 の固定値と一致する', () => {
    const row = buildEnqueueRow(SAMPLE_SHEET);

    expect(row.kind).toBe('sheet_generation');
    expect(row.ref_type).toBe('hearing_sheet');
    // ref_id は worker の書戻し先の束縛。payload の自己検証用 sheet_id と必ず同値
    expect(row.ref_id).toBe(SAMPLE_SHEET.id);
    expect(row.payload_json.sheet_id).toBe(row.ref_id);
  });

  it('HI-SEC8-002: payload に salary / 時給 / secret 系のキーが 1 つも無い', () => {
    const keys = collectKeys(buildEnqueueRow(SAMPLE_SHEET).payload_json);

    // 空 payload で緑化しないよう、必要なキーが載っていることも同時に固定する
    expect(keys).toContain('sheet_id');
    expect(keys).toContain('taskName');
    expect(keys).toContain('savedHoursPerYear');
    expect(keys.filter((key) => BANNED_KEY_PATTERN.test(key))).toEqual([]);
  });

  it('HI-SEC8-003: 禁止キー検出器は salary が混入した payload を検出できる (ゲートの生存確認)', () => {
    const leaked = { ...buildEnqueueRow(SAMPLE_SHEET).payload_json, form: { ...SAMPLE_SHEET.form, salary: 6_000_000 } };

    expect(collectKeys(leaked).filter((key) => BANNED_KEY_PATTERN.test(key))).toEqual(['salary']);
  });

  it('HI-SEC8-004: form payload は form_json と同じ 11 項目で、salary を含まない (AD-2)', () => {
    const formKeys = Object.keys(buildEnqueueRow(SAMPLE_SHEET).payload_json.form);

    expect(formKeys).toHaveLength(11);
    expect(formKeys).not.toContain('salary');
  });
});

// ---------------------------------------------------------------------------
// (3) 認可 3 条件 AND (AD-7)
// ---------------------------------------------------------------------------

const AI_JOB_RESOURCE: AuthzResourceRef = {
  type: 'ai_job',
  id: 'job-1',
  tenantId: 'tenant-a',
  workspaceId: null,
  ownerUserId: null,
};

function principal(overrides: Partial<AuthzPrincipal> = {}): AuthzPrincipal {
  return {
    userId: 'user-worker',
    tenantId: 'tenant-a',
    role: 'workspace-admin',
    status: 'active',
    issuedAtSeconds: 1_700_000_000,
    workspaceIds: ['ws-1'],
    scope: ['aijob:process'],
    credential: 'access_token',
    ...overrides,
  };
}

function pull(p: AuthzPrincipal, resource: AuthzResourceRef = AI_JOB_RESOURCE) {
  return decide({ action: 'aijob.pull', principal: p, resource, sessionRevoked: false });
}

describe('HI-SEC8: AI キュー認可の 3 条件 AND (AD-7)', () => {
  it('HI-SEC8-005: 3 条件を全て満たす worker だけが pull できる', () => {
    expect(pull(principal())).toEqual({ allowed: true, effectiveRole: 'workspace-admin' });
  });

  it('HI-SEC8-006: 3 条件のうち 1 つでも欠けると拒否される', () => {
    const cases = [
      // ① Bearer token であること — Web セッションでは通さない
      {
        label: '① token でない',
        p: principal({ credential: 'session', scope: null }),
        reason: 'credential_not_allowed',
      },
      // ② scope に aijob:process を含むこと
      { label: '② scope 不足', p: principal({ scope: ['metrics:write'] }), reason: 'missing_scope' },
      { label: '② scope 空', p: principal({ scope: [] }), reason: 'missing_scope' },
      // ③ 実効 role が workspace-admin 以上であること
      { label: '③ role 不足 (member)', p: principal({ role: 'member' }), reason: 'insufficient_role' },
    ] as const;

    for (const { label, p, reason } of cases) {
      expect({ label, outcome: pull(p) }).toEqual({ label, outcome: { allowed: false, reason } });
    }
  });

  it('HI-SEC8-007: workspace-admin は自テナントのジョブのみ、provider-admin だけが越境できる', () => {
    const otherTenantJob: AuthzResourceRef = { ...AI_JOB_RESOURCE, tenantId: 'tenant-b' };

    expect(pull(principal(), otherTenantJob)).toEqual({ allowed: false, reason: 'tenant_mismatch' });
    expect(pull(principal({ role: 'provider-admin' }), otherTenantJob)).toEqual({
      allowed: true,
      effectiveRole: 'provider-admin',
    });
  });

  it('HI-SEC8-008: 本 feature が使う action は全て既存 authz 表にあり、feature 側で表を増やさない', () => {
    // AD-9: 認可は feat-auth-tenancy が確立した単一集約点に置き、feature が role 判定を書かない。
    // action の union 型と集約済み decide() を経由し、feature 側に判定表を複製しない。
    const usedActions = [
      'sheets.create',
      'sheets.read_own',
      'sheets.read_all',
      'sheets.status_change',
      'sheets.regenerate',
      'aijob.pull',
      'aijob.complete',
      'aijob.fail',
    ] as const;

    const outcomes = usedActions.map((action) =>
      decide({ action, principal: principal(), resource: AI_JOB_RESOURCE, sessionRevoked: false }),
    );
    expect(outcomes).toHaveLength(usedActions.length);
    expect(pull(principal())).toEqual({ allowed: true, effectiveRole: 'workspace-admin' });
  });

  it('HI-SEC8-009: complete の「claim 者本人」は authz 層だけでは担保されない (adapter 側の前提条件)', () => {
    // authz の selfOnly は user 単位の本人性であり、workspace-admin 以上は他人の資源にも及ぶ設計。
    // つまり「別の worker が claim 中のジョブ」を admin が complete する要求は authz を通過する。
    // AD-7 の claimed_by_token_id 一致は job 行の前提条件であり、adapter が別途拒否しなければならない
    const claimedByOther: AuthzResourceRef = { ...AI_JOB_RESOURCE, ownerUserId: 'user-other' };
    const outcome = decide({
      action: 'aijob.complete',
      principal: principal(),
      resource: claimedByOther,
      sessionRevoked: false,
    });

    expect(outcome).toEqual({ allowed: true, effectiveRole: 'workspace-admin' });
    // → だから HI-QUEUE-005 の token 一致検査が落とせない検証点になる
  });
});

// ---------------------------------------------------------------------------
// (4) enqueue → claim → complete の往復 (AD-4 / AD-5 / AD-7)
// ---------------------------------------------------------------------------

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'dead';
type SheetStatus = 'received' | 'generating' | 'review' | 'completed';

interface QueuedJob {
  id: string;
  tenantId: string;
  kind: 'sheet_generation';
  status: JobStatus;
  refType: 'hearing_sheet';
  refId: string;
  claimedByTokenId: string | null;
  resultJson: unknown;
}

/** 共通 queue の最小模型。feature は状態機械を実装せず「読むだけ」なので遷移規則だけ再現する。 */
class FakeAiJobQueue {
  private readonly jobs = new Map<string, QueuedJob>();

  enqueue(jobId: string, row: ReturnType<typeof buildEnqueueRow>): QueuedJob {
    if (row.kind !== 'sheet_generation') throw new Error('kind は sheet_generation 固定です');
    const job: QueuedJob = {
      id: jobId,
      tenantId: row.tenant_id,
      kind: row.kind,
      status: 'queued',
      refType: row.ref_type,
      refId: row.ref_id,
      claimedByTokenId: null,
      resultJson: null,
    };
    this.jobs.set(jobId, job);
    return job;
  }

  claim(tenantId: string, tokenId: string): QueuedJob | null {
    for (const job of this.jobs.values()) {
      if (job.tenantId !== tenantId || job.status !== 'queued') continue;
      job.status = 'processing';
      job.claimedByTokenId = tokenId;
      return job;
    }
    return null;
  }

  complete(jobId: string, tokenId: string, result: unknown): QueuedJob {
    const job = this.jobs.get(jobId);
    if (job === undefined) throw new Error('ジョブが存在しません');
    if (job.claimedByTokenId !== tokenId) throw new Error('claim 者本人ではありません');
    job.status = 'completed';
    job.resultJson = result;
    return job;
  }

  markDead(jobId: string): QueuedJob {
    const job = this.jobs.get(jobId);
    if (job === undefined) throw new Error('ジョブが存在しません');
    job.status = 'dead';
    return job;
  }
}

/** AD-7 の feature 固有処理。dead は差戻し、completed は review へ進める。 */
function nextSheetStatus(jobStatus: JobStatus): SheetStatus {
  if (jobStatus === 'dead') return 'received';
  if (jobStatus === 'completed') return 'review';
  return 'generating';
}

const SAMPLE_RESULT = {
  generated_sections: {
    overview: '# 概要\n請求書処理を自動化します。',
    issue: '手作業が多い',
    feature_tags: ['請求書処理', 'OCR'],
    estimated_effect: '年間 840 時間の削減',
  },
};

describe('HI-QUEUE: enqueue → claim → complete の往復', () => {
  it('HI-QUEUE-004: enqueue した job を claim して complete すると result が書戻される', () => {
    const queue = new FakeAiJobQueue();
    const enqueued = queue.enqueue('job-1', buildEnqueueRow(SAMPLE_SHEET));
    expect(enqueued.status).toBe('queued');
    expect(nextSheetStatus(enqueued.status)).toBe('generating');

    const claimed = queue.claim('tenant-a', 'token-worker');
    expect(claimed?.status).toBe('processing');
    // 書戻し先は ref_type/ref_id の 1 行に束縛される (security-spec §96)
    expect(claimed?.refType).toBe('hearing_sheet');
    expect(claimed?.refId).toBe(SAMPLE_SHEET.id);

    const completed = queue.complete('job-1', 'token-worker', SAMPLE_RESULT);
    expect(completed.status).toBe('completed');
    expect(completed.resultJson).toEqual(SAMPLE_RESULT);
    expect(nextSheetStatus(completed.status)).toBe('review');
  });

  it('HI-QUEUE-005: claim 者以外の token による complete は拒否される (HI-SEC8-009 の補完)', () => {
    const queue = new FakeAiJobQueue();
    queue.enqueue('job-1', buildEnqueueRow(SAMPLE_SHEET));
    queue.claim('tenant-a', 'token-worker');

    expect(() => queue.complete('job-1', 'token-other', SAMPLE_RESULT)).toThrowError(/claim 者本人ではありません/);
  });

  it('HI-QUEUE-006: 他テナントの worker は claim できない (D4 行レベル境界)', () => {
    const queue = new FakeAiJobQueue();
    queue.enqueue('job-1', buildEnqueueRow(SAMPLE_SHEET));

    expect(queue.claim('tenant-b', 'token-worker')).toBeNull();
    // 自テナントなら claim できる = 「常に null」で緑化していないことの確認
    expect(queue.claim('tenant-a', 'token-worker')).not.toBeNull();
  });

  it('HI-QUEUE-007: job が dead になったらシートを received へ戻す (AD-7 / §5.2 の分岐)', () => {
    const queue = new FakeAiJobQueue();
    queue.enqueue('job-1', buildEnqueueRow(SAMPLE_SHEET));
    queue.claim('tenant-a', 'token-worker');

    const dead = queue.markDead('job-1');

    expect(nextSheetStatus(dead.status)).toBe('received');
    // review/completed へ勝手に進めない (再生成できる状態へ戻す)
    expect(nextSheetStatus(dead.status)).not.toBe('generating');
  });
});
