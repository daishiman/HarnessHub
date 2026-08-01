#!/usr/bin/env node
// SLO 観測状態の実測検証器 (HarnessHub-37h.15 / feat-hub-foundation)。
//
// 何をするか:
//   Better Stack の**公開** status page (認証不要の /index.json) から、監視対象 resource の
//   現在状態と日次の downtime 時系列を実測し、apps/hub/monitoring/slo-dashboard.json の
//   verdict が実態と一致しているかを突合する。--write 指定時は実測へ verdict を収束させる。
//
// なぜ apply 器と別にするのか:
//   apply-better-stack-monitoring.mjs は「こう設定したい」を書き込む器で、Uptime API token を要求する。
//   本 script は「実際にどうなっているか」を読むだけの器で、token を一切要求しない。
//   両者を混ぜると『適用したのだから稼働しているはず』という申告が実測の代わりに使われる。
//   実際に 2026-07-27 の適用では 4 資源すべての採番に成功したが、その事実は
//   「時系列が収集されている」ことを何ら保証しなかった (release-notes.md §5)。
//
// なぜ HTML ではなく /index.json を読むのか:
//   公開 status page の HTML に出る resource アイコンは **30 日履歴全体の代表**であり、
//   現在状態ではない。実際、明らかに稼働中 (availability=1) の resource でも履歴の大半が
//   not_monitored なら not_monitored のアイコンが描画される。HTML の見た目から
//   「monitor が paused」と読むと誤判定する。/index.json は resource ごとに
//   status / availability / status_history を構造化して返すので、こちらだけを正とする。
//
// 秘密の扱い:
//   本 script は公開 URL しか触らない。API token も heartbeat URL も読まないし受け取らない。
//   出力する証跡にも秘密は含まれない (受け入れ条件 4)。
//
// 使い方:
//   node apps/hub/scripts/verify-slo-observation.mjs
//   node apps/hub/scripts/verify-slo-observation.mjs --json docs/features/feat-hub-foundation/evidence/slo-observation.json
//   node apps/hub/scripts/verify-slo-observation.mjs --write
//
// exit code: 0 = 宣言と実測が一致 / 1 = 不一致 (要是正) / 2 = 実測そのものが取得できない

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');

export const MONITORS_CONFIG_PATH = resolve(HUB_ROOT, 'monitoring/better-stack.monitors.json');
export const SLO_DASHBOARD_PATH = resolve(HUB_ROOT, 'monitoring/slo-dashboard.json');

/** 公開 status page の origin。subdomain は better-stack.monitors.json が正本 */
export const STATUS_PAGE_ORIGIN_SUFFIX = '.betteruptime.com';

const DAY_SECONDS = 86_400;
const DAY_MS = 86_400_000;

/**
 * 観測窓へ算入しない日次 status。
 *
 * not_monitored は「その日は測っていない」であって「その日は無停止だった」ではない。
 * 分母へ入れると、測っていない期間が可用性を薄めて **実際より良い数字**を作る。
 * monitor 作成直後は履歴が 30 日分 not_monitored で埋まるため、この扱いを誤ると
 * 適用した瞬間に「30 日分の可用性 100%」を主張できてしまう。
 */
export const UNOBSERVED_DAY_STATUSES = new Set(['not_monitored']);

/** slo-dashboard.json の verdict.status が取りうる値 */
export const VERDICT = {
  /** 監視資源が未適用。観測はまだ始まっていない */
  NOT_STARTED: 'collecting_not_started',
  /** 資源はあるが監視が止まっており、時系列が伸びない */
  BLOCKED: 'collection_blocked',
  /** 監視稼働中。ただし必要日数に未達で最終判定はできない */
  COLLECTING: 'collecting',
  /**
   * 外形の観測日数は揃ったが、Workers analytics の 5xx 率が未取得で最終判定できない。
   * infrastructure-spec §9 / qa-019 は「外形監視単独を正としない」と定めており、
   * 外形だけで 99.5% 達成を主張する経路をこの状態で塞ぐ。
   */
  PENDING_APPLICATION_ERROR_RATE: 'observation_complete_pending_application_error_rate',
};

export const VERDICT_VALUES = Object.values(VERDICT);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// 実測の取得
// ---------------------------------------------------------------------------

/**
 * 公開 status page の JSON エンドポイントを組み立てる。
 * @param {string} subdomain better-stack.monitors.json の status_page.request.payload.subdomain
 */
export function buildStatusPageUrl(subdomain) {
  if (typeof subdomain !== 'string' || subdomain.trim().length === 0) {
    throw new Error('status_page.request.payload.subdomain が設定ファイルにありません');
  }
  return `https://${subdomain}${STATUS_PAGE_ORIGIN_SUFFIX}/index.json`;
}

/**
 * 公開 status page のスナップショットを取得する。認証は使わない。
 * @returns {Promise<{ url: string, httpStatus: number, payload: unknown }>}
 */
export async function fetchStatusPageSnapshot({ subdomain, fetchImpl = globalThis.fetch }) {
  const url = buildStatusPageUrl(subdomain);
  const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`公開 status page ${url} が HTTP ${response.status} を返しました`);
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    // HTML が返る = subdomain 違いや status page 非公開。実測できない状態なので通さない
    throw new Error(`公開 status page ${url} の応答が JSON ではありません (status page が非公開の可能性)`);
  }
  return { url, httpStatus: response.status, payload };
}

/**
 * スナップショットから対象 resource を 1 件選ぶ。
 *
 * 同定は status page resource の external_id を主鍵にする。public_name はダッシュボードから
 * 改名でき、改名された瞬間に別 resource を掴むか「無い」と判断して実測を失う。
 *
 * @param {unknown} payload /index.json の応答
 * @param {string} resourceExternalId better-stack.monitors.json の status_page.resource_external_ids[local_id]
 */
export function selectResource(payload, resourceExternalId) {
  if (typeof resourceExternalId !== 'string' || resourceExternalId.length === 0) {
    throw new Error('status_page.resource_external_ids に対象 resource の external_id がありません');
  }
  const included = Array.isArray(payload?.included) ? payload.included : [];
  const matched = included.find(
    (item) => item?.type === 'status_page_resource' && String(item?.id ?? '') === resourceExternalId,
  );
  if (matched === undefined) {
    // 見つからないのは「関連付けが外れた」状態。無いものを健全と読むと監視喪失を見逃す
    throw new Error(`公開 status page に status page resource ${resourceExternalId} が見つかりません`);
  }
  return matched.attributes ?? {};
}

// ---------------------------------------------------------------------------
// 実測からの導出
// ---------------------------------------------------------------------------

/** now を UTC の YYYY-MM-DD へ。status_history の day と同じ粒度で比較するため */
export function toUtcDay(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * status_history から観測実績を数える。
 *
 * 進行中の当日を除外するのは分母の健全性のため。当日をまるごと 86400 秒として数えると、
 * まだ経過していない時間を「無停止だった時間」として可用性へ算入し、実際より良い数字が出る。
 * 完了した日だけを数えれば、分子 (downtime) と分母 (86400) の粒度が揃う。
 *
 * @param {Record<string, unknown>} attributes status page resource の attributes
 * @param {{ now: Date }} options
 */
export function measureObservation(attributes, { now }) {
  const history = Array.isArray(attributes?.status_history) ? attributes.status_history : [];
  const today = toUtcDay(now);

  const completedDays = history.filter((entry) => typeof entry?.day === 'string' && entry.day < today);
  const observedDays = completedDays.filter((entry) => !UNOBSERVED_DAY_STATUSES.has(String(entry?.status ?? '')));

  const downtimeSeconds = observedDays.reduce((sum, entry) => sum + (Number(entry?.downtime_duration) || 0), 0);
  const maintenanceSeconds = observedDays.reduce((sum, entry) => sum + (Number(entry?.maintenance_duration) || 0), 0);
  const observedWindowSeconds = observedDays.length * DAY_SECONDS;

  const currentStatus = typeof attributes?.status === 'string' ? attributes.status : null;

  return {
    current_status: currentStatus,
    // 現在 monitor が実際に測っているか。null (取得不能) は稼働と読まない
    monitor_live: currentStatus !== null && !UNOBSERVED_DAY_STATUSES.has(currentStatus),
    // status page が公表する 30 日窓の可用性。観測外の日を含むため参考値であり判定には使わない
    reported_availability_30d: typeof attributes?.availability === 'number' ? attributes.availability : null,
    history_days: history.length,
    completed_days: completedDays.length,
    observed_days: observedDays.length,
    excluded_today: history.length - completedDays.length,
    observed_window_seconds: observedWindowSeconds,
    external_downtime_seconds: downtimeSeconds,
    external_maintenance_seconds: maintenanceSeconds,
    external_availability: observedWindowSeconds > 0 ? 1 - Math.min(1, downtimeSeconds / observedWindowSeconds) : null,
    first_observed_day: observedDays[0]?.day ?? null,
    last_observed_day: observedDays.at(-1)?.day ?? null,
  };
}

/**
 * 実測から「あるべき verdict」を導く。判定不能側へ倒す (fail-closed)。
 *
 * @param {{ measurement: object, config: object, dashboard: object }} input
 */
export function deriveVerdict({ measurement, config, dashboard }) {
  const requiredDays = Number(dashboard?.slo?.minimum_observation_days_for_final_verdict);
  if (!Number.isFinite(requiredDays) || requiredDays <= 0) {
    throw new Error('slo.minimum_observation_days_for_final_verdict が正の数ではありません');
  }

  if (config?.application_state !== 'applied') {
    return {
      status: VERDICT.NOT_STARTED,
      observation_started_at: null,
      first_monthly_verdict_due_at: null,
      blocker: null,
    };
  }
  if (!measurement.monitor_live) {
    return {
      status: VERDICT.BLOCKED,
      observation_started_at: null,
      first_monthly_verdict_due_at: null,
      blocker: 'better-stack-monitor-paused',
    };
  }

  // 監視は動いている。観測開始は適用時刻を正本にする (apply 器が書き戻した値と一致させ、
  // 再実行のたびに 30 日判定日が後ろへずれるのを防ぐ)
  const appliedAt = Date.parse(config?.applied_at ?? '');
  if (Number.isNaN(appliedAt)) {
    throw new Error('application_state=applied なのに applied_at が ISO 時刻ではありません');
  }
  const observationStartedAt = new Date(appliedAt).toISOString();
  const dueAt = new Date(appliedAt + requiredDays * DAY_MS).toISOString();

  const status =
    measurement.observed_days >= requiredDays ? VERDICT.PENDING_APPLICATION_ERROR_RATE : VERDICT.COLLECTING;

  return {
    status,
    observation_started_at: observationStartedAt,
    first_monthly_verdict_due_at: dueAt,
    blocker: status === VERDICT.PENDING_APPLICATION_ERROR_RATE ? 'workers-analytics-5xx-rate-not-collected' : null,
  };
}

/**
 * 宣言 (slo-dashboard.json) と導出値を突合する。差分は全件返す。
 * 1 件目で止めると、是正の往復が差分の数だけ発生する。
 */
export function compareVerdict(derived, declared) {
  const fields = ['status', 'observation_started_at', 'first_monthly_verdict_due_at', 'blocker'];
  const mismatches = fields
    .filter((field) => (derived[field] ?? null) !== (declared?.[field] ?? null))
    .map((field) => ({ field, declared: declared?.[field] ?? null, measured: derived[field] ?? null }));
  return { consistent: mismatches.length === 0, mismatches };
}

/**
 * 外形実測だけで SLO 目標を満たしているかの参考判定。
 * **これ単独を達成判定に使わない** (qa-019)。最終判定には Workers analytics の 5xx 率が要る。
 */
export function summarizeErrorBudget({ measurement, dashboard }) {
  const target = Number(dashboard?.slo?.availability_target_monthly);
  const allowed = Number(dashboard?.slo?.allowed_downtime_30_day_seconds);
  const requiredDays = Number(dashboard?.slo?.minimum_observation_days_for_final_verdict);
  if (
    !Number.isFinite(target) ||
    !Number.isFinite(allowed) ||
    allowed <= 0 ||
    !Number.isFinite(requiredDays) ||
    requiredDays <= 0
  ) {
    throw new Error(
      'slo.availability_target_monthly / allowed_downtime_30_day_seconds / ' +
        'minimum_observation_days_for_final_verdict が正の数ではありません',
    );
  }
  const consumedRatio = measurement.external_downtime_seconds / allowed;
  const actions = (dashboard?.error_budget_policy ?? [])
    .filter((policy) => consumedRatio >= Number(policy?.consumed_ratio))
    .map((policy) => policy.action);
  return {
    availability_target_monthly: target,
    allowed_downtime_30_day_seconds: allowed,
    external_downtime_seconds: measurement.external_downtime_seconds,
    error_budget_consumed_ratio: consumedRatio,
    triggered_actions: actions,
    // 外形単独の暫定判定。observed_days が必要日数に満たない間は null (判定しない)
    external_only_target_met:
      measurement.observed_days < requiredDays || measurement.external_availability === null
        ? null
        : measurement.external_availability >= target,
  };
}

/** 証跡 JSON を組み立てる。秘密値は構造上入らない (公開 URL の応答しか読まないため) */
export function buildReport({
  checkedAt,
  source,
  measurement,
  derived,
  declared,
  comparison,
  errorBudget,
  requiredDays,
}) {
  return {
    checked_at: checkedAt,
    source: {
      kind: 'better-stack-public-status-page',
      url: source.url,
      http_status: source.httpStatus,
      status_page_resource_id: source.resourceExternalId,
      authenticated: false,
    },
    measurement,
    observation_progress: {
      observed_days: measurement.observed_days,
      required_days: requiredDays,
      complete: measurement.observed_days >= requiredDays,
    },
    error_budget: errorBudget,
    verdict: { measured: derived, declared, consistent: comparison.consistent, mismatches: comparison.mismatches },
    $comment:
      '公開 status page のみを読む実測証跡。API token / heartbeat URL は取得しない。' +
      '最終的な SLO 達成判定には Workers analytics の 5xx 率が別途必要 (infrastructure-spec §9 / qa-019)。',
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export async function runVerifyCli(argv, dependencies = {}) {
  const {
    monitorsConfigPath = MONITORS_CONFIG_PATH,
    dashboardPath = SLO_DASHBOARD_PATH,
    repoRoot = REPO_ROOT,
    fetchImpl = globalThis.fetch,
    now = new Date(),
    log = console.log,
    logError = console.error,
  } = dependencies;

  const write = argv.includes('--write');
  const jsonIndex = argv.indexOf('--json');
  const jsonPathCandidate = jsonIndex >= 0 ? argv[jsonIndex + 1] : null;
  if (jsonIndex >= 0 && (typeof jsonPathCandidate !== 'string' || jsonPathCandidate.startsWith('--'))) {
    logError('[verify-slo-observation] --json には出力先 path が必要です');
    return 2;
  }
  const jsonPath = jsonPathCandidate;

  const config = readJson(monitorsConfigPath);
  const dashboard = readJson(dashboardPath);
  const resourceLocalId = config?.status_page?.resource_local_ids?.[0];
  const resourceExternalId = config?.status_page?.resource_external_ids?.[resourceLocalId] ?? null;

  let snapshot;
  let attributes;
  try {
    snapshot = await fetchStatusPageSnapshot({
      subdomain: config?.status_page?.request?.payload?.subdomain,
      fetchImpl,
    });
    attributes = selectResource(snapshot.payload, resourceExternalId);
  } catch (error) {
    logError(`[verify-slo-observation] 実測を取得できません: ${error?.message ?? 'unknown_error'}`);
    return 2;
  }

  const measurement = measureObservation(attributes, { now });
  const derived = deriveVerdict({ measurement, config, dashboard });
  const declared = dashboard?.verdict ?? {};
  const comparison = compareVerdict(derived, declared);
  const errorBudget = summarizeErrorBudget({ measurement, dashboard });
  const requiredDays = Number(dashboard.slo.minimum_observation_days_for_final_verdict);

  let report = buildReport({
    checkedAt: now.toISOString(),
    source: { ...snapshot, resourceExternalId },
    measurement,
    derived,
    declared,
    comparison,
    errorBudget,
    requiredDays,
  });

  if (!comparison.consistent && write) {
    // $comment は状態と一緒に更新しないと、直前の状態を説明する文が残って読み手を誤らせる
    const updatedDashboard = {
      ...dashboard,
      verdict: {
        ...dashboard.verdict,
        ...derived,
        $comment: `${report.checked_at} に公開 status page (${snapshot.url}) を実測して収束させた値。observed_days=${measurement.observed_days}/${requiredDays}。verify-slo-observation.mjs が正本で、手で書き換えないこと。`,
      },
    };
    writeJson(dashboardPath, updatedDashboard);

    // --write と --json を同時指定したとき、更新前の mismatch 証跡を残さない。
    // 書き戻した宣言をもう一度突合し、HEAD へ載せる証跡を収束後の状態に束縛する。
    const convergedComparison = compareVerdict(derived, updatedDashboard.verdict);
    report = buildReport({
      checkedAt: now.toISOString(),
      source: { ...snapshot, resourceExternalId },
      measurement,
      derived,
      declared: updatedDashboard.verdict,
      comparison: convergedComparison,
      errorBudget,
      requiredDays,
    });

    if (jsonPath !== null && jsonPath !== undefined) {
      writeJson(resolve(repoRoot, jsonPath), report);
    }
    log(JSON.stringify(report, null, 2));
    log(`[verify-slo-observation] slo-dashboard.json の verdict を実測へ更新しました (${derived.status})`);
    return 0;
  }

  if (jsonPath !== null && jsonPath !== undefined) {
    writeJson(resolve(repoRoot, jsonPath), report);
  }
  log(JSON.stringify(report, null, 2));

  if (comparison.consistent) return 0;

  logError('[verify-slo-observation] 宣言された verdict が実測と一致しません:');
  for (const mismatch of comparison.mismatches) {
    logError(`  ${mismatch.field}: 宣言=${mismatch.declared} 実測=${mismatch.measured}`);
  }
  logError('  --write で実測へ収束させてください。');
  return 1;
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  runVerifyCli(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`[verify-slo-observation] ${error?.message ?? 'unknown_error'}`);
      process.exitCode = 2;
    });
}
