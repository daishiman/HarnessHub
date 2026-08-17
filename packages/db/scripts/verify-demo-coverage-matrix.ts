#!/usr/bin/env tsx
/**
 * route × 状態 対応表の未カバー 0 件を機械検査する CLI (requirements-baseline.md A7)。
 *
 *   pnpm --filter @harness-hub/db exec tsx scripts/verify-demo-coverage-matrix.ts
 *
 * 検査するのは「表が埋まっているか」だけではない。到達手順が指す fixture の論理キーが
 * 実際に seed が作る行を指しているかまで見る。ここを見ないと、表は 100% でも
 * 実行すると画面が空、という状態を検知できない。
 *
 * DB へは接続しない。表と fixture 宣言という 2 つの静的な出所を突き合わせるだけである。
 */

import { COVERAGE_MATRIX, NOT_APPLICABLE_REASONS, ROUTE_STATES } from './demo-coverage/coverage-matrix';
import { BULK_SERIES, bulkKeys, DERIVED_SERIES, ENUM_SERIES, KEYS, LONG_TEXT } from './demo-coverage/fixtures';
import { seriesKey } from './demo-coverage/seed-id';

/** 表が参照してよい fixture 論理キーの全体集合。seed が作る行と 1 対 1 で対応する。 */
function knownFixtureKeys(): Set<string> {
  const keys = new Set<string>(Object.values(KEYS));
  for (const series of Object.values(ENUM_SERIES)) {
    for (const key of series) keys.add(key);
  }
  for (const series of Object.values(DERIVED_SERIES)) {
    for (const key of series) keys.add(key);
  }
  for (const series of BULK_SERIES) {
    for (const key of bulkKeys(series.prefix, series.count)) keys.add(key);
  }
  // 長文パターンは行そのものではなく「どの文面を使うか」の指定なので、
  // LONG_TEXT の配列長から論理キーを導く。表側が存在しない添字を指したら落とす。
  for (const [kind, patterns] of Object.entries(LONG_TEXT)) {
    for (let index = 0; index < patterns.length; index += 1) {
      keys.add(seriesKey(`long-text/${kind}`, index + 1));
    }
  }
  return keys;
}

function verify(): string[] {
  const violations: string[] = [];
  const known = knownFixtureKeys();
  const seenScreenCodes = new Set<string>();
  const seenRoutes = new Set<string>();
  let applicable = 0;
  const reasonCounts = new Map<string, number>();

  for (const coverage of COVERAGE_MATRIX) {
    const label = `${coverage.screenCode} (${coverage.route})`;
    if (seenScreenCodes.has(coverage.screenCode)) violations.push(`${label}: 画面コードが重複している`);
    if (seenRoutes.has(coverage.route)) violations.push(`${label}: route が重複している`);
    seenScreenCodes.add(coverage.screenCode);
    seenRoutes.add(coverage.route);

    for (const state of ROUTE_STATES) {
      const cell = coverage.states[state];
      if (cell === undefined) {
        violations.push(`${label} / ${state}: 状態が割り当てられていない`);
        continue;
      }
      if (cell.kind === 'notApplicable') {
        if (!(cell.reason in NOT_APPLICABLE_REASONS)) {
          violations.push(`${label} / ${state}: 未知の非適用理由 ${cell.reason}`);
        }
        reasonCounts.set(cell.reason, (reasonCounts.get(cell.reason) ?? 0) + 1);
        continue;
      }
      applicable += 1;
      if (cell.reach.length === 0) {
        violations.push(`${label} / ${state}: 到達手順が空である`);
        continue;
      }
      for (const step of cell.reach) {
        if (step.actor.length === 0) violations.push(`${label} / ${state}: 役割が空である`);
        if (!step.url.startsWith('/')) violations.push(`${label} / ${state}: URL が絶対 path でない (${step.url})`);
        if (step.fixtures.length === 0) violations.push(`${label} / ${state}: fixture の指定が無い`);
        for (const fixture of step.fixtures) {
          if (!known.has(fixture)) {
            violations.push(`${label} / ${state}: seed に存在しない fixture ${fixture}`);
          }
        }
      }
    }
  }

  const cells = COVERAGE_MATRIX.length * ROUTE_STATES.length;
  const notApplicable = cells - applicable;
  console.log(`画面 ${COVERAGE_MATRIX.length} / 状態 ${ROUTE_STATES.length} / セル ${cells}`);
  console.log(`  適用 ${applicable} 件、非適用 ${notApplicable} 件、未割当 0 件`);
  for (const [reason, count] of [...reasonCounts.entries()].sort()) {
    console.log(`  ${reason}: ${count} 件 — ${NOT_APPLICABLE_REASONS[reason as keyof typeof NOT_APPLICABLE_REASONS]}`);
  }
  return violations;
}

const violations = verify();
if (violations.length > 0) {
  console.error(`未カバーまたは不整合が ${violations.length} 件あります:`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exitCode = 1;
} else {
  console.log('未カバー 0 件。表の全セルが到達手順または理由記号へ解決しました。');
}
