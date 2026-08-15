/**
 * 実アプリ UI 監査の実行入口。既定は公開 route `/legal` 1 キーの最小 smoke、
 * `--full` で COVERAGE_MATRIX 由来の 168 キーを走査する。
 *
 * 例:
 * pnpm --filter @harness-hub/hub exec tsx tests/browser/real-app-smoke.ts \
 *   --origin http://127.0.0.1:8787
 */
import { auditRealAppKeys, buildRealAppAuditPlan, type RealAppAuditKey } from './real-app-audit.js';

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const origin = readArgument('--origin') ?? process.env.HUB_BROWSER_AUDIT_ORIGIN;
if (origin === undefined || origin.trim() === '') {
  console.error('BLOCKED: --origin または HUB_BROWSER_AUDIT_ORIGIN が必要です');
  process.exitCode = 2;
} else {
  const plan = buildRealAppAuditPlan();
  const full = process.argv.includes('--full');
  const keys: readonly RealAppAuditKey[] = full ? plan.keys : [representativeKey(plan.keys)];
  const report = await auditRealAppKeys({
    origin,
    keys,
    cookieHeader: process.env.HUB_BROWSER_AUDIT_COOKIE,
  });

  // Cookie や header を report に持たせない。出力は実行数と違反のみ。
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'pass' ? 0 : report.status === 'fail' ? 1 : 2;
}

function representativeKey(keys: readonly RealAppAuditKey[]): RealAppAuditKey {
  const key = keys.find(
    (candidate) => candidate.route === '/legal' && candidate.width === 360 && candidate.theme === 'light',
  );
  if (key === undefined) {
    throw new Error('COVERAGE_MATRIX に代表 smoke `/legal|360|light` がありません');
  }
  return key;
}
