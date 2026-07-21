#!/usr/bin/env node
// secret scan ゲートの実行入口 (G6 / qa-038【2】)。CI と手元から同じコマンドで呼ぶ。
// 判定ロジックは持たず、packages/inspection の純関数 (src/secret-scan-preset.ts) を呼ぶ薄い口に徹する。
// 検出 0 件で exit 0、1 件以上で非ゼロ終了する fail-closed 実装。
//
//   node scripts/scan-secrets.mjs [--root <dir>] [--json <path>]
//
// TS を buildless で実行するため、実体は vitest 経由で scan/secret-scan.scan.ts を走らせる
// (Node 単体の型ストリップは拡張子なしの相対 import を解決できないため)。

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");

/** pnpm-workspace.yaml を持つ最も近い祖先を workspace root とみなす。 */
function findWorkspaceRoot(start) {
  let current = start;
  for (;;) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
    const parent = dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

// 相対パスの基準。`pnpm --filter <pkg> run` は cwd を package へ移すため、
// 利用者が打った場所 (pnpm が INIT_CWD に入れる) を優先する。これが無いと
// `--root .` がリポジトリ root ではなく package を指してしまう。
const INVOCATION_CWD = process.env.INIT_CWD || process.cwd();

function parseArgs(argv) {
  // 既定の走査対象は workspace 全体。`pnpm --filter` 経由だと cwd が package になるため、
  // package 内だけを見て素通りする事故を防ぐ。
  const args = { root: findWorkspaceRoot(PACKAGE_ROOT), json: null };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    // `pnpm run <script> -- --root .` は区切りの `--` もそのまま渡ってくるため読み飛ばす
    if (flag === "--") {
      continue;
    }
    if (flag === "--root") {
      args.root = resolve(INVOCATION_CWD, argv[++i]);
    } else if (flag === "--json") {
      args.json = resolve(INVOCATION_CWD, argv[++i]);
    } else if (flag === "--help" || flag === "-h") {
      console.log("使い方: node scripts/scan-secrets.mjs [--root <dir>] [--json <path>]");
      process.exit(0);
    } else {
      console.error(`不明な引数です: ${flag}`);
      process.exit(2);
    }
  }
  return args;
}

const args = parseArgs(process.argv);

if (!existsSync(args.root)) {
  console.error(`走査対象が存在しません: ${args.root}`);
  process.exit(2);
}

// vitest は本 package の devDependency。PATH ではなく解決済みパスで起動し、
// linker 設定 (hoisted / isolated) に依存しないようにする。
const require = createRequire(import.meta.url);
let vitestBin;
try {
  vitestBin = join(dirname(require.resolve("vitest/package.json")), "vitest.mjs");
} catch {
  console.error("vitest を解決できませんでした。依存がインストールされているか確認してください。");
  process.exit(2);
}

const result = spawnSync(
  process.execPath,
  [vitestBin, "run", "--config", join(PACKAGE_ROOT, "vitest.scan.config.ts")],
  {
    cwd: PACKAGE_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      HARNESS_SECRET_SCAN_ROOT: args.root,
      HARNESS_SECRET_SCAN_JSON: args.json ?? "",
    },
  },
);

if (result.error) {
  console.error(`secret scan の起動に失敗しました: ${result.error.message}`);
  process.exit(2);
}

// vitest の終了コードをそのまま伝播する (検出ありなら非ゼロ)。
process.exit(result.status ?? 1);
