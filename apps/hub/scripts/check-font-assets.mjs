#!/usr/bin/env node
/** Google Fonts build fetch 禁止と同梱フォント整合性の共通入口。 */

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');

function parseArgs(argv) {
  const args = { jsonDirectory: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') continue;
    if (argument === '--json-dir') {
      const directory = argv[index + 1];
      if (!directory || directory.startsWith('--')) throw new Error('--json-dir に出力先が必要です');
      args.jsonDirectory = resolve(HUB_ROOT, directory);
      index += 1;
      continue;
    }
    throw new Error(`未知の引数: ${argument}`);
  }
  return args;
}

function run(arguments_) {
  const completed = spawnSync(process.execPath, arguments_, { cwd: HUB_ROOT, stdio: 'inherit' });
  if (completed.error) throw completed.error;
  return completed.status ?? 1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const checks = [
    ['--test', 'scripts/check-google-font-build-fetch.test.mjs'],
    ['scripts/check-google-font-build-fetch.mjs', '--self-test'],
    [
      'scripts/check-google-font-build-fetch.mjs',
      ...(args.jsonDirectory ? ['--json', resolve(args.jsonDirectory, 'google-font-build-fetch.json')] : []),
    ],
    [
      'scripts/vendor-fonts.mjs',
      '--check',
      ...(args.jsonDirectory ? ['--json', resolve(args.jsonDirectory, 'vendored-fonts.json')] : []),
    ],
  ];

  for (const check of checks) {
    const exitCode = run(check);
    if (exitCode !== 0) return exitCode;
  }
  console.log('[font-assets] OK: Google Fonts build fetch 禁止 + 同梱フォント整合性');
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`[font-assets] NG: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
