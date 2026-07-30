// Better Stack 監視適用器の CLI / secret 配送責務。
//
// API 資源の照合・状態遷移は apply-better-stack-monitoring.mjs が所有し、本 module は
// 引数の解釈、JSON 入出力、secret store への stdin 配送、証跡表示だけを担う。

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** dry-run で表示する適用計画。secret 値は含めない */
export function describePlan(config, heartbeatConfigKeys) {
  const resources = [
    ['monitor', config.monitor],
    ...heartbeatConfigKeys.flatMap((configKey) =>
      config[configKey] === undefined ? [] : [[configKey, config[configKey]]],
    ),
    ['status_page', config.status_page],
  ].filter(([, node]) => node !== null && node !== undefined);
  return resources
    .map(
      ([kind, node]) =>
        `  ${kind}: ${node.request.method} ${node.request.endpoint} (local_id=${node.local_id}, external_id=${node.external_id ?? 'null'})`,
    )
    .join('\n');
}

/**
 * heartbeat URL を wrangler secret へ stdin で流し込む。
 * URL を引数へ載せないため、ps とシェル履歴へ残らない。
 */
export function putWranglerSecret(url, { cwd, secretName, command = 'npx' }) {
  const args = ['wrangler', 'secret', 'put', secretName];
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd, stdio: ['pipe', 'inherit', 'inherit'] });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(true);
      else rejectPromise(new Error(`wrangler secret put ${secretName} が exit ${code} で失敗しました`));
    });
    child.stdin.end(url);
  });
}

/**
 * backup heartbeat URL を GitHub Actions repository secret へ stdin で流し込む。
 */
export function putGitHubSecret(url, { cwd, backupSecretName, command = 'gh' }) {
  const args = ['secret', 'set', backupSecretName];
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { cwd, stdio: ['pipe', 'inherit', 'inherit'] });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(true);
      else rejectPromise(new Error(`gh secret set ${backupSecretName} が exit ${code} で失敗しました`));
    });
    child.stdin.end(url);
  });
}

/**
 * CLI を実行する。API 適用ロジックは dependencies として受け取り、循環 import を避ける。
 */
export async function runMonitoringCli(argv, dependencies) {
  const {
    apiBase,
    applyBackupHeartbeat,
    applyMonitoring,
    backupSecretName,
    createUptimeClient,
    dashboardPath,
    heartbeatConfigKeys,
    hubRoot,
    monitorsConfigPath,
    redactSecrets,
    repoRoot,
    secretName,
    tokenEnv,
  } = dependencies;
  const putWranglerSecretImpl = dependencies.putWranglerSecretImpl ?? putWranglerSecret;
  const putGitHubSecretImpl = dependencies.putGitHubSecretImpl ?? putGitHubSecret;

  const dryRun = argv.includes('--dry-run');
  const backupOnly = argv.includes('--only-backup-heartbeat');
  const putAllSecrets = argv.includes('--put-secrets');
  const putSecret = argv.includes('--put-secret') || putAllSecrets;
  const putGithubSecret = argv.includes('--put-github-secret') || putAllSecrets;
  const jsonIndex = argv.indexOf('--json');
  const jsonPath = jsonIndex >= 0 ? argv[jsonIndex + 1] : null;

  const config = readJson(monitorsConfigPath);
  const dashboard = readJson(dashboardPath);

  if (dryRun) {
    console.log('[apply-better-stack-monitoring] dry-run: 以下を適用します (ネットワークへは出ません)');
    if (backupOnly) {
      console.log(describePlan({ backup_heartbeat: config.backup_heartbeat }, heartbeatConfigKeys));
      console.log('  限定モード: monitor / Worker heartbeat / status page / SLO dashboard は変更しません');
    } else {
      console.log(describePlan(config, heartbeatConfigKeys));
      console.log(
        `  status_page resource: ${config.status_page.resource_request.method} ${config.status_page.resource_request.endpoint_template}`,
      );
      console.log(`  現在の application_state: ${config.application_state}`);
    }
    return 0;
  }

  if (backupOnly && putSecret) {
    console.error(`[apply-better-stack-monitoring] --only-backup-heartbeat では ${secretName} を変更できません。`);
    console.error(`  ${backupSecretName} だけを投入する --put-github-secret を指定してください。`);
    return 2;
  }
  if (backupOnly && !putGithubSecret) {
    console.error('[apply-better-stack-monitoring] --only-backup-heartbeat には --put-github-secret が必要です。');
    console.error('  heartbeat を作るだけで GitHub Actions へ接続されない中間状態を防止します。');
    return 2;
  }

  const token = process.env[tokenEnv];
  if (typeof token !== 'string' || token.trim().length === 0) {
    console.error(`[apply-better-stack-monitoring] ${tokenEnv} が未設定です。`);
    console.error('  Better Stack の Uptime API token を環境変数で渡してください (引数では渡さないこと)。');
    return 2;
  }

  const client = createUptimeClient({ token });
  const executedAt = new Date();
  const result = backupOnly
    ? await applyBackupHeartbeat({ config, client })
    : await applyMonitoring({ config, dashboard, client, now: executedAt });

  let secretDelivery = 'skipped';
  let backupSecretDelivery = 'skipped';
  if (putSecret) {
    const workerHeartbeatUrl = result.heartbeatUrls[secretName];
    if (workerHeartbeatUrl === undefined) {
      console.error(
        `[apply-better-stack-monitoring] ${secretName} 用 heartbeat URL を取得できませんでした。secret は投入していません。`,
      );
      return 3;
    }
    await putWranglerSecretImpl(workerHeartbeatUrl, { cwd: hubRoot, secretName });
    secretDelivery = 'delivered';
  }
  if (putGithubSecret) {
    const backupHeartbeatUrl = result.heartbeatUrls[backupSecretName];
    if (backupHeartbeatUrl === undefined) {
      console.error(
        `[apply-better-stack-monitoring] ${backupSecretName} 用 heartbeat URL を取得できませんでした。secret は投入していません。`,
      );
      return 3;
    }
    await putGitHubSecretImpl(backupHeartbeatUrl, { cwd: repoRoot, backupSecretName });
    backupSecretDelivery = 'delivered';
  }

  // secret 投入まで成功して初めて applied と書き戻し、中間状態を残さない。
  writeJson(monitorsConfigPath, result.config);
  if (result.dashboard !== null) {
    writeJson(dashboardPath, result.dashboard);
  }

  const evidence = {
    applied_at: backupOnly ? executedAt.toISOString() : result.config.applied_at,
    scope: backupOnly ? 'backup_heartbeat' : 'all_monitoring',
    api_base: apiBase,
    actions: result.actions,
    heartbeat_secret: secretDelivery,
    backup_heartbeat_secret: backupSecretDelivery,
    $comment: 'heartbeat URL と API token は本証跡に含めない (受け入れ条件 4)',
  };
  if (jsonPath !== null && jsonPath !== undefined) {
    writeJson(resolve(repoRoot, jsonPath), evidence);
  }
  console.log(redactSecrets(JSON.stringify(evidence, null, 2), token));
  return 0;
}
