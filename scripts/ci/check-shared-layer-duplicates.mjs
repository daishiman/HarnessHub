#!/usr/bin/env node
// 共通層の重複実装 detector。第 4 acceptance (shared-layers 登録済み共通層の単一実装 owner) を機械判定する。
// 判定仕様の正本: docs/features/feat-hub-foundation/requirements-baseline.md §4.2 A4-2
//
// 検出単位は 2 種のみ (名前と参照経路だけで決定的に判定する。AST 類似度・コードクローン検出は使わない):
//   1. owner 外実装   : 登録共通層の公開 API と同名の export が owner package の外に存在する
//   2. 境界迂回参照   : consumer が package 名ではなく相対 path / deep import で共通層実装を参照している
//
// 使い方:
//   node scripts/ci/check-shared-layer-duplicates.mjs               # 検出 0 件でなければ非ゼロ終了
//   node scripts/ci/check-shared-layer-duplicates.mjs --root <dir>  # 走査起点を差し替える (fixture 検証用)
//   node scripts/ci/check-shared-layer-duplicates.mjs --json <path>  # 検出結果を JSON で保存 (E3 証跡)
//   node scripts/ci/check-shared-layer-duplicates.mjs --report <path> # owner/公開API/consumer 一覧を保存 (E1 証跡)
//   node scripts/ci/check-shared-layer-duplicates.mjs --no-fail      # 終了コードを常に 0 にする (レポート生成のみ)

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");

/** 既定の除外。duplicate-violation は detector 自体の実効性検証 (HF-A4-DUP-002) 用の意図的違反なので既定では走査しない。 */
const DEFAULT_EXCLUDES = ["node_modules", ".next", "dist", "build", "coverage", ".git", "duplicate-violation"];
const SOURCE_EXT = [".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx"];

function parseArgs(argv) {
  const args = { root: REPO_ROOT, json: null, report: null, fail: true, excludes: [...DEFAULT_EXCLUDES] };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--root") args.root = resolve(argv[++i]);
    else if (a === "--json") args.json = resolve(argv[++i]);
    else if (a === "--report") args.report = resolve(argv[++i]);
    else if (a === "--no-fail") args.fail = false;
    else if (a === "--include-fixtures") args.excludes = args.excludes.filter((e) => e !== "duplicate-violation");
    else if (a === "--exclude") args.excludes.push(argv[++i]);
    else throw new Error(`未知の引数: ${a}`);
  }
  return args;
}

function walk(dir, excludes, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (excludes.includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, excludes, acc);
    else if (SOURCE_EXT.some((ext) => entry.endsWith(ext))) acc.push(full);
  }
  return acc;
}

/** ファイル内の export 名を抽出する (宣言形式と named export 形式の両方)。 */
function extractExportNames(content) {
  const names = new Set();
  const declRe = /export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of content.matchAll(declRe)) names.add(m[1]);
  const namedRe = /export\s*\{([^}]*)\}/g;
  for (const m of content.matchAll(namedRe)) {
    for (const raw of m[1].split(",")) {
      const piece = raw.trim();
      if (!piece) continue;
      const asMatch = piece.match(/\bas\s+([A-Za-z_$][\w$]*)\s*$/);
      const name = asMatch ? asMatch[1] : piece.replace(/^type\s+/, "").trim();
      if (name && name !== "default") names.add(name);
    }
  }
  return names;
}

/** `export * from './x'` / `export {..} from './x'` の再エクスポート先を解決する。 */
function resolveModulePath(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    ...SOURCE_EXT.map((ext) => base + ext),
    ...SOURCE_EXT.map((ext) => join(base, "index" + ext)),
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}

/** owner package の公開 API 表面 (index.ts を起点に再エクスポートを辿る) を収集する。 */
function collectPublicApi(ownerDir, seen = new Set()) {
  const names = new Set();
  const indexFile = SOURCE_EXT.map((ext) => join(ownerDir, "src", "index" + ext)).find((p) => existsSync(p))
    ?? SOURCE_EXT.map((ext) => join(ownerDir, "index" + ext)).find((p) => existsSync(p));
  if (!indexFile) return { names, indexFile: null };

  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const content = readFileSync(file, "utf8");
    for (const n of extractExportNames(content)) names.add(n);
    for (const m of content.matchAll(/export\s+\*\s+from\s+["']([^"']+)["']/g)) {
      const target = resolveModulePath(file, m[1]);
      if (target) visit(target);
    }
    for (const m of content.matchAll(/export\s*\{[^}]*\}\s*from\s*["']([^"']+)["']/g)) {
      const target = resolveModulePath(file, m[1]);
      if (target) visit(target);
    }
  };
  visit(indexFile);
  return { names, indexFile };
}

function isInside(file, dirPath) {
  const rel = relative(dirPath, file);
  // rel が空 = 同一 path、".." 始まり = 外側、絶対 path = 別ドライブ/無関係
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function main() {
  const args = parseArgs(process.argv);
  const registry = JSON.parse(readFileSync(join(REPO_ROOT, "scripts", "ci", "shared-layer-registry.json"), "utf8"));

  const scanRoots = ["apps", "packages"].map((d) => join(args.root, d)).filter((d) => existsSync(d));
  const files = scanRoots.flatMap((d) => walk(d, args.excludes));

  const findings = [];
  const report = { generated_for: "E1 (全登録共通層の owner / public API / consumer 一覧)", layers: [] };

  for (const layer of registry.layers) {
    const ownerDir = join(args.root, layer.owner_package);
    const { names: publicApi, indexFile } = collectPublicApi(ownerDir);
    report.layers.push({
      id: layer.id,
      shared_layers_ref: layer.shared_layers_ref,
      owner_package: layer.owner_package,
      package_name: layer.package_name ?? null,
      owner_exists: existsSync(ownerDir),
      public_api: [...publicApi].sort(),
      public_api_entry: indexFile ? relative(args.root, indexFile) : null,
      consumers: layer.consumers ?? [],
      boundary_only: layer.boundary_only ?? false,
    });

    // 検出 1: owner 外に同名 export
    if (publicApi.size > 0) {
      for (const file of files) {
        if (isInside(file, ownerDir)) continue;
        const content = readFileSync(file, "utf8");
        const exported = extractExportNames(content);
        for (const name of exported) {
          if (publicApi.has(name)) {
            findings.push({
              kind: "owner-outside-implementation",
              layer: layer.id,
              owner_package: layer.owner_package,
              symbol: name,
              file: relative(args.root, file),
              detail: `登録共通層 ${layer.id} の公開 API と同名の export が owner package 外に存在する`,
            });
          }
        }
      }
    }

    // 検出 2: 境界迂回参照 (deep import / 相対 path での owner 実装参照)
    if (layer.package_name) {
      const deepImportRe = new RegExp(`from\\s+["']${layer.package_name.replace("/", "\\/")}\\/(?!$)[^"']+["']`, "g");
      for (const file of files) {
        if (isInside(file, ownerDir)) continue;
        const content = readFileSync(file, "utf8");
        for (const m of content.matchAll(deepImportRe)) {
          findings.push({
            kind: "boundary-bypass-deep-import",
            layer: layer.id,
            file: relative(args.root, file),
            detail: `${layer.package_name} を package 名ではなく deep import で参照している: ${m[0]}`,
          });
        }
        const relCrossRe = new RegExp(`from\\s+["'](?:\\.\\.\\/)+${layer.owner_package.replace(/\//g, "\\/")}[^"']*["']`, "g");
        for (const m of content.matchAll(relCrossRe)) {
          findings.push({
            kind: "boundary-bypass-relative-path",
            layer: layer.id,
            file: relative(args.root, file),
            detail: `${layer.owner_package} を相対 path で越境参照している: ${m[0]}`,
          });
        }
      }
    }
  }

  const result = {
    scanned_root: args.root,
    scanned_files: files.length,
    registered_layers: registry.layers.length,
    duplicate_count: findings.length,
    findings,
  };

  if (args.json) {
    mkdirSync(dirname(args.json), { recursive: true });
    writeFileSync(args.json, JSON.stringify(result, null, 2) + "\n");
  }
  if (args.report) {
    mkdirSync(dirname(args.report), { recursive: true });
    writeFileSync(args.report, JSON.stringify(report, null, 2) + "\n");
  }

  if (findings.length === 0) {
    console.log(`[duplicate-detector] OK: 登録共通層 ${registry.layers.length} 件 / 走査 ${files.length} ファイル / 重複 0 件`);
    process.exit(0);
  }
  console.error(`[duplicate-detector] NG: 重複実装 ${findings.length} 件を検出しました`);
  for (const f of findings) console.error(`  - [${f.kind}] ${f.file}: ${f.detail}`);
  console.error("  例外は scripts/ci/shared-layer-registry.json (docs/shared-layers.md の登録簿) の変更のみを正式経路とします。");
  process.exit(args.fail ? 1 : 0);
}

main();
