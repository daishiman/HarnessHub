// HF-A3-SLO-003: SLO 観測状態の実測検証器の契約テスト。
//
// ここで固定したいのは「測っていない期間を可用性へ算入しない」ことと、
// 「実測が伴わない verdict を宣言できない」ことの 2 点。どちらも破ると
// SLO が実態と無関係な緑になる (release-notes.md §5 の実例)。
//
// script は .mjs で tsconfig が allowJs:false のため静的 import できない。
// 変数指定子の動的 import は TS が静的解決しないので、型検査を通したまま実体を読める。

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/verify-slo-observation.mjs');

/** 実測基準時刻。status_history の当日 (2026-08-01) は進行中として扱われる */
const NOW = new Date('2026-08-01T05:00:00.000Z');
const RESOURCE_ID = '8978911';
const SUBDOMAIN = 'harness-hub-daishimanju';
const APPLIED_AT = '2026-07-27T20:46:37.686Z';

interface HistoryEntry {
  day: string;
  status: string;
  downtime_duration: number;
  maintenance_duration: number;
}

interface Measurement {
  current_status: string | null;
  monitor_live: boolean;
  reported_availability_30d: number | null;
  history_days: number;
  completed_days: number;
  observed_days: number;
  excluded_today: number;
  observed_window_seconds: number;
  external_downtime_seconds: number;
  external_maintenance_seconds: number;
  external_availability: number | null;
  first_observed_day: string | null;
  last_observed_day: string | null;
}

interface DerivedVerdict {
  status: string;
  observation_started_at: string | null;
  first_monthly_verdict_due_at: string | null;
  blocker: string | null;
}

interface ScriptModule {
  VERDICT: Record<string, string>;
  buildStatusPageUrl(subdomain: string): string;
  selectResource(payload: unknown, resourceExternalId: string): Record<string, unknown>;
  measureObservation(attributes: Record<string, unknown>, options: { now: Date }): Measurement;
  deriveVerdict(input: { measurement: Measurement; config: unknown; dashboard: unknown }): DerivedVerdict;
  compareVerdict(
    derived: DerivedVerdict,
    declared: unknown,
  ): { consistent: boolean; mismatches: { field: string; declared: unknown; measured: unknown }[] };
  summarizeErrorBudget(input: { measurement: Measurement; dashboard: unknown }): {
    error_budget_consumed_ratio: number;
    triggered_actions: string[];
    external_only_target_met: boolean | null;
  };
  runVerifyCli(argv: string[], dependencies: Record<string, unknown>): Promise<number>;
}

let script: ScriptModule;
let workDir = '';
let monitorsPath = '';
let dashboardPath = '';

beforeAll(async () => {
  script = (await import(pathToFileURL(SCRIPT).href)) as unknown as ScriptModule;
});

/** n 日前 (UTC) の YYYY-MM-DD。n=0 は NOW と同じ日 = 進行中の当日 */
function dayBefore(n: number): string {
  return new Date(Date.parse('2026-08-01T00:00:00.000Z') - n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * 新しい順ではなく古い順 (Better Stack の実応答と同じ) で status_history を作る。
 * @param spec 末尾が当日になるよう、日数分の状態を古い順に並べる
 */
function historyOf(spec: { status: string; downtime?: number }[]): HistoryEntry[] {
  const total = spec.length;
  return spec.map((entry, index) => ({
    day: dayBefore(total - 1 - index),
    status: entry.status,
    downtime_duration: entry.downtime ?? 0,
    maintenance_duration: 0,
  }));
}

function repeat(status: string, count: number): { status: string }[] {
  return Array.from({ length: count }, () => ({ status }));
}

function attributesOf(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    resource_id: 4_724_920,
    resource_type: 'Monitor',
    public_name: 'Harness Hub',
    availability: 0.988,
    status: 'operational',
    status_history: historyOf([...repeat('not_monitored', 23), ...repeat('operational', 7)]),
    ...overrides,
  };
}

function snapshotOf(attributes: Record<string, unknown>, resourceId = RESOURCE_ID): unknown {
  return {
    data: { id: '256797', type: 'status_page', attributes: { subdomain: SUBDOMAIN, aggregate_state: 'operational' } },
    included: [
      // 同じ status page に同居する無関係な resource。誤って拾わないことを主張するために置く
      {
        id: '8978910',
        type: 'status_page_resource',
        attributes: { public_name: 'senpai-lab.com', status: 'operational' },
      },
      { id: '341238', type: 'status_page_section', attributes: { name: 'Current status by service' } },
      { id: resourceId, type: 'status_page_resource', attributes },
    ],
  };
}

function configFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    application_state: 'applied',
    applied_at: APPLIED_AT,
    monitor: { local_id: 'hub-health', external_id: '4724920' },
    status_page: {
      external_id: '256797',
      resource_local_ids: ['hub-health'],
      resource_external_ids: { 'hub-health': RESOURCE_ID },
      request: { payload: { subdomain: SUBDOMAIN, history: 30, published: true } },
    },
    ...overrides,
  };
}

function dashboardFixture(verdict: Record<string, unknown>): Record<string, unknown> {
  return {
    slo: {
      availability_target_monthly: 0.995,
      allowed_downtime_30_day_seconds: 12_960,
      minimum_observation_days_for_final_verdict: 30,
    },
    error_budget_policy: [
      { consumed_ratio: 0.7, action: 'warn_and_prioritize_reliability' },
      { consumed_ratio: 1, action: 'freeze_public_feature_changes' },
    ],
    verdict,
  };
}

function collectingVerdict(): Record<string, unknown> {
  return {
    status: 'collecting',
    observation_started_at: APPLIED_AT,
    first_monthly_verdict_due_at: '2026-08-26T20:46:37.686Z',
    blocker: null,
  };
}

describe('公開 status page からの実測', () => {
  it('subdomain から認証不要の JSON エンドポイントを組み立てる', () => {
    expect(script.buildStatusPageUrl(SUBDOMAIN)).toBe(`https://${SUBDOMAIN}.betteruptime.com/index.json`);
  });

  it('subdomain が無ければ実測を試みずに落とす', () => {
    expect(() => script.buildStatusPageUrl('')).toThrow(/subdomain/);
  });

  it('resource は external_id で同定し、public_name の改名では取り違えない', () => {
    const renamed = attributesOf({ public_name: 'Hub (renamed on dashboard)' });
    const selected = script.selectResource(snapshotOf(renamed), RESOURCE_ID);
    expect(selected.resource_id).toBe(4_724_920);
    expect(selected.public_name).toBe('Hub (renamed on dashboard)');
  });

  it('関連付けが外れて resource が存在しないときは健全と読まずに落とす', () => {
    expect(() => script.selectResource(snapshotOf(attributesOf(), '9999999'), RESOURCE_ID)).toThrow(/8978911/);
  });
});

describe('観測実績の算定', () => {
  it('not_monitored の日を観測窓へ算入しない', () => {
    // 23 日は未監視、7 日は監視。うち末尾 1 日は進行中の当日なので完了日は 6 日
    const measurement = script.measureObservation(attributesOf(), { now: NOW });
    expect(measurement.history_days).toBe(30);
    expect(measurement.completed_days).toBe(29);
    expect(measurement.observed_days).toBe(6);
    expect(measurement.observed_window_seconds).toBe(6 * 86_400);
  });

  it('進行中の当日を観測窓から外す', () => {
    const measurement = script.measureObservation(attributesOf(), { now: NOW });
    expect(measurement.excluded_today).toBe(1);
    expect(measurement.last_observed_day).toBe(dayBefore(1));
  });

  it('観測された日の downtime だけを合計して可用性を出す', () => {
    const attributes = attributesOf({
      status_history: historyOf([
        // 未監視期間にも downtime が載っていた場合、それを算入すると測っていない障害を数えてしまう
        { status: 'not_monitored', downtime: 99_999 },
        { status: 'operational' },
        { status: 'downtime', downtime: 8_640 },
        { status: 'operational' },
      ]),
    });
    const measurement = script.measureObservation(attributes, { now: NOW });
    expect(measurement.observed_days).toBe(2);
    expect(measurement.external_downtime_seconds).toBe(8_640);
    expect(measurement.external_availability).toBeCloseTo(1 - 8_640 / (2 * 86_400), 10);
  });

  it('観測日が 0 なら可用性を数値化せず null にする', () => {
    const attributes = attributesOf({
      status_history: historyOf(repeat('not_monitored', 30)),
      status: 'not_monitored',
    });
    const measurement = script.measureObservation(attributes, { now: NOW });
    expect(measurement.observed_days).toBe(0);
    expect(measurement.external_availability).toBeNull();
    expect(measurement.monitor_live).toBe(false);
  });

  it('status が取得できないときは稼働中と読まない', () => {
    const measurement = script.measureObservation(attributesOf({ status: undefined }), { now: NOW });
    expect(measurement.current_status).toBeNull();
    expect(measurement.monitor_live).toBe(false);
  });
});

describe('verdict の導出 (fail-closed)', () => {
  const dashboard = dashboardFixture(collectingVerdict());

  it('未適用なら観測は始まっていない', () => {
    const measurement = script.measureObservation(attributesOf(), { now: NOW });
    const derived = script.deriveVerdict({
      measurement,
      config: configFixture({ application_state: 'pending_credentials', applied_at: null }),
      dashboard,
    });
    expect(derived.status).toBe(script.VERDICT.NOT_STARTED);
    expect(derived.observation_started_at).toBeNull();
  });

  it('監視が止まっていれば観測開始日時を持たせない', () => {
    const measurement = script.measureObservation(
      attributesOf({ status: 'not_monitored', status_history: historyOf(repeat('not_monitored', 30)) }),
      { now: NOW },
    );
    const derived = script.deriveVerdict({ measurement, config: configFixture(), dashboard });
    expect(derived.status).toBe(script.VERDICT.BLOCKED);
    expect(derived.observation_started_at).toBeNull();
    expect(derived.blocker).toBe('better-stack-monitor-paused');
  });

  it('稼働中でも必要日数に満たなければ collecting のままにする', () => {
    const measurement = script.measureObservation(attributesOf(), { now: NOW });
    const derived = script.deriveVerdict({ measurement, config: configFixture(), dashboard });
    expect(derived.status).toBe(script.VERDICT.COLLECTING);
    expect(derived.observation_started_at).toBe(APPLIED_AT);
    expect(derived.first_monthly_verdict_due_at).toBe('2026-08-26T20:46:37.686Z');
  });

  it('30 日揃っても外形だけでは達成扱いにしない (qa-019)', () => {
    const attributes = attributesOf({ status_history: historyOf(repeat('operational', 31)) });
    const measurement = script.measureObservation(attributes, { now: NOW });
    expect(measurement.observed_days).toBe(30);
    const derived = script.deriveVerdict({ measurement, config: configFixture(), dashboard });
    expect(derived.status).toBe(script.VERDICT.PENDING_APPLICATION_ERROR_RATE);
    expect(derived.blocker).toBe('workers-analytics-5xx-rate-not-collected');
  });

  it('applied なのに applied_at が無い設定は観測開始を捏造せずに落とす', () => {
    const measurement = script.measureObservation(attributesOf(), { now: NOW });
    expect(() => script.deriveVerdict({ measurement, config: configFixture({ applied_at: null }), dashboard })).toThrow(
      /applied_at/,
    );
  });
});

describe('宣言との突合', () => {
  it('宣言が実測とずれている項目を全件返す', () => {
    const measurement = script.measureObservation(attributesOf(), { now: NOW });
    const derived = script.deriveVerdict({
      measurement,
      config: configFixture(),
      dashboard: dashboardFixture(collectingVerdict()),
    });
    const comparison = script.compareVerdict(derived, {
      status: 'collection_blocked',
      observation_started_at: null,
      first_monthly_verdict_due_at: null,
      blocker: 'better-stack-monitor-paused',
    });
    expect(comparison.consistent).toBe(false);
    expect(comparison.mismatches.map((mismatch) => mismatch.field).sort()).toStrictEqual([
      'blocker',
      'first_monthly_verdict_due_at',
      'observation_started_at',
      'status',
    ]);
  });

  it('一致していれば差分を出さない', () => {
    const measurement = script.measureObservation(attributesOf(), { now: NOW });
    const derived = script.deriveVerdict({
      measurement,
      config: configFixture(),
      dashboard: dashboardFixture(collectingVerdict()),
    });
    expect(script.compareVerdict(derived, collectingVerdict()).consistent).toBe(true);
  });
});

describe('エラーバジェット', () => {
  it('消費率に応じて宣言済みの運用アクションを発火する', () => {
    const attributes = attributesOf({
      status_history: historyOf([
        ...repeat('not_monitored', 26),
        { status: 'downtime', downtime: 9_100 },
        ...repeat('operational', 3),
      ]),
    });
    const measurement = script.measureObservation(attributes, { now: NOW });
    const summary = script.summarizeErrorBudget({ measurement, dashboard: dashboardFixture(collectingVerdict()) });
    // 9100 / 12960 = 0.702 で 70% 閾値だけを超える
    expect(summary.error_budget_consumed_ratio).toBeCloseTo(9_100 / 12_960, 10);
    expect(summary.triggered_actions).toStrictEqual(['warn_and_prioritize_reliability']);
  });

  it('観測日が 0 のときは目標達成を判定しない', () => {
    const measurement = script.measureObservation(
      attributesOf({ status: 'not_monitored', status_history: historyOf(repeat('not_monitored', 30)) }),
      { now: NOW },
    );
    const summary = script.summarizeErrorBudget({ measurement, dashboard: dashboardFixture(collectingVerdict()) });
    expect(summary.external_only_target_met).toBeNull();
  });

  it('観測途中では外形単独の目標達成可否を判定しない', () => {
    const measurement = script.measureObservation(attributesOf(), { now: NOW });
    expect(measurement.observed_days).toBe(6);
    const summary = script.summarizeErrorBudget({ measurement, dashboard: dashboardFixture(collectingVerdict()) });
    expect(summary.external_only_target_met).toBeNull();
  });
});

describe('CLI', () => {
  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'verify-slo-'));
    monitorsPath = path.join(workDir, 'better-stack.monitors.json');
    dashboardPath = path.join(workDir, 'slo-dashboard.json');
    writeFileSync(monitorsPath, `${JSON.stringify(configFixture(), null, 2)}\n`, 'utf8');
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  function fetchReturning(payload: unknown, { ok = true, status = 200, body = '' } = {}) {
    return async () => ({
      ok,
      status,
      text: async () => (body === '' ? JSON.stringify(payload) : body),
    });
  }

  function run(argv: string[], fetchImpl: unknown): Promise<number> {
    return script.runVerifyCli(argv, {
      monitorsConfigPath: monitorsPath,
      dashboardPath,
      repoRoot: workDir,
      fetchImpl,
      now: NOW,
      log: () => undefined,
      logError: () => undefined,
    });
  }

  it('宣言が実測と一致していれば 0 で通す', async () => {
    writeFileSync(dashboardPath, `${JSON.stringify(dashboardFixture(collectingVerdict()), null, 2)}\n`, 'utf8');
    expect(await run([], fetchReturning(snapshotOf(attributesOf())))).toBe(0);
  });

  it('監視が止まっているのに collecting を宣言していたら落とす', async () => {
    writeFileSync(dashboardPath, `${JSON.stringify(dashboardFixture(collectingVerdict()), null, 2)}\n`, 'utf8');
    const stopped = attributesOf({ status: 'not_monitored', status_history: historyOf(repeat('not_monitored', 30)) });
    expect(await run([], fetchReturning(snapshotOf(stopped)))).toBe(1);
  });

  it('--write と --json で verdict と証跡を同じ実測へ収束させる', async () => {
    writeFileSync(
      dashboardPath,
      `${JSON.stringify(dashboardFixture({ status: 'collection_blocked', observation_started_at: null, first_monthly_verdict_due_at: null, blocker: 'better-stack-monitor-paused' }), null, 2)}\n`,
      'utf8',
    );
    expect(await run(['--write', '--json', 'evidence.json'], fetchReturning(snapshotOf(attributesOf())))).toBe(0);
    const updated = JSON.parse(readFileSync(dashboardPath, 'utf8')) as { verdict: Record<string, unknown> };
    expect(updated.verdict.status).toBe('collecting');
    expect(updated.verdict.observation_started_at).toBe(APPLIED_AT);
    expect(updated.verdict.blocker).toBeNull();
    expect(String(updated.verdict.$comment)).toContain('observed_days=6/30');

    const evidence = JSON.parse(readFileSync(path.join(workDir, 'evidence.json'), 'utf8')) as {
      verdict: { consistent: boolean; declared: Record<string, unknown>; mismatches: unknown[] };
    };
    expect(evidence.verdict.consistent).toBe(true);
    expect(evidence.verdict.declared.status).toBe('collecting');
    expect(evidence.verdict.mismatches).toStrictEqual([]);
  });

  it('--json に秘密を含まない証跡を書き出す', async () => {
    writeFileSync(dashboardPath, `${JSON.stringify(dashboardFixture(collectingVerdict()), null, 2)}\n`, 'utf8');
    expect(await run(['--json', 'evidence.json'], fetchReturning(snapshotOf(attributesOf())))).toBe(0);
    const raw = readFileSync(path.join(workDir, 'evidence.json'), 'utf8');
    expect(raw).not.toMatch(/uptime\.betterstack\.com\/api\/v\d+\/heartbeat\//);
    expect(raw).not.toMatch(/"(?:api_token|token|authorization)"\s*:/i);
    const report = JSON.parse(raw) as {
      source: { authenticated: boolean };
      observation_progress: { complete: boolean };
    };
    expect(report.source.authenticated).toBe(false);
    expect(report.observation_progress.complete).toBe(false);
  });

  it('status page が非公開などで JSON を返さないときは判定せず 2 を返す', async () => {
    writeFileSync(dashboardPath, `${JSON.stringify(dashboardFixture(collectingVerdict()), null, 2)}\n`, 'utf8');
    expect(await run([], fetchReturning(null, { body: '<!DOCTYPE html><html></html>' }))).toBe(2);
  });

  it('status page が HTTP エラーのときは判定せず 2 を返す', async () => {
    writeFileSync(dashboardPath, `${JSON.stringify(dashboardFixture(collectingVerdict()), null, 2)}\n`, 'utf8');
    expect(await run([], fetchReturning(null, { ok: false, status: 404, body: 'not found' }))).toBe(2);
  });

  it('--json の出力先が無ければ証跡を捏造せず 2 を返す', async () => {
    writeFileSync(dashboardPath, `${JSON.stringify(dashboardFixture(collectingVerdict()), null, 2)}\n`, 'utf8');
    expect(await run(['--json'], fetchReturning(snapshotOf(attributesOf())))).toBe(2);
  });
});
