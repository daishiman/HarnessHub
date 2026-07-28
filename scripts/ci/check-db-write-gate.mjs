#!/usr/bin/env node
// packages/db/repository/ 配下の write が全て guardedWrite (conflict.ts) を経由しているかの静的検査 (HarnessHub-mb7c)。
//
// **なぜ必要か。** guardedWrite はプロセス内直列化 + ロック競合再試行でローカル backend の
// 「BUSY を踏んだ接続が壊れる」問題 (conflict.ts 冒頭参照) を防ぐ。1 箇所でも
// `adapter.client.insert/update/delete(...)` を素で呼ぶ経路が残ると、その経路だけ
// 監査 append との競合で壊れうる。レビューだけでは新規追加時の見落としを防げないため、
// 「repository 配下の write は例外なくゲートを通す」ことを機械的に固定する。
//
// TypeScript AST (構文木) で repository 配下の全 `.insert/.update/.delete()` を列挙し、
// 次のどちらかを満たすことを検査する:
//   1. write が `guardedWrite(adapter, () => ...)` の第 2 引数 callback 内にある
//   2. write を持つローカル helper の全参照が、上記 callback 内からの直接呼び出しだけである
//
// receiver の字面を `adapter.client` に限定しないのが要点。`const db = adapter.client` や
// audit.ts の `appendOnce(db: CoreDb)` も同じ write として数える。repository 配下では
// `.insert/.update/.delete()` を DB query builder 専用名として扱い、非 DB collection に同名
// method を使うコードも fail-closed (安全側に倒して違反) とする。
//
// 使い方:
//   node scripts/ci/check-db-write-gate.mjs                  # 検出 0 件でなければ非ゼロ終了
//   node scripts/ci/check-db-write-gate.mjs --root <dir>     # 走査起点を差し替える (fixture 検証用)
//   node scripts/ci/check-db-write-gate.mjs --json <path>    # 検出結果を JSON で保存

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const TARGET_DIR = join('packages', 'db', 'repository');
const WRITE_METHODS = new Set(['insert', 'update', 'delete']);

function parseArgs(argv) {
  const args = { root: REPO_ROOT, json: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--root' || a === '--json') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`${a} の値が必要です`);
      if (a === '--root') args.root = resolve(value);
      else args.json = resolve(value);
      i += 1;
    } else throw new Error(`未知の引数: ${a}`);
  }
  return args;
}

/** repository 配下の *.ts を再帰走査する。将来 subdirectory が増えても母集団から脱落させない。 */
function listRepositoryFiles(root) {
  const dir = join(root, TARGET_DIR);
  if (!existsSync(dir)) return [];
  const files = [];
  const pending = [dir];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== '__tests__' && entry !== 'node_modules') pending.push(full);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
        files.push(full);
      }
    }
  }
  return files.sort();
}

function calledMethodName(call) {
  const expression = call.expression;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression) && ts.isStringLiteralLike(expression.argumentExpression)) {
    return expression.argumentExpression.text;
  }
  return null;
}

function isGuardedWriteCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'guardedWrite' &&
    node.arguments.length >= 2
  );
}

/** node が guardedWrite の第 2 引数に渡された inline callback の内側か。 */
function isInsideGuardedCallback(node) {
  for (let current = node; current.parent !== undefined; current = current.parent) {
    if (!ts.isArrowFunction(current) && !ts.isFunctionExpression(current)) continue;
    const call = current.parent;
    if (isGuardedWriteCall(call) && call.arguments[1] === current) return true;
  }
  return false;
}

/** write を含む、名前付きのローカル function/helper を返す。 */
function enclosingLocalHelper(node) {
  for (let current = node.parent; current !== undefined; current = current.parent) {
    if (ts.isFunctionDeclaration(current) && current.name !== undefined) {
      if (current.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return null;
      return { name: current.name.text, declarationName: current.name, body: current };
    }
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const declaration = current.parent;
      if (!ts.isVariableDeclaration(declaration) || !ts.isIdentifier(declaration.name)) return null;
      const statement = declaration.parent.parent;
      if (
        ts.isVariableStatement(statement) &&
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        return null;
      }
      return { name: declaration.name.text, declarationName: declaration.name, body: current };
    }
  }
  return null;
}

/**
 * helper の全参照が guarded callback 内の直接呼び出しだけなら、その helper 内 write も guarded。
 * 値として渡す・別名へ代入する・未ガード箇所から呼ぶ参照が 1 件でもあれば fail-closed。
 */
function isExclusivelyCalledInsideGuard(helper, sourceFile) {
  const calls = [];
  let unsafeReference = false;

  function visit(node) {
    if (ts.isIdentifier(node) && node.text === helper.name && node !== helper.declarationName) {
      const parent = node.parent;
      if (ts.isCallExpression(parent) && parent.expression === node) calls.push(parent);
      else unsafeReference = true;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return !unsafeReference && calls.length > 0 && calls.every((call) => isInsideGuardedCallback(call));
}

function scanFile(file, root) {
  const raw = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const violations = [];
  const writes = [];
  let guardedCallCount = 0;
  let lexicallyGuardedWriteCount = 0;
  let indirectlyGuardedWriteCount = 0;

  for (const diagnostic of sourceFile.parseDiagnostics ?? []) {
    const position = diagnostic.start ?? 0;
    const line = sourceFile.getLineAndCharacterOfPosition(position).line + 1;
    violations.push({
      file: relative(root, file),
      line,
      verb: 'parse',
      detail: `TypeScript 構文を解析できません: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`,
    });
  }

  function visit(node) {
    if (isGuardedWriteCall(node)) guardedCallCount += 1;
    if (ts.isCallExpression(node)) {
      const verb = calledMethodName(node);
      if (verb !== null && WRITE_METHODS.has(verb)) writes.push({ call: node, verb });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  const helperResultCache = new Map();
  for (const write of writes) {
    if (isInsideGuardedCallback(write.call)) {
      lexicallyGuardedWriteCount += 1;
      continue;
    }

    const helper = enclosingLocalHelper(write.call);
    let helperIsGuarded = false;
    if (helper !== null) {
      const cacheKey = helper.body.pos;
      if (!helperResultCache.has(cacheKey)) {
        helperResultCache.set(cacheKey, isExclusivelyCalledInsideGuard(helper, sourceFile));
      }
      helperIsGuarded = helperResultCache.get(cacheKey);
    }
    if (helperIsGuarded) {
      indirectlyGuardedWriteCount += 1;
      continue;
    }

    const line = sourceFile.getLineAndCharacterOfPosition(write.call.getStart(sourceFile)).line + 1;
    violations.push({
      file: relative(root, file),
      line,
      verb: write.verb,
      detail: `${write.call.expression.getText(sourceFile)}(...) が guardedWrite を経由していません`,
    });
  }

  return {
    violations,
    writeCallCount: writes.length,
    guardedCallCount,
    lexicallyGuardedWriteCount,
    indirectlyGuardedWriteCount,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const files = listRepositoryFiles(args.root);

  const violations = [];
  let writeCallCount = 0;
  let guardedCallCount = 0;
  let lexicallyGuardedWriteCount = 0;
  let indirectlyGuardedWriteCount = 0;

  if (files.length === 0) {
    violations.push({
      file: TARGET_DIR,
      line: 0,
      verb: 'scan',
      detail: '走査対象の TypeScript ファイルが 0 件です',
    });
  }

  for (const file of files) {
    const result = scanFile(file, args.root);
    violations.push(...result.violations);
    writeCallCount += result.writeCallCount;
    guardedCallCount += result.guardedCallCount;
    lexicallyGuardedWriteCount += result.lexicallyGuardedWriteCount;
    indirectlyGuardedWriteCount += result.indirectlyGuardedWriteCount;
  }

  const result = {
    check: 'db-write-gate',
    target_dir: TARGET_DIR,
    scanned_files: files.length,
    write_call_count: writeCallCount,
    guarded_span_count: guardedCallCount,
    lexically_guarded_write_count: lexicallyGuardedWriteCount,
    indirectly_guarded_write_count: indirectlyGuardedWriteCount,
    violations,
    passed: violations.length === 0,
  };

  if (args.json) {
    mkdirSync(dirname(args.json), { recursive: true });
    writeFileSync(args.json, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (violations.length === 0) {
    console.log(
      `[db-write-gate] OK: ${TARGET_DIR} 配下 ${files.length} ファイル / write ${writeCallCount} 件 (直接 ${lexicallyGuardedWriteCount} / helper 経由 ${indirectlyGuardedWriteCount}) / 全て guardedWrite 経由`,
    );
    process.exit(0);
  }
  console.error(
    `[db-write-gate] NG: guardedWrite を経由していない write 呼び出し ${violations.length} 件を検出しました`,
  );
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} [${v.verb}] ${v.detail}`);
  }
  process.exit(1);
}

main();
