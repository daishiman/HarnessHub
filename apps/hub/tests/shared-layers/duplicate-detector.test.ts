// HF-A4-DUP-001/002: 共通層の重複実装が 0 件であること、および detector 自体が違反を検出できること
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/ci/check-shared-layer-duplicates.mjs');
const VIOLATION_FIXTURE = path.join(REPO_ROOT, 'apps/hub/tests/fixtures/duplicate-violation');

interface ScanResult {
  scanned_files: number;
  registered_layers: number;
  registered_mechanisms: number;
  duplicate_count: number;
  findings: { kind: string; layer: string; file: string; symbol?: string }[];
}

const workDirs: string[] = [];

function runDetector(args: readonly string[]): { status: number; result: ScanResult } {
  const dir = mkdtempSync(path.join(tmpdir(), 'hub-dup-'));
  workDirs.push(dir);
  const jsonPath = path.join(dir, 'duplicate-scan.json');
  let status = 0;
  try {
    execFileSync(process.execPath, [SCRIPT, '--json', jsonPath, ...args], { encoding: 'utf8' });
  } catch (error) {
    status = (error as { status?: number }).status ?? 1;
  }
  return { status, result: JSON.parse(readFileSync(jsonPath, 'utf8')) as ScanResult };
}

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe('HF-A4-DUP-001: 実リポジトリの重複実装が 0 件', () => {
  const { status, result } = runDetector([]);

  it('検出件数が 0 件で終了コードが 0', () => {
    expect(result.findings).toEqual([]);
    expect(result.duplicate_count).toBe(0);
    expect(status).toBe(0);
  });

  it('走査が空振りしていない (登録層と走査ファイルが存在する)', () => {
    // 走査 0 ファイルでも「重複 0 件」になるため、空振りによる偽の緑を排除する
    expect(result.registered_layers).toBeGreaterThan(0);
    expect(result.registered_mechanisms).toBe(4);
    expect(result.scanned_files).toBeGreaterThan(0);
  });
});

describe('認可 wrapper の静的検査 (ADR R-19)', () => {
  function routeFixture(source: string): string {
    const root = mkdtempSync(path.join(tmpdir(), 'hub-route-policy-'));
    workDirs.push(root);
    const routeDir = path.join(root, 'apps/hub/src/app/api/private');
    mkdirSync(routeDir, { recursive: true });
    writeFileSync(path.join(routeDir, 'route.ts'), source, 'utf8');
    return root;
  }

  it('wrapper を通らない private route handler を検出する', () => {
    const { status, result } = runDetector([
      '--root',
      routeFixture('export async function GET(): Promise<Response> { return new Response("ok"); }'),
    ]);
    expect(status).not.toBe(0);
    expect(result.findings.some((finding) => finding.kind === 'unwrapped-route-handler')).toBe(true);
  });

  it('withAuthz() を通る route handler は違反にしない', () => {
    const { result } = runDetector([
      '--root',
      routeFixture('const withAuthz = (fn: unknown) => fn; export const GET = withAuthz(() => new Response("ok"));'),
    ]);
    expect(result.findings.filter((finding) => finding.kind === 'unwrapped-route-handler')).toStrictEqual([]);
  });
});

// ゲートの実効性検証。ここが pass しない限り HF-A4-DUP-001 の緑は信用できない
describe('HF-A4-DUP-002: detector が意図的違反を検出する', () => {
  const { status, result } = runDetector(['--include-fixtures', '--root', VIOLATION_FIXTURE]);

  it('違反を 1 件以上検出し非ゼロ終了する', () => {
    expect(result.duplicate_count).toBeGreaterThan(0);
    expect(status).not.toBe(0);
  });

  it('検出単位 1: owner package 外の同名 export を検出する', () => {
    const found = result.findings.filter((f) => f.kind === 'owner-outside-implementation');
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((f) => f.symbol === 'DuplicatedWidget')).toBe(true);
  });

  it('検出単位 2: 境界迂回の deep import を検出する', () => {
    const found = result.findings.filter((f) => f.kind === 'boundary-bypass-deep-import');
    expect(found.length).toBeGreaterThan(0);
  });

  it('既定の走査では fixture の違反を拾わない (本番ゲートを汚染しない)', () => {
    const { result: normal } = runDetector([]);
    expect(normal.findings.filter((f) => f.file.includes('duplicate-violation'))).toEqual([]);
  });
});
