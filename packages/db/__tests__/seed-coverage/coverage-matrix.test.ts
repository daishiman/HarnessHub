// T1: route × 状態 対応表の網羅性 (test-design.md §3.1)。
// 定義そのものの検査であり DB を必要としない。
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { loadPendingModule, REPO_ROOT } from './support/pending-module';

const APP_DIR = path.join(REPO_ROOT, 'apps/hub/src/app');

const ROUTE_STATES = ['empty', 'single', 'bulk', 'longText', 'error'] as const;
const NOT_APPLICABLE_REASONS = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7'] as const;

/** requirements-baseline.md §6.3 の集計。 */
const EXPECTED_APPLICABLE = 115;
const EXPECTED_NOT_APPLICABLE = 35;

interface ReachStep {
  actor: string;
  url: string;
  fixtures: string[];
  operation?: string;
}
type Applicability = { kind: 'applicable'; reach: ReachStep[] } | { kind: 'notApplicable'; reason: string };
interface RouteCoverage {
  screenCode: string;
  route: string;
  states: Record<string, Applicability>;
}

/**
 * page.tsx の配置から route を導く。実装側の逆変換関数を使うと実装の誤りを追認してしまうため、
 * テスト側に独立して置く (test-design.md §3.1)。
 */
function collectRoutesFromApp(dir: string, segments: string[] = []): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // (dashboard) のような route group は URL に現れない。
      const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
      routes.push(...collectRoutesFromApp(path.join(dir, entry.name), isGroup ? segments : [...segments, entry.name]));
    } else if (entry.name === 'page.tsx') {
      routes.push(segments.length === 0 ? '/' : `/${segments.join('/')}`);
    }
  }
  return routes;
}

let matrix: RouteCoverage[];
let demoIds: Record<string, string>;
let demoIdSourceKeys: Record<string, string>;
let seedId: (logicalKey: string) => string;

beforeAll(async () => {
  const loaded = await loadPendingModule<{
    COVERAGE_MATRIX: RouteCoverage[];
    DEMO_IDS: Record<string, string>;
    DEMO_ID_SOURCE_KEYS: Record<string, string>;
  }>('scripts/demo-coverage/coverage-matrix.ts', ['COVERAGE_MATRIX', 'DEMO_IDS', 'DEMO_ID_SOURCE_KEYS']);
  matrix = loaded.COVERAGE_MATRIX;
  demoIds = loaded.DEMO_IDS;
  demoIdSourceKeys = loaded.DEMO_ID_SOURCE_KEYS;
  const idModule = await loadPendingModule<{ seedId: (logicalKey: string) => string }>(
    'scripts/demo-coverage/seed-id.ts',
    ['seedId'],
  );
  seedId = idModule.seedId;
});

describe('T1: route × 状態 対応表', () => {
  it('T1-1: 対応表が 30 route ちょうどを持つ', () => {
    expect(matrix).toHaveLength(30);
  });

  it('T1-2: 各 route が 5 状態のキーをちょうど持つ', () => {
    for (const coverage of matrix) {
      expect(Object.keys(coverage.states).sort()).toEqual([...ROUTE_STATES].sort());
    }
  });

  it('T1-3: 150 セルすべてが applicable か notApplicable へ解決する', () => {
    const cells = matrix.flatMap((coverage) => ROUTE_STATES.map((state) => coverage.states[state]));
    expect(cells).toHaveLength(150);
    const unresolved = cells.filter((cell) => cell?.kind !== 'applicable' && cell?.kind !== 'notApplicable');
    expect(unresolved).toEqual([]);
  });

  it('T1-4: notApplicable が N1〜N7 の理由を持つ', () => {
    const invalid = matrix.flatMap((coverage) =>
      ROUTE_STATES.map((state) => coverage.states[state])
        .filter((cell): cell is { kind: 'notApplicable'; reason: string } => cell?.kind === 'notApplicable')
        .filter((cell) => !NOT_APPLICABLE_REASONS.includes(cell.reason as (typeof NOT_APPLICABLE_REASONS)[number]))
        .map((cell) => `${coverage.route}: ${cell.reason}`),
    );
    expect(invalid).toEqual([]);
  });

  it('T1-5: applicable が非空の到達手順を持つ', () => {
    const defects: string[] = [];
    for (const coverage of matrix) {
      for (const state of ROUTE_STATES) {
        const cell = coverage.states[state];
        if (cell?.kind !== 'applicable') continue;
        if (cell.reach.length === 0) {
          defects.push(`${coverage.route}/${state}: reach が空`);
          continue;
        }
        for (const step of cell.reach) {
          if (!step.actor || !step.url || step.fixtures.length === 0) {
            defects.push(`${coverage.route}/${state}: actor/url/fixtures に空がある`);
          }
        }
      }
    }
    expect(defects).toEqual([]);
  });

  it('T1-6: 集計が適用 115 / 非適用 35 と一致する', () => {
    const cells = matrix.flatMap((coverage) => ROUTE_STATES.map((state) => coverage.states[state]));
    expect(cells.filter((cell) => cell?.kind === 'applicable')).toHaveLength(EXPECTED_APPLICABLE);
    expect(cells.filter((cell) => cell?.kind === 'notApplicable')).toHaveLength(EXPECTED_NOT_APPLICABLE);
  });

  // 表は `@harness-hub/db` の公開 API から Edge Runtime の middleware まで届くため、`node:crypto` を使う
  // seed-id.ts を import できない (build が UnhandledSchemeError で落ちる)。そこで表側は確定値を直に持ち、
  // 「その確定値が seedId(論理キー) と同じか」をここで突き合わせる。論理キー変更時の取り残しをここで落とす。
  it('T1-8: DEMO の事前計算 ID が seedId(論理キー) と一致する', () => {
    const drift = Object.entries(demoIdSourceKeys)
      .filter(([field, logicalKey]) => demoIds[field] !== seedId(logicalKey))
      .map(([field, logicalKey]) => `${field}: ${demoIds[field]} != seedId('${logicalKey}')=${seedId(logicalKey)}`);
    expect(drift).toEqual([]);
  });

  it('T1-7: route 集合が page.tsx の実測集合と一致する', () => {
    const actual = [...new Set(collectRoutesFromApp(APP_DIR))].sort();
    const declared = [...new Set(matrix.map((coverage) => coverage.route))].sort();
    expect(declared).toEqual(actual);
  });
});
