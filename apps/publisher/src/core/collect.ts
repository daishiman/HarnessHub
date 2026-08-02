/**
 * package ディレクトリの収集 (AD-1 core/)。
 *
 * skills-package (PKG-SKILLS-ONLY が強制する形: 直下は plugin.json/README 等のみ、
 * 実行資産は skills/ 配下のみ) を対象に、inspection-client/ へ渡す `InspectionFile[]` を組み立てる。
 * ここでは何が正しい package 構造かを判定しない — 全ファイルをそのまま集めるだけで、
 * 構造判定は inspection-client/ 経由の PKG-* ルールに委ねる (AD-3)。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import type { InspectionFile } from '@harness-hub/inspection';

/** バージョン管理・依存解決の産物は package の一部ではないため常に除外する。 */
const EXCLUDED_DIR_NAMES = new Set(['.git', 'node_modules']);

function walk(rootDir: string, currentDir: string, acc: string[]): void {
  for (const entry of readdirSync(currentDir)) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue;
    const fullPath = join(currentDir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(rootDir, fullPath, acc);
      continue;
    }
    if (stat.isFile()) acc.push(fullPath);
  }
}

/** OS 依存の path 区切りを inspection の契約である POSIX 相対 path へ揃える。 */
function toPackageRelativePath(rootDir: string, absolutePath: string): string {
  return relative(rootDir, absolutePath).split(sep).join('/');
}

/**
 * package ディレクトリを再帰的に読み込み、判定順序に依存しないよう相対 path でソートして返す。
 *
 * utf-8 で読む。skill の指示文 (PKG-RISKY-INSTRUCTIONS が見る Markdown) は日本語を含むため、
 * バイト列をそのまま保持する latin1 では多バイト文字が壊れて正規表現が一致しなくなる。
 * 非 UTF-8 のバイナリ資産は不正シーケンスが置換文字になるだけで、NUL バイト自体は utf-8 decode を
 * 経ても保持されるため PKG-FORBIDDEN-BINARY の NUL 検出は影響を受けない。
 */
export function collectPackageFiles(packageDir: string): readonly InspectionFile[] {
  const absolutePaths: string[] = [];
  walk(packageDir, packageDir, absolutePaths);
  return absolutePaths
    .map((absolutePath) => ({
      path: toPackageRelativePath(packageDir, absolutePath),
      content: readFileSync(absolutePath, 'utf-8'),
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
