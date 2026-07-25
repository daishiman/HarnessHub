#!/usr/bin/env node
// feat-auth-tenancy の CI 品質ゲート束ね役 (P09)。
//
// 個別スクリプトは単独でも動くが、運用で 3 本を手で並べると 1 本忘れる。
// 忘れた 1 本は「通っている」ように見えるので、**まとめて 1 コマンド**にしておく。
// 1 本でも fail したら非ゼロ終了 (fail-closed)。
//
// 共有 CI パイプライン (package.json / .github/) は本 feature の write scope 外なので、
// ここへの結線は follow-up として beads 側に起票してある。
//
// 使い方:
//   node apps/hub/scripts/check-auth-gates.mjs
//   node apps/hub/scripts/check-auth-gates.mjs --json <path>

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const GATES = [
  {
    id: 'auth-adapter-boundary',
    script: 'check-auth-adapter-boundary.mjs',
    constraint: 'auth-adapter-boundary-better-auth-migration-hedge-d3-qa020',
    test_ids: ['T-BND-01', 'T-BND-02'],
  },
  {
    id: 'single-authz-middleware',
    script: 'check-single-authz-middleware.mjs',
    constraint: 'role4-authorization-matrix-single-middleware-deny-by-default-sec2',
    test_ids: [],
  },
  {
    id: 'dev-auth-provider-absence',
    script: 'check-dev-auth-provider-absence.mjs',
    constraint: 'no-hub-native-account-idp-delegation-i7',
    test_ids: ['T-BND-03', 'T-BND-04'],
  },
];

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonPath = jsonIndex > -1 ? resolve(process.argv[jsonIndex + 1]) : null;

  const results = [];
  for (const gate of GATES) {
    const run = spawnSync(process.execPath, [join(HERE, gate.script)], { encoding: 'utf8' });
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim();
    process.stdout.write(`${output}\n`);
    results.push({ ...gate, exit_code: run.status, passed: run.status === 0, output });
  }

  const failed = results.filter((r) => !r.passed);
  const summary = {
    check: 'auth-gates',
    gate_count: results.length,
    passed_count: results.length - failed.length,
    failed_count: failed.length,
    gates: results,
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  }

  if (failed.length === 0) {
    console.log(`[auth-gates] OK: ${results.length} ゲート全て pass`);
    process.exit(0);
  }
  console.error(
    `[auth-gates] NG: ${failed.length}/${results.length} ゲートが fail (${failed.map((f) => f.id).join(', ')})`,
  );
  process.exit(1);
}

main();
