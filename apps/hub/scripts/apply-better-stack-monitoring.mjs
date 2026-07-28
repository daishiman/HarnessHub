#!/usr/bin/env node
// Better Stack 外形監視の適用器 (HarnessHub-37h.15 / feat-hub-foundation)。
//
// 何をするか:
//   apps/hub/monitoring/better-stack.monitors.json を「要求内容の正本」として読み、
//   Better Stack Uptime API v2 へ monitor / heartbeat / status page とその resource 関連付けを
//   適用する。採番された external_id と適用時刻を設定ファイルへ書き戻し、
//   slo-dashboard.json の verdict を「観測開始」へ進める。
//
// なぜ手作業 (ダッシュボード操作) ではなく script なのか:
//   1. 値の正本がファイル側にある (runbook §1 手順 4)。画面で入力すると正本と静かにずれる。
//   2. 「再実行しても重複を作らない」を機械で保証したい。外形監視の二重登録は
//      課金と誤アラートの両方を生むうえ、片方だけ paused といった非対称な状態を作る。
//   3. heartbeat URL は secret。人間の目とシェル履歴を経由させずに wrangler へ渡したい。
//
// 秘密の扱い (受け入れ条件 4: 秘密値を成果物・コマンド出力・ログへ残さない):
//   - API token は環境変数 BETTER_STACK_API_TOKEN からのみ受け取る。
//     コマンド引数は ps とシェル履歴に残るため、引数経由は用意しない。
//   - heartbeat URL は標準出力・設定ファイル・エラーメッセージのいずれにも出さない。
//     --put-secret 指定時だけ `wrangler secret put CRON_HEARTBEAT_URL` の stdin へ直接流す。
//   - API 応答を人が読む経路へ出すときは必ず redactSecrets() を通す。
//     Better Stack の 422 応答は送った値をそのまま echo し返すことがあるため。
//
// 使い方:
//   node apps/hub/scripts/apply-better-stack-monitoring.mjs --dry-run
//   BETTER_STACK_API_TOKEN=... node apps/hub/scripts/apply-better-stack-monitoring.mjs --put-secret
//   BETTER_STACK_API_TOKEN=... node apps/hub/scripts/apply-better-stack-monitoring.mjs --json evidence.json
//
// API のフィールド名は 2026-07-26 に Better Stack 公式 API ドキュメントへ照合済み
// (monitors / heartbeats / status-pages / status page resources の各 create)。
// 照合結果は docs/features/feat-hub-foundation/runbook.md §1 に記録する。

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');

export const MONITORS_CONFIG_PATH = resolve(HUB_ROOT, 'monitoring/better-stack.monitors.json');
export const SLO_DASHBOARD_PATH = resolve(HUB_ROOT, 'monitoring/slo-dashboard.json');

export const API_BASE = 'https://uptime.betterstack.com';
export const TOKEN_ENV = 'BETTER_STACK_API_TOKEN';
export const SECRET_NAME = 'CRON_HEARTBEAT_URL';

const DAY_MS = 86_400_000;

/**
 * heartbeat の ping URL。これを知っていれば誰でも「cron は完走した」と偽装できるので
 * 出力経路に現れたら伏せる。API version が上がっても捕まるよう v\d+ にしてある。
 */
const HEARTBEAT_URL_PATTERN = /https:\/\/uptime\.betterstack\.com\/api\/v\d+\/heartbeat\/[A-Za-z0-9_-]+/g;

/** HTTP ヘッダ値として安全な文字だけ (可視 ASCII、空白・改行なし)。Better Stack の token はこの範囲に収まる */
const TOKEN_CHARSET = /^[\x21-\x7e]+$/;

/** 適用対象。列挙順がそのまま適用順で、status page resource は monitor と status page の後にしか作れない */
export const RESOURCE_KINDS = ['monitor', 'heartbeat', 'status_page'];

const LIST_PATH = {
  monitor: '/api/v2/monitors',
  heartbeat: '/api/v2/heartbeats',
  status_page: '/api/v2/status-pages',
};

/** Better Stack が PATCH による設定更新を公開している資源 */
const PATCHABLE_KINDS = new Set(['monitor', 'heartbeat']);

// ---------------------------------------------------------------------------
// 秘密の伏字化
// ---------------------------------------------------------------------------

/**
 * 人が読む経路へ出す前に秘密を伏せる。token は長さも隠すため固定文字列へ置換する。
 * @param {unknown} value
 * @param {string | undefined} token
 * @returns {string}
 */
export function redactSecrets(value, token) {
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  if (typeof text !== 'string') return '[unserializable]';
  text = text.replace(HEARTBEAT_URL_PATTERN, '[REDACTED_HEARTBEAT_URL]');
  if (typeof token === 'string' && token.length > 0) {
    text = text.split(token).join('[REDACTED_TOKEN]');
  }
  return text;
}

// ---------------------------------------------------------------------------
// Uptime API client
// ---------------------------------------------------------------------------

/**
 * Better Stack Uptime API v2 の最小 client。
 * fetch を差し替え可能にしているのは、テストを実ネットワークから切り離すため (src/worker/cron.ts と同じ流儀)。
 */
export function createUptimeClient({ token, fetchImpl = globalThis.fetch, baseUrl = API_BASE }) {
  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error(`${TOKEN_ENV} が未設定です`);
  }
  // HTTP ヘッダへ載せる前に文字種を検査する。非 ASCII を fetch へ渡すと
  // "character at index N has a value of 23455" のように**トークンの文字コードを含む**
  // 例外が出て、受け入れ条件 4 (秘密をログへ出さない) を破る。ここで先に落とす。
  if (!TOKEN_CHARSET.test(token)) {
    throw new Error(
      `${TOKEN_ENV} に HTTP ヘッダへ載せられない文字が含まれています (空白・改行・非 ASCII)。` +
        'プレースホルダのままではないか、コピー時に改行や全角文字が混ざっていないか確認してください。',
    );
  }

  async function request(method, pathOrUrl, body) {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${baseUrl}${pathOrUrl}`;
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      // 422 応答は送信した値を echo し返すことがあるので、必ず伏字化してから例外に載せる
      throw new Error(`${method} ${pathOrUrl} が ${response.status} で失敗: ${redactSecrets(text, token)}`);
    }
    return text.length === 0 ? {} : JSON.parse(text);
  }

  /**
   * pagination を最後まで辿って全件返す。
   * 1 ページだけ見て「無かった」と判断すると、2 ページ目に居る既存資源を見落として重複を作る。
   */
  async function listAll(path) {
    const items = [];
    let next = path;
    // 応答が壊れて next が自己参照しても止まるよう上限を置く
    for (let page = 0; next !== null && page < 100; page += 1) {
      const payload = await request('GET', next);
      for (const item of payload?.data ?? []) items.push(item);
      next = payload?.pagination?.next ?? null;
    }
    return items;
  }

  return { request, listAll, token };
}

// ---------------------------------------------------------------------------
// 冪等性: 既存資源の同定
// ---------------------------------------------------------------------------

/**
 * 資源ごとの「同一性の鍵」。desired と attributes の両方から同じ key で引いて突き合わせる。
 *
 * 鍵に何を選ぶかがそのまま冪等性の強さになるので、選定理由を残しておく:
 *   monitor     - pronounceable_name はダッシュボードから改名できてしまい、改名された瞬間に
 *                 同定が外れて重複を作る。url が設定の本体なのでこれを主鍵にし、
 *                 monitor_type を併せて「同じ URL を別方式 (ping 等) で見ている monitor」の
 *                 誤同定を防ぐ。
 *   heartbeat   - url は API 側が採番する秘密で設定ファイルに持てないため鍵に使えない。
 *                 name が実質の一意名になる。
 *   status_page - subdomain は Better Stack 全体で一意という API 側の制約があり、
 *                 鍵として最も強い。
 */
const IDENTITY_KEYS = {
  monitor: ['url', 'monitor_type'],
  heartbeat: ['name'],
  status_page: ['subdomain'],
};

/**
 * 既存資源の一覧から「この設定が指す 1 件」を選ぶ。冪等性の要。
 *
 * ここが緩いと再実行のたびに本番へ監視が二重登録され、逆に厳しすぎると
 * 毎回「無い」と判断して同じ重複を作る。どちらも本番事故なので fail-closed に倒す
 * (同定できない状態で作りに行かない) 方針を取る。
 *
 * @param {'monitor' | 'heartbeat' | 'status_page'} kind 資源種別
 * @param {Record<string, unknown>} desired 設定ファイルの request.payload
 * @param {{ id: string, attributes: Record<string, unknown> }[]} existing API から取得した既存一覧
 * @returns {{ id: string, attributes: Record<string, unknown> } | null} 一致する 1 件。無ければ null
 * @throws {Error} 一致が複数あり 1 件に絞れないとき (人間の判断が要る状態)
 */
export function matchExisting(kind, desired, existing) {
  const keys = IDENTITY_KEYS[kind];
  if (keys === undefined) {
    // 鍵が決まっていない種別を「一致なし」で通すと、そのまま新規作成へ落ちて重複を作る
    throw new Error(`同一性の鍵が未定義の資源種別です: ${kind}`);
  }

  const matches = (existing ?? []).filter((item) =>
    keys.every((key) => {
      const wanted = desired?.[key];
      // 設定側に値が無い鍵で照合すると undefined 同士が一致して無関係な資源を拾う
      return wanted !== undefined && item?.attributes?.[key] === wanted;
    }),
  );

  if (matches.length > 1) {
    // ここで 1 件目を選ぶと、選ばれなかった側が野良の監視として残り続ける。
    // 既に重複している事実自体が人の判断を要する状態なので適用を止める
    throw new Error(
      `${kind} が ${matches.length} 件一致しました (id=${matches.map((item) => item.id).join(', ')})。` +
        'どれを正とするかを決めて重複を解消してから再実行してください。',
    );
  }

  return matches[0] ?? null;
}

// ---------------------------------------------------------------------------
// 適用本体
// ---------------------------------------------------------------------------

/**
 * API 応答と正本 payload の値が同じかを判定する。
 * paused は API 応答によって boolean ではなく status / paused_at で表現されるため別扱いにする。
 */
function isDesiredValueApplied(key, desiredValue, attributes) {
  if (key === 'paused') {
    const paused =
      attributes.paused === true ||
      attributes.status === 'paused' ||
      (typeof attributes.paused_at === 'string' && attributes.paused_at.length > 0);
    return paused === desiredValue;
  }
  if (key === 'http_method' && typeof desiredValue === 'string' && typeof attributes[key] === 'string') {
    return attributes[key].toLowerCase() === desiredValue.toLowerCase();
  }
  return JSON.stringify(attributes[key]) === JSON.stringify(desiredValue);
}

/** 正本と異なるフィールドだけを PATCH body として返す */
export function buildDesiredPatch(desired, attributes) {
  return Object.fromEntries(
    Object.entries(desired).filter(([key, desiredValue]) => !isDesiredValueApplied(key, desiredValue, attributes)),
  );
}

/** 既存があれば正本との差分を更新し、無ければ作る。どちらでも同じ形の結果を返す */
async function ensureResource({ client, kind, desired }) {
  const existing = await client.listAll(LIST_PATH[kind]);
  const matched = matchExisting(kind, desired, existing);
  if (matched !== null && matched !== undefined) {
    if (PATCHABLE_KINDS.has(kind)) {
      const patch = buildDesiredPatch(desired, matched.attributes ?? {});
      if (Object.keys(patch).length > 0) {
        const updated = unwrapOne(await client.request('PATCH', `${LIST_PATH[kind]}/${matched.id}`, patch));
        return {
          kind,
          action: 'updated',
          id: String(updated.id),
          attributes: { ...(matched.attributes ?? {}), ...(updated.attributes ?? {}) },
        };
      }
    }
    return { kind, action: 'reused', id: String(matched.id), attributes: matched.attributes ?? {} };
  }
  const created = unwrapOne(await client.request('POST', LIST_PATH[kind], desired));
  return { kind, action: 'created', id: String(created.id), attributes: created.attributes ?? {} };
}

/**
 * create 応答の包み方が endpoint 間で揃っていない (status page だけ data で包まれない例が
 * 公式ドキュメントに載る) ため、どちらの形でも受ける。
 */
export function unwrapOne(payload) {
  const node = payload?.data ?? payload;
  if (node === null || node === undefined || node.id === undefined) {
    throw new Error('API 応答に id が含まれていません');
  }
  return node;
}

/** status page へ monitor を resource として関連付ける。既に関連付いていれば何もしない */
async function ensureStatusPageResource({ client, statusPageId, monitorId, config }) {
  const path = `/api/v2/status-pages/${statusPageId}/resources`;
  const existing = await client.listAll(path);
  const already = existing.find(
    (item) =>
      String(item?.attributes?.resource_id ?? '') === String(monitorId) &&
      item?.attributes?.resource_type === 'Monitor',
  );
  if (already !== undefined) {
    return { kind: 'status_page_resource', action: 'reused', id: String(already.id) };
  }

  const payload = { ...config.status_page.resource_request.payload_template, resource_id: String(monitorId) };
  const created = unwrapOne(await client.request('POST', path, payload));
  return { kind: 'status_page_resource', action: 'created', id: String(created.id) };
}

/**
 * 設定ファイルの内容を Better Stack へ適用し、書き戻し後の設定と dashboard を返す。
 * 純粋関数ではないが、副作用は client と now に閉じているのでテストから完全に制御できる。
 *
 * @returns {Promise<{config: object, dashboard: object, heartbeatUrl: string | null, actions: object[]}>}
 */
export async function applyMonitoring({ config, dashboard, client, now }) {
  const actions = [];

  const monitor = await ensureResource({ client, kind: 'monitor', desired: config.monitor.request.payload });
  actions.push({ kind: monitor.kind, action: monitor.action, external_id: monitor.id });

  const heartbeat = await ensureResource({ client, kind: 'heartbeat', desired: config.heartbeat.request.payload });
  actions.push({ kind: heartbeat.kind, action: heartbeat.action, external_id: heartbeat.id });

  const statusPage = await ensureResource({
    client,
    kind: 'status_page',
    desired: config.status_page.request.payload,
  });
  actions.push({ kind: statusPage.kind, action: statusPage.action, external_id: statusPage.id });

  const resource = await ensureStatusPageResource({
    client,
    statusPageId: statusPage.id,
    monitorId: monitor.id,
    config,
  });
  actions.push(resource);

  // 既に稼働中の monitor を再利用しただけなら、初回の観測開始時刻を動かさない。
  // 再適用のたびに now へ更新すると、30 日判定日が永遠に後ろ倒しされる。
  // 一方、monitor 自体を新規作成した場合は過去の時系列が存在しないため、今回を新しい開始点にする。
  const previousAppliedAt = Date.parse(config.applied_at ?? '');
  const canPreserveObservationStart =
    config.application_state === 'applied' &&
    dashboard.verdict.status === 'collecting' &&
    monitor.action === 'reused' &&
    Number.isNaN(previousAppliedAt) === false;
  const appliedAt = canPreserveObservationStart ? new Date(previousAppliedAt).toISOString() : now.toISOString();

  // heartbeat URL は設定ファイルへ書かない。呼び出し側が wrangler へ流すためだけに返す
  const heartbeatUrl = typeof heartbeat.attributes.url === 'string' ? heartbeat.attributes.url : null;

  const nextConfig = {
    ...config,
    application_state: 'applied',
    applied_at: appliedAt,
    monitor: { ...config.monitor, external_id: monitor.id },
    heartbeat: { ...config.heartbeat, external_id: heartbeat.id },
    status_page: {
      ...config.status_page,
      external_id: statusPage.id,
      resource_external_ids: { ...(config.status_page.resource_external_ids ?? {}), 'hub-health': resource.id },
    },
  };

  // 観測開始は「適用した瞬間」から。ここより前の 503 (初回 bootstrap 中の Worker 不在) を
  // 可用性へ算入しないため、runbook §1 は監視有効化を /health 200 確認の後に置いている
  const observationDays = dashboard.slo.minimum_observation_days_for_final_verdict;
  const nextDashboard = {
    ...dashboard,
    verdict: {
      ...dashboard.verdict,
      status: 'collecting',
      observation_started_at: appliedAt,
      first_monthly_verdict_due_at: new Date(Date.parse(appliedAt) + observationDays * DAY_MS).toISOString(),
      blocker: null,
    },
  };

  return { config: nextConfig, dashboard: nextDashboard, heartbeatUrl, actions };
}

// ---------------------------------------------------------------------------
// heartbeat URL の受け渡し
// ---------------------------------------------------------------------------

/**
 * heartbeat URL を wrangler secret へ流し込む。
 * 引数ではなく stdin を使うのは、コマンド引数が ps とシェル履歴に残るため。
 * 呼び出し側はこの関数の戻り値 (成否) だけを扱い、URL 自体には触れない。
 */
export function putWranglerSecret(
  url,
  { cwd = HUB_ROOT, command = 'npx', args = ['wrangler', 'secret', 'put', SECRET_NAME] } = {},
) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd, stdio: ['pipe', 'inherit', 'inherit'] });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(true);
      else rejectPromise(new Error(`wrangler secret put ${SECRET_NAME} が exit ${code} で失敗しました`));
    });
    child.stdin.end(url);
  });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** dry-run で表示する適用計画。秘密は含まないが、念のため伏字化を通してから出す */
export function describePlan(config) {
  return RESOURCE_KINDS.map((kind) => {
    const node = config[kind];
    return `  ${kind}: ${node.request.method} ${node.request.endpoint} (local_id=${node.local_id}, external_id=${node.external_id ?? 'null'})`;
  }).join('\n');
}

async function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const putSecret = argv.includes('--put-secret');
  const jsonIndex = argv.indexOf('--json');
  const jsonPath = jsonIndex >= 0 ? argv[jsonIndex + 1] : null;

  const config = readJson(MONITORS_CONFIG_PATH);
  const dashboard = readJson(SLO_DASHBOARD_PATH);

  if (dryRun) {
    console.log('[apply-better-stack-monitoring] dry-run: 以下を適用します (ネットワークへは出ません)');
    console.log(describePlan(config));
    console.log(
      `  status_page resource: ${config.status_page.resource_request.method} ${config.status_page.resource_request.endpoint_template}`,
    );
    console.log(`  現在の application_state: ${config.application_state}`);
    return 0;
  }

  const token = process.env[TOKEN_ENV];
  if (typeof token !== 'string' || token.trim().length === 0) {
    console.error(`[apply-better-stack-monitoring] ${TOKEN_ENV} が未設定です。`);
    console.error('  Better Stack の Uptime API token を環境変数で渡してください (引数では渡さないこと)。');
    return 2;
  }

  const client = createUptimeClient({ token });
  const result = await applyMonitoring({ config, dashboard, client, now: new Date() });

  let secretDelivery = 'skipped';
  if (putSecret) {
    if (result.heartbeatUrl === null) {
      console.error(
        '[apply-better-stack-monitoring] heartbeat URL を取得できませんでした。secret は投入していません。',
      );
      return 3;
    }
    await putWranglerSecret(result.heartbeatUrl);
    secretDelivery = 'delivered';
  }

  // --put-secret 指定時は secret 投入まで成功して初めて applied と書き戻す。
  // 先に書くと wrangler 失敗時に「設定だけ applied / secret は未投入」という中間状態が残る。
  writeJson(MONITORS_CONFIG_PATH, result.config);
  writeJson(SLO_DASHBOARD_PATH, result.dashboard);

  const evidence = {
    applied_at: result.config.applied_at,
    api_base: API_BASE,
    actions: result.actions,
    heartbeat_secret: secretDelivery,
    $comment: 'heartbeat URL と API token は本証跡に含めない (受け入れ条件 4)',
  };
  if (jsonPath !== null && jsonPath !== undefined) {
    writeJson(resolve(REPO_ROOT, jsonPath), evidence);
  }
  console.log(redactSecrets(JSON.stringify(evidence, null, 2), token));
  return 0;
}

const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      // 例外 message は request() 側で伏字化済み。ここで raw を出すと伏字化を迂回する
      console.error(
        `[apply-better-stack-monitoring] ${redactSecrets(error?.message ?? 'unknown_error', process.env[TOKEN_ENV])}`,
      );
      process.exitCode = 1;
    });
}
