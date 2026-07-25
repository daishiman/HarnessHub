import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

interface BetterStackConfig {
  provider: string;
  application_state: string;
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

  it('外部適用前は applied と月次合格を主張しない', () => {
    expect(monitoring.application_state).toBe('pending_credentials');
    expect(monitoring.applied_at).toBeNull();
    expect(monitoring.monitor.external_id).toBeNull();
    expect(monitoring.heartbeat.external_id).toBeNull();
    expect(monitoring.status_page.external_id).toBeNull();
    expect(dashboard.verdict).toStrictEqual({
      status: 'collecting_not_started',
      observation_started_at: null,
      first_monthly_verdict_due_at: null,
      $comment: expect.any(String),
    });
  });
});
