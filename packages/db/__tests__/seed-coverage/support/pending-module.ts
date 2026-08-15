// P05 未実装のモジュールを読むためのヘルパ。
// 静的 import で書くと vitest の collection error になり「何を作ればよいか」が失敗ログから読めないため、
// 動的 import で包んで要求 export を失敗メッセージへ載せる。
// 契約の正本は docs/features/feat-demo-coverage-dataset/test-design.md §2。

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DESIGN_DOC = 'docs/features/feat-demo-coverage-dataset/test-design.md';

/** packages/db の絶対 path。呼び出し元ごとに相対基準が変わるのを避けるためここで固定する。 */
export const DB_PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** repository root の絶対 path。 */
export const REPO_ROOT = path.resolve(DB_PACKAGE_ROOT, '../..');

/**
 * P05 実装対象モジュールを読む。存在しなければ、要求 export を含むメッセージで失敗させる。
 *
 * @param packageRelativePath packages/db からの相対 path (例: 'scripts/demo-coverage/seed-id.ts')
 * @param requiredExports 当該モジュールが export すべき名前
 */
export async function loadPendingModule<T extends Record<string, unknown>>(
  packageRelativePath: string,
  requiredExports: readonly string[],
): Promise<T> {
  const specifier = pathToFileURL(path.join(DB_PACKAGE_ROOT, packageRelativePath)).href;
  let loaded: Record<string, unknown>;
  try {
    loaded = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>;
  } catch (cause) {
    throw new Error(
      [
        `P05 未実装: ${specifier} を読み込めない。`,
        `要求 export: ${requiredExports.join(', ')}`,
        `契約: ${DESIGN_DOC} §2`,
        `原因: ${(cause as Error).message}`,
      ].join('\n'),
    );
  }

  const missing = requiredExports.filter((name) => !(name in loaded));
  if (missing.length > 0) {
    throw new Error(
      [
        `P05 未実装: ${specifier} に export が不足している。`,
        `不足: ${missing.join(', ')}`,
        `契約: ${DESIGN_DOC} §2`,
      ].join('\n'),
    );
  }
  return loaded as T;
}
