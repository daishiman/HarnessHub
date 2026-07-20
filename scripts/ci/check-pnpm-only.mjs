#!/usr/bin/env node
// pnpm 混入検査。quality_constraints の pnpm-only-no-npm (system-spec/frontend.md qa-007 / shared-layers §3) を CI ゲート化する。
// 検出したら非ゼロ終了する fail-closed 実装。test ID: HF-A1-CI-002 / HF-A1-CI-003
//
//   node scripts/ci/check-pnpm-only.mjs [--root <dir>] [--json <path>]

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
// 他パッケージマネージャの lockfile (qa-039「他パッケージマネージャ禁止」)。bun.lockb はバイナリ形式
const FORBIDDEN_LOCKFILES = ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "bun.lockb", "bun.lock"];
const EXCLUDES = ["node_modules", ".git", ".next", "dist", "build", "coverage"];

function parseArgs(argv) {
  const args = { root: REPO_ROOT, json: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--root") args.root = resolve(argv[++i]);
    else if (argv[i] === "--json") args.json = resolve(argv[++i]);
    else throw new Error(`未知の引数: ${argv[i]}`);
  }
  return args;
}

function findForbiddenLockfiles(dir, root, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (EXCLUDES.includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findForbiddenLockfiles(full, root, acc);
    else if (FORBIDDEN_LOCKFILES.includes(entry)) acc.push(relative(root, full));
  }
  return acc;
}

function main() {
  const args = parseArgs(process.argv);
  const violations = [];

  // 1. npm/yarn の lockfile 混入
  // 走査範囲は Hub monorepo (root 直下 + apps/ + packages/) に限定する。
  // リポジトリには plugin の vendor 資産など pnpm workspace 外の npm 生成物が同居しており、
  // それらは本 quality_constraint (pnpm-only-no-npm) の対象外のため。
  for (const entry of readdirSync(args.root)) {
    if (FORBIDDEN_LOCKFILES.includes(entry)) {
      violations.push({ kind: "forbidden-lockfile", path: entry, detail: "pnpm 以外のパッケージマネージャの lockfile が混入している" });
    }
  }
  for (const workspaceDir of ["apps", "packages"]) {
    for (const path of findForbiddenLockfiles(join(args.root, workspaceDir), args.root)) {
      violations.push({ kind: "forbidden-lockfile", path, detail: "pnpm 以外のパッケージマネージャの lockfile が混入している" });
    }
  }

  // 2. root package.json の packageManager pin
  const rootPkgPath = join(args.root, "package.json");
  if (!existsSync(rootPkgPath)) {
    violations.push({ kind: "missing-root-package-json", path: "package.json", detail: "root package.json が存在しない" });
  } else {
    const pkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
    if (typeof pkg.packageManager !== "string" || !pkg.packageManager.startsWith("pnpm@")) {
      violations.push({
        kind: "packagemanager-not-pinned",
        path: "package.json",
        detail: `packageManager が pnpm@ で pin されていない (現在値: ${pkg.packageManager ?? "未設定"})`,
      });
    }
  }

  const result = { scanned_root: args.root, violation_count: violations.length, violations };
  if (args.json) {
    mkdirSync(dirname(args.json), { recursive: true });
    writeFileSync(args.json, JSON.stringify(result, null, 2) + "\n");
  }

  if (violations.length === 0) {
    console.log("[pnpm-only] OK: npm/yarn lockfile の混入なし / packageManager は pnpm に pin 済み");
    process.exit(0);
  }
  console.error(`[pnpm-only] NG: ${violations.length} 件の違反を検出しました`);
  for (const v of violations) console.error(`  - [${v.kind}] ${v.path}: ${v.detail}`);
  process.exit(1);
}

main();
