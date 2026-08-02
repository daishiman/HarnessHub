#!/usr/bin/env node
// packages/schemas・packages/inspection と同じく本 repo は TS を dist へ build しない (raw src を直接消費する)
// 規約を CLI にも揃えるため、tsx の ESM loader で src/cli/index.ts をそのまま起動する。
//
// src/cli/index.ts の main() は argv 配列を受け取り exit code を返すだけの純関数にしてある
// (process.argv/process.exit に自ら触れない) — そうすることでテストが実行環境を経由せずに
// main() を直接呼べる。process への配線はこの薄い wrapper だけが持つ。
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('tsx/esm', pathToFileURL('./'));
const { main } = await import('../src/cli/index.ts');

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
