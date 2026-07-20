#!/usr/bin/env node
// Worker bundle 予算ゲート (HF-A2-BUNDLE-001/002)。gzip 後サイズが閾値を超えたら非ゼロ終了する
import { createReadStream } from 'node:fs';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

/** 既定 path は cwd ではなく apps/hub 自身を基準にする (どこから起動しても同じ対象を測る) */
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Cloudflare Workers Free プランの Worker サイズ上限 (gzip 後 3MiB)。quality_constraints: worker-bundle-budget */
const DEFAULT_BUDGET_BYTES = 3 * 1024 * 1024;

/** Worker script として数える拡張子。assets binding 経由で配信される静的ファイルは対象外 */
const COUNTED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.wasm']);

/** 静的アセット・ビルドキャッシュは Worker サイズに含まれない */
const EXCLUDED_DIRS = new Set(['assets', 'cache', '.cache']);

function parseArgs(argv) {
  const args = { artifact: null, budget: null, report: null };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--artifact') {
      args.artifact = value;
      i += 1;
    } else if (key === '--budget') {
      args.budget = Number(value);
      i += 1;
    } else if (key === '--report') {
      args.report = value;
      i += 1;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }
  }
  return args;
}

function resolveBudget(cliBudget) {
  if (cliBudget !== null && Number.isFinite(cliBudget) && cliBudget > 0) return cliBudget;
  const fromEnv = Number(process.env.HUB_BUNDLE_BUDGET_BYTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_BUDGET_BYTES;
}

async function collectFiles(root) {
  /** @type {string[]} */
  const found = [];
  /** @type {string[]} */
  const queue = [root];
  while (queue.length > 0) {
    const dir = queue.pop();
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        queue.push(full);
      } else if (entry.isFile() && COUNTED_EXTENSIONS.has(path.extname(entry.name))) {
        found.push(full);
      }
    }
  }
  return found.sort();
}

/** ファイル 1 件の gzip 後サイズ。全体をメモリに載せずに数える */
async function gzipSize(filePath) {
  let size = 0;
  const counter = new Writable({
    write(chunk, _encoding, callback) {
      size += chunk.length;
      callback();
    },
  });
  await pipeline(createReadStream(filePath), createGzip({ level: 9 }), counter);
  return size;
}

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(3)} MiB (${bytes} bytes)`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'usage: check-bundle.mjs [--artifact <dir|file>] [--budget <bytes>] [--report <path>]\n',
    );
    return 0;
  }

  const artifact = path.resolve(args.artifact ?? path.join(APP_ROOT, '.open-next'));
  const budget = resolveBudget(args.budget);
  // 既定の出力先は CI が証跡としてアップロードする apps/hub/artifacts/ 配下
  const reportPath = path.resolve(args.report ?? path.join(APP_ROOT, 'artifacts/bundle-report.json'));

  let artifactStat;
  try {
    artifactStat = await stat(artifact);
  } catch {
    // 計測対象が無い状態を「予算内」と誤判定しないため fail-closed にする
    process.stderr.write(
      `[bundle] 計測対象が見つかりません: ${artifact}\n` +
        '[bundle] 先に `pnpm --filter @harness-hub/hub run build:worker` を実行してください\n',
    );
    return 1;
  }

  const files = artifactStat.isDirectory() ? await collectFiles(artifact) : [artifact];
  if (files.length === 0) {
    process.stderr.write(`[bundle] 計測対象ファイルが 0 件です: ${artifact}\n`);
    return 1;
  }

  const measured = [];
  let total = 0;
  for (const file of files) {
    const size = await gzipSize(file);
    total += size;
    measured.push({ path: path.relative(artifact, file) || path.basename(file), gzipBytes: size });
  }

  measured.sort((a, b) => b.gzipBytes - a.gzipBytes);

  // test-design §2.6: 実測値を証跡に残す
  const report = {
    artifact,
    budgetBytes: budget,
    totalGzipBytes: total,
    withinBudget: total <= budget,
    fileCount: measured.length,
    largestFiles: measured.slice(0, 10),
    measuredAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(`[bundle] 対象: ${artifact} (${measured.length} files)\n`);
  process.stdout.write(`[bundle] gzip 後合計: ${formatBytes(total)}\n`);
  process.stdout.write(`[bundle] 予算: ${formatBytes(budget)}\n`);
  process.stdout.write(`[bundle] 計測結果: ${reportPath}\n`);

  if (total > budget) {
    process.stderr.write(
      `[bundle] 予算超過: ${formatBytes(total)} > ${formatBytes(budget)}\n` +
        '[bundle] コード分割・依存削減で対処してください (quality_constraints: worker-bundle-budget)\n',
    );
    return 1;
  }

  return 0;
}

const exitCode = await main();
process.exit(exitCode);
