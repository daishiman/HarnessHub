// scripts/ci/check-db-write-gate.mjs の正常系・実効性検証 (HarnessHub-mb7c 受入条件 1・2)。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/ci/check-db-write-gate.mjs');
const VIOLATION_FIXTURE = path.join(REPO_ROOT, 'packages/db/__tests__/fixtures/db-write-gate-violation');

interface GateResult {
  scanned_files: number;
  write_call_count: number;
  guarded_span_count: number;
  lexically_guarded_write_count: number;
  indirectly_guarded_write_count: number;
  violations: { file: string; line: number; verb: string; detail: string }[];
  passed: boolean;
}

const workDirs: string[] = [];

function runGate(args: readonly string[]): { status: number; result: GateResult } {
  const dir = mkdtempSync(path.join(tmpdir(), 'db-write-gate-'));
  workDirs.push(dir);
  const jsonPath = path.join(dir, 'result.json');
  let status = 0;
  try {
    execFileSync(process.execPath, [SCRIPT, '--json', jsonPath, ...args], { encoding: 'utf8' });
  } catch (error) {
    status = (error as { status?: number }).status ?? 1;
  }
  return { status, result: JSON.parse(readFileSync(jsonPath, 'utf8')) as GateResult };
}

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

// package 全テストを並列実行すると AST 走査の child process が CPU を奪い合うため、
// 正常系・違反 fixture は module ごとに 1 回だけ実行し、各 assertion で同じ証跡を共有する。
const normalGate = runGate([]);
const violationGate = runGate(['--root', VIOLATION_FIXTURE]);

describe('db-write-gate-001: 実リポジトリの repository write が全て guardedWrite 経由', () => {
  const { status, result } = normalGate;

  it('違反 0 件で終了コードが 0', () => {
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(status).toBe(0);
  });

  it('走査が空振りしていない (write 呼び出しを実際に検出できている)', () => {
    // 走査 0 件でも「違反 0 件」になるため、空振りによる偽の緑を排除する
    expect(result.scanned_files).toBeGreaterThan(0);
    expect(result.write_call_count).toBeGreaterThan(0);
    expect(result.guarded_span_count).toBeGreaterThan(0);
    expect(result.lexically_guarded_write_count).toBeGreaterThan(0);
    // audit.ts の appendOnce(db: CoreDb) を数え、別名/helper 経由が母集団から脱落していないこと。
    expect(result.indirectly_guarded_write_count).toBeGreaterThan(0);
  });
});

// ゲートの実効性検証。ここが pass しない限り db-write-gate-001 の緑は信用できない
describe('db-write-gate-002: fixture の未ガード write を検出して非ゼロ終了する', () => {
  const { status, result } = violationGate;

  it('guardedWrite を外した insert/update/delete を検出し非ゼロ終了する', () => {
    expect(status).not.toBe(0);
    expect(result.passed).toBe(false);
    expect(new Set(result.violations.map((v) => v.verb))).toEqual(new Set(['insert', 'update', 'delete']));
    expect(result.violations.every((v) => v.file.includes('unguarded.ts'))).toBe(true);
  });

  it('直接 callback と helper 経由の guarded write は違反にしない (全件検出のような雑な判定ではない)', () => {
    expect(result.write_call_count).toBe(5);
    expect(result.violations).toHaveLength(3);
    expect(result.lexically_guarded_write_count).toBe(1);
    expect(result.indirectly_guarded_write_count).toBe(1);
  });

  it('既定の走査 (REPO_ROOT) では fixture の違反を拾わない (本番ゲートを汚染しない)', () => {
    expect(normalGate.result.violations.filter((v) => v.file.includes('db-write-gate-violation'))).toEqual([]);
  });
});
