#!/usr/bin/env node
// pnpm --filter ... run <script> は script 不在でも exit 0 になり得るため、
// required status check の実行前に package.json 上の存在を fail-closed で検査する。

import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

function fail(message) {
  console.error(`[required-script] NG: ${message}`);
  process.exit(1);
}

const [, , packageJsonArg, scriptName] = process.argv;
if (!packageJsonArg || !scriptName) {
  fail('使い方: node scripts/ci/check-required-package-script.mjs <package.json> <script-name>');
}

const packageJsonPath = resolve(packageJsonArg);
if (!existsSync(packageJsonPath)) {
  fail(`${packageJsonArg} が存在しません`);
}

let packageJson;
try {
  packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  fail(`${packageJsonArg} を JSON として読めません: ${error instanceof Error ? error.message : String(error)}`);
}

const command = packageJson?.scripts?.[scriptName];
if (typeof command !== 'string' || command.trim() === '') {
  fail(`${packageJson.name ?? relative(process.cwd(), packageJsonPath)} に script "${scriptName}" がありません`);
}

console.log(`[required-script] OK: ${packageJson.name ?? packageJsonArg}#${scriptName}`);
