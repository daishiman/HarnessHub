import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const MONITORING_FILES = [
  'apps/hub/monitoring/better-stack.monitors.json',
  'apps/hub/monitoring/slo-dashboard.json',
] as const;

/** 適用状態はこの 2 値だけ。中間状態を作ると「半分適用」を緑で通してしまう */
const APPLICATION_STATES = ['pending_credentials', 'applied'] as const;

/** heartbeat の ping URL。これ自体が cron 成功を偽装できる秘密なので成果物へ出さない */
const HEARTBEAT_URL_PATTERN = /uptime\.betterstack\.com\/api\/v\d+\/heartbeat\//;

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

interface BetterStackConfig {
  provider: string;
  application_state: (typeof APPLICATION_STATES)[number];
  applied_at: string | null;
  monitor: {
    external_id: string | null;
    request: {
      endpoint: string;
      payload: {
        url: string;
        monitor_type: string;
        http_method: string;
        check_frequency: number;
        expected_status_codes: number[];
        paused: boolean;
      };
    };
  };
  heartbeat: {
    external_id: string | null;
    secret_binding: string;
    request: {
      endpoint: string;
      payload: { period: number; grace: number; paused: boolean };
    };
  };
  status_page: {
    external_id: string | null;
    resource_local_ids: string[];
    resource_external_ids: Record<string, string | null>;
    request: { endpoint: string; payload: { history: number; published: boolean } };
    resource_request: {
      endpoint_template: string;
      payload_template: { resource_type: string; widget_type: string };
    };
  };
}

interface SloConfig {
  slo: {
    availability_target_monthly: number;
    window: string;
    allowed_downtime_30_day_seconds: number;
    measurement_interval_seconds: number;
    minimum_observation_days_for_final_verdict: number;
    calculation: {
      external_availability_source: string;
      application_error_source: string;
      formula: string;
    };
  };
  error_budget_policy: { consumed_ratio: number; action: string }[];
  panels: { id: string; source: string }[];
  verdict: {
    status: string;
    observation_started_at: string | null;
    first_monthly_verdict_due_at: string | null;
    blocker?: string | null;
  };
}

describe('HF-A3-SLO-001: production monitoring configuration', () => {
  const monitoring = readJson('apps/hub/monitoring/better-stack.monitors.json') as BetterStackConfig;
  const dashboard = readJson('apps/hub/monitoring/slo-dashboard.json') as SloConfig;

  it('production /health を Better Stack で 3 分間隔・HTTP 200 として監視する', () => {
    expect(monitoring.provider).toBe('better-stack');
    expect(monitoring.monitor.request.endpoint).toBe('https://uptime.betterstack.com/api/v2/monitors');
    expect(monitoring.monitor.request.payload).toMatchObject({
      url: 'https://harness-hub.daishimanju.workers.dev/health',
      monitor_type: 'expected_status_code',
      http_method: 'get',
      check_frequency: 180,
      expected_status_codes: [200],
      paused: false,
    });
  });

  it('日次 cron の heartbeat と secret binding を宣言する', () => {
    expect(monitoring.heartbeat.request.endpoint).toBe('https://uptime.betterstack.com/api/v2/heartbeats');
    expect(monitoring.heartbeat.request.payload).toMatchObject({
      period: 86_400,
      grace: 3_600,
      paused: false,
    });
    expect(monitoring.heartbeat.secret_binding).toBe('CRON_HEARTBEAT_URL');
  });

  it('status page に 30 日の履歴と health monitor の関連付けを宣言する', () => {
    expect(monitoring.status_page.request.endpoint).toBe('https://uptime.betterstack.com/api/v2/status-pages');
    expect(monitoring.status_page.request.payload).toMatchObject({ history: 30, published: true });
    expect(monitoring.status_page.resource_local_ids).toContain('hub-health');
    expect(monitoring.status_page.resource_request.endpoint_template).toContain('{status_page_id}/resources');
    expect(monitoring.status_page.resource_request.payload_template).toMatchObject({
      resource_type: 'Monitor',
      widget_type: 'history',
    });
  });

  it('99.5% SLO を Better Stack と Workers Analytics の合成で算定する', () => {
    expect(dashboard.slo).toMatchObject({
      availability_target_monthly: 0.995,
      window: 'calendar_month',
      allowed_downtime_30_day_seconds: 12_960,
      measurement_interval_seconds: 180,
      minimum_observation_days_for_final_verdict: 30,
    });
    expect(dashboard.slo.calculation.external_availability_source).toContain('better-stack');
    expect(dashboard.slo.calculation.application_error_source).toContain('cloudflare-workers');
    expect(dashboard.slo.calculation.formula).toContain('external_downtime_seconds');
    expect(dashboard.slo.calculation.formula).toContain('worker_5xx_requests');
  });

  it('エラーバジェット 70% 警告・100% 変更凍結を fail-closed で保持する', () => {
    expect(dashboard.error_budget_policy).toStrictEqual([
      { consumed_ratio: 0.7, action: 'warn_and_prioritize_reliability' },
      { consumed_ratio: 1, action: 'freeze_public_feature_changes' },
    ]);
    expect(dashboard.panels.map((panel) => panel.id).sort()).toStrictEqual([
      'availability-timeline',
      'workers-analytics',
    ]);
  });

  it('適用状態は宣言された 2 値のいずれかである', () => {
    expect(APPLICATION_STATES).toContain(monitoring.application_state);
  });

  // 「未適用を前提に書く」と適用後にテストが用済みになり、「適用済みを前提に書く」と
  // 適用前に恒常 red になる。どちらの状態でも成立し、かつ中間の食い違い
  // (monitor だけ採番済みで application_state は pending のまま等) を落とす形にする。
  it('external_id / applied_at / 観測開始が application_state と矛盾しない', () => {
    const externalIds = [
      monitoring.monitor.external_id,
      monitoring.heartbeat.external_id,
      monitoring.status_page.external_id,
      monitoring.status_page.resource_external_ids['hub-health'],
    ];

    if (monitoring.application_state === 'pending_credentials') {
      expect(monitoring.applied_at).toBeNull();
      expect(externalIds).toStrictEqual([null, null, null, null]);
      expect(dashboard.verdict.status).toBe('collecting_not_started');
      expect(dashboard.verdict.observation_started_at).toBeNull();
      expect(dashboard.verdict.first_monthly_verdict_due_at).toBeNull();
      return;
    }

    // applied 側: 4 資源すべてが採番済みで、適用時刻が観測開始と一致していること
    for (const externalId of externalIds) {
      expect(typeof externalId).toBe('string');
      expect(externalId).not.toBe('');
    }
    expect(monitoring.applied_at).toMatch(ISO_INSTANT);
    expect(['collecting', 'collection_blocked']).toContain(dashboard.verdict.status);
    if (dashboard.verdict.status === 'collection_blocked') {
      expect(dashboard.verdict.observation_started_at).toBeNull();
      expect(dashboard.verdict.first_monthly_verdict_due_at).toBeNull();
      expect(dashboard.verdict.blocker).toBe('better-stack-monitor-paused');
      return;
    }

    expect(dashboard.verdict.observation_started_at).toBe(monitoring.applied_at);

    // 初回月次判定は観測開始 + minimum_observation_days。ここを短く詰めると
    // 「30 日集める前に 99.5% 達成と言う」経路が開く (受け入れ条件 3)
    const startedAt = Date.parse(dashboard.verdict.observation_started_at ?? '');
    const dueAt = Date.parse(dashboard.verdict.first_monthly_verdict_due_at ?? '');
    expect(Number.isNaN(startedAt)).toBe(false);
    expect(dueAt - startedAt).toBe(dashboard.slo.minimum_observation_days_for_final_verdict * 86_400_000);
  });

  it('観測期間の満了前に月次 SLO 達成を主張しない', () => {
    const dueAt = Date.parse(dashboard.verdict.first_monthly_verdict_due_at ?? '');
    if (Number.isNaN(dueAt) || Date.now() >= dueAt) return;
    // 判定予定日より前に collecting 以外へ進んでいたら、根拠なく達成を宣言している
    expect(dashboard.verdict.status).toBe('collecting');
  });

  it('秘密値 (heartbeat URL・API token) を設定ファイルへ書かない', () => {
    for (const relativePath of MONITORING_FILES) {
      const raw = readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      expect(raw).not.toMatch(HEARTBEAT_URL_PATTERN);
      // token は「値そのもの」を検出できないため、置き場としての key 名の出現を禁じる
      expect(raw).not.toMatch(/"(?:api_token|token|authorization)"\s*:/i);
    }
    // heartbeat URL の受け渡し口は Worker secret 名の宣言だけであること
    expect(monitoring.heartbeat.secret_binding).toBe('CRON_HEARTBEAT_URL');
    expect(JSON.stringify(monitoring)).not.toContain('/api/v1/heartbeat/');
  });
});
