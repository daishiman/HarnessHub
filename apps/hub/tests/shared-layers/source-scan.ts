// contract test 用のソース走査ヘルパ。「public API 経由で参照しているか」を静的に確かめる
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** apps/hub のルート */
export const APP_ROOT = path.resolve(HERE, '../..');
export const APP_SRC = path.join(APP_ROOT, 'src');
export const CONSUMER_A = path.join(APP_ROOT, 'tests/fixtures/consumer-a');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

export interface ImportRecord {
  readonly file: string;
  readonly specifier: string;
}

export function listSourceFiles(root: string): readonly string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next' || entry === '.open-next') continue;
        walk(full);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry))) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found;
}

/** `import ... from '<specifier>'` / `export ... from '<specifier>'` / `import('<specifier>')` を拾う */
export function listImports(root: string): readonly ImportRecord[] {
  const pattern = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
  const records: ImportRecord[] = [];
  for (const file of listSourceFiles(root)) {
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) {
        records.push({ file: path.relative(APP_ROOT, file), specifier });
      }
    }
  }
  return records;
}

/** package 名ちょうどの import (deep import ではない public API 参照) */
export function publicApiImports(root: string, packageName: string): readonly ImportRecord[] {
  return listImports(root).filter((record) => record.specifier === packageName);
}

/** `@harness-hub/x/src/...` のような deep import。公開入口を迂回しているので違反 */
export function deepImports(root: string, packageName: string): readonly ImportRecord[] {
  return listImports(root).filter((record) => record.specifier.startsWith(`${packageName}/`));
}

/**
 * apps/hub 内で owner される共通層 (src/shared/* / src/middleware) の公開入口 index への参照。
 * これらは package 化されていないため package 名では参照できず、公開入口が index.ts になる。
 */
export function inAppEntryImports(root: string, layerDir: string): readonly ImportRecord[] {
  const dir = path.join(APP_ROOT, layerDir);
  const entry = path.join(dir, 'index');
  return listImports(root)
    .filter((record) => !isOwnedBy(record, dir))
    .filter((record) => stripExtension(resolveRelativeSpecifier(record)) === entry);
}

/** 公開入口 index を迂回して owner 内部のファイルを直接参照している import。境界の迂回なので違反 */
export function inAppDeepImports(root: string, layerDir: string): readonly ImportRecord[] {
  const dir = path.join(APP_ROOT, layerDir);
  const entry = path.join(dir, 'index');
  return (
    listImports(root)
      // owner 自身の内部 import は境界の迂回ではない
      .filter((record) => !isOwnedBy(record, dir))
      .filter((record) => {
        const resolved = resolveRelativeSpecifier(record);
        if (resolved === null) return false;
        if (!resolved.startsWith(dir + path.sep)) return false;
        return stripExtension(resolved) !== entry;
      })
  );
}

function isOwnedBy(record: ImportRecord, layerDirAbsolute: string): boolean {
  return path.resolve(APP_ROOT, record.file).startsWith(layerDirAbsolute + path.sep);
}

/** 相対 specifier を絶対 path へ解決する。非相対 (package 名) は null */
function resolveRelativeSpecifier(record: ImportRecord): string | null {
  if (!record.specifier.startsWith('.')) return null;
  return path.resolve(APP_ROOT, path.dirname(record.file), record.specifier);
}

function stripExtension(filePath: string | null): string | null {
  if (filePath === null) return null;
  const ext = path.extname(filePath);
  return SOURCE_EXTENSIONS.has(ext) || ext === '.js' || ext === '.jsx' ? filePath.slice(0, -ext.length) : filePath;
}

/** 相対 path で packages/ を直接参照している import。package 境界の迂回なので違反 */
export function boundaryBypassImports(root: string): readonly ImportRecord[] {
  return listImports(root).filter(
    (record) => record.specifier.startsWith('.') && /(^|\/)packages\//.test(record.specifier),
  );
}
