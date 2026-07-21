// secret scan の走査範囲決定とファイル読み込み (I/O 層)。判定は secret-scan-preset.ts の純関数に委譲する。
// この module は CI ゲート (secret-scan-gate.test.ts) と CLI (scripts/scan-secrets.mjs) の両方から使われる唯一の走査実装。

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { InspectionFile } from './types';

/**
 * 走査対象ディレクトリ。Hub monorepo に限定する。
 * リポジトリには plugin の vendor 資産やドキュメントのサンプル値が同居しており、
 * それらまで対象にすると誤検出でゲートが常時赤になり、いずれ無効化される。
 */
export const SECRET_SCAN_DIRECTORIES: readonly string[] = ['apps', 'packages', 'scripts', '.github'];

/** 生成物・VCS・依存など、リポジトリの管理対象でないもの。 */
export const SECRET_SCAN_EXCLUDED_DIRECTORIES: readonly string[] = [
  'node_modules',
  '.git',
  '.next',
  '.open-next',
  '.wrangler',
  '.turbo',
  '.vercel',
  'dist',
  'build',
  'coverage',
  'artifacts',
];

/** テキストとして検査する拡張子。 */
export const SECRET_SCAN_EXTENSIONS: readonly string[] = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.json',
  '.jsonc',
  '.yml',
  '.yaml',
  '.env',
  '.sh',
  '.toml',
];

function walk(directory: string, root: string, accumulator: InspectionFile[]): void {
  if (!existsSync(directory)) {
    return;
  }
  // 走査順を固定して判定を決定的にする (readdir の順序は環境依存)。
  const entries = readdirSync(directory).slice().sort();

  for (const entry of entries) {
    if (SECRET_SCAN_EXCLUDED_DIRECTORIES.includes(entry)) {
      continue;
    }
    const absolute = join(directory, entry);
    if (statSync(absolute).isDirectory()) {
      walk(absolute, root, accumulator);
      continue;
    }
    if (!SECRET_SCAN_EXTENSIONS.some((extension) => entry.endsWith(extension))) {
      continue;
    }
    accumulator.push({
      path: relative(root, absolute),
      content: readFileSync(absolute, 'utf8'),
    });
  }
}

/**
 * 走査対象ファイルを集める。
 *
 * - root が **workspace root** (pnpm-workspace.yaml を持つ) のときだけ SECRET_SCAN_DIRECTORIES へ絞る。
 * - それ以外 (`--root apps/hub` のような部分木) は root 全体を走査する。
 *
 * 「root 直下に scripts/ があれば絞る」のような推測はしない。
 * たまたま同名ディレクトリを持つ package を指したときに**走査範囲が黙って縮み、偽の緑になる**ため。
 */
export function collectSecretScanFiles(root: string): InspectionFile[] {
  const files: InspectionFile[] = [];
  const isWorkspaceRoot = existsSync(join(root, 'pnpm-workspace.yaml'));

  if (!isWorkspaceRoot) {
    walk(root, root, files);
    return files;
  }
  for (const name of SECRET_SCAN_DIRECTORIES) {
    walk(join(root, name), root, files);
  }
  return files;
}
