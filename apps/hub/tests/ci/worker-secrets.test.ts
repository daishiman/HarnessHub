// HarnessHub-o2i.13: Cloudflare Workers Secret の台帳・wrangler 宣言・本番実投入が乖離しないことを検査する。
//
// 元の defect は「wrangler.jsonc が secrets.required に AUTH_ACCESS_TOKEN_SECRET を宣言し、既存テストも
// その**宣言**を検査していたのに、本番 Worker へは実際には投入されていなかった」こと。
// 宣言の検査は実投入の検査にならない。しかも middleware が fail-closed で principal=null に倒すため、
// 「鍵が無い」と「token が不正」が同じ 401 へ潰れ、設定漏れが障害として立ち上がらなかった。
//
// 台帳を足すだけでは同じ乖離がまた起きるので、突合そのものをゲートにし、
// **そのゲートが本当に乖離を検出できること**をここで固定する。

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/ci/check-worker-secrets.mjs');
const REGISTRY = path.join(REPO_ROOT, 'scripts/ci/worker-secrets-registry.json');
const WRANGLER = path.join(REPO_ROOT, 'apps/hub/wrangler.jsonc');
const workDirs: string[] = [];

type Requirement = 'required' | 'optional' | 'planned' | 'legacy';
type RegistryEntry = { name: string; requirement: Requirement; purpose: string; degrades: string; setup: string };
type Violation = { kind: string; name: string; detail: string };

const { extractSecretNames, reconcile } = (await import(pathToFileURL(SCRIPT).href)) as {
  extractSecretNames: (stdout: string) => string[];
  reconcile: (registry: Map<string, RegistryEntry>, declared: string[], configured: string[] | null) => Violation[];
};

function entry(name: string, requirement: Requirement): RegistryEntry {
  return { name, requirement, purpose: 'p', degrades: 'd', setup: 's' };
}

function registryOf(...entries: RegistryEntry[]): Map<string, RegistryEntry> {
  return new Map(entries.map((e) => [e.name, e]));
}

function kinds(violations: Violation[]): string[] {
  return violations.map((v) => v.kind).sort();
}

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe('worker secret 台帳の実データ', () => {
  const parsed = JSON.parse(readFileSync(REGISTRY, 'utf8')) as { entries: RegistryEntry[] };
  const declared: string[] = JSON.parse(readFileSync(WRANGLER, 'utf8').replace(/^\s*\/\/.*$/gm, '')).secrets.required;

  it('台帳の required 集合と wrangler.jsonc の宣言が一致する', () => {
    const required = parsed.entries.filter((e) => e.requirement === 'required').map((e) => e.name);
    expect(required.sort()).toEqual([...declared].sort());
  });

  it('AUTH_ACCESS_TOKEN_SECRET を required として持つ (o2i.13 の回帰固定)', () => {
    const target = parsed.entries.find((e) => e.name === 'AUTH_ACCESS_TOKEN_SECRET');
    expect(target?.requirement).toBe('required');
    // 未投入時に何が壊れるかを台帳が説明していること。ここが空だと調査者が影響範囲を判断できない
    expect(target?.degrades).toContain('401');
  });

  it('static 実行が合格する', () => {
    const stdout = execFileSync('node', [SCRIPT], { cwd: REPO_ROOT, encoding: 'utf8' });
    expect(stdout).toContain('[worker-secrets] OK');
  });
});

describe('ゲートが乖離を検出する', () => {
  const declared = ['AUTH_ACCESS_TOKEN_SECRET'];
  const registry = registryOf(
    entry('AUTH_ACCESS_TOKEN_SECRET', 'required'),
    entry('CRON_HEARTBEAT_URL', 'optional'),
    entry('RESEND_API_KEY', 'planned'),
    entry('AUTH_SECRET', 'legacy'),
  );

  it('required が本番へ未投入なら not-configured を出す', () => {
    // o2i.13 の defect そのもの。宣言はあるが実投入が無い状態
    const violations = reconcile(registry, declared, ['CRON_HEARTBEAT_URL', 'AUTH_SECRET']);
    expect(kinds(violations)).toEqual(['not-configured']);
    expect(violations[0]?.name).toBe('AUTH_ACCESS_TOKEN_SECRET');
  });

  it('台帳に無い secret が投入されていたら configured-undocumented を出す', () => {
    const violations = reconcile(registry, declared, ['AUTH_ACCESS_TOKEN_SECRET', 'MYSTERY_TOKEN']);
    expect(kinds(violations)).toEqual(['configured-undocumented']);
    expect(violations[0]?.name).toBe('MYSTERY_TOKEN');
  });

  it('実装が参照していない planned が投入されていたら configured-planned を出す', () => {
    const violations = reconcile(registry, declared, ['AUTH_ACCESS_TOKEN_SECRET', 'RESEND_API_KEY']);
    expect(kinds(violations)).toEqual(['configured-planned']);
  });

  it('required なのに wrangler.jsonc が宣言していなければ undeclared を出す', () => {
    const violations = reconcile(registry, [], ['AUTH_ACCESS_TOKEN_SECRET']);
    expect(kinds(violations)).toEqual(['undeclared']);
  });

  it('台帳が required でないものを wrangler.jsonc が宣言していたら over-declared を出す', () => {
    // 共有 Google OIDC runbook S-02 の判断: 未投入が恒常的な赤になるのを防ぐ
    const violations = reconcile(registry, [...declared, 'CRON_HEARTBEAT_URL'], ['AUTH_ACCESS_TOKEN_SECRET']);
    expect(kinds(violations)).toEqual(['over-declared']);
  });

  it('宣言だけあって台帳に無ければ undocumented-declaration を出す', () => {
    const violations = reconcile(registry, [...declared, 'GHOST_SECRET'], ['AUTH_ACCESS_TOKEN_SECRET']);
    expect(kinds(violations)).toEqual(['undocumented-declaration']);
  });

  it('optional / legacy の未投入は違反にしない', () => {
    // 落とすと「直しようのない赤」になり、ゲート全体が無視される方向へ効く
    expect(reconcile(registry, declared, ['AUTH_ACCESS_TOKEN_SECRET'])).toEqual([]);
  });
});

describe('wrangler 出力の解釈', () => {
  it('バナーや警告の角括弧が混ざっても secret 一覧を取り出す', () => {
    const stdout = [
      ' ⛅️ wrangler 4.113.0 (update available 4.118.0)',
      '▲ [WARNING] Wrangler is missing some expected Oauth scopes.',
      '[',
      '  { "name": "AUTH_ACCESS_TOKEN_SECRET", "type": "secret_text" },',
      '  { "name": "ENCRYPTION_KEK", "type": "secret_text" }',
      ']',
    ].join('\n');
    expect(extractSecretNames(stdout)).toEqual(['AUTH_ACCESS_TOKEN_SECRET', 'ENCRYPTION_KEK']);
  });

  it('secret が 1 件も無い本番を空配列として受け入れる', () => {
    expect(extractSecretNames('⛅️ wrangler\n[]')).toEqual([]);
  });

  it('JSON の後ろへ警告が出ても secret 一覧だけを取り出す', () => {
    const stdout = '[{"name":"AUTH_ACCESS_TOKEN_SECRET"}]\n▲ [WARNING] OAuth scope is stale.';
    expect(extractSecretNames(stdout)).toEqual(['AUTH_ACCESS_TOKEN_SECRET']);
  });

  it('配列として解釈できない出力は例外にする (未検査を合格と読み替えない)', () => {
    expect(() => extractSecretNames('permission denied')).toThrow();
  });
});

describe('CLI が違反時に非 0 で落ちる', () => {
  it('宣言と台帳がズレた最小リポジトリで exit 1 になる', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'hub-worker-secrets-'));
    workDirs.push(dir);
    mkdirSync(path.join(dir, 'apps', 'hub'), { recursive: true });
    writeFileSync(
      path.join(dir, 'apps', 'hub', 'wrangler.jsonc'),
      '// 行コメント付きの JSONC\n{ "secrets": { "required": ["DECLARED_BUT_UNDOCUMENTED"] } }\n',
      'utf8',
    );
    const registry = path.join(dir, 'registry.json');
    writeFileSync(registry, JSON.stringify({ entries: [entry('OTHER', 'required')] }), 'utf8');

    let status = 0;
    let stderr = '';
    try {
      execFileSync('node', [SCRIPT, '--root', dir, '--registry', registry], { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      const failure = error as { status?: number; stderr?: string };
      status = failure.status ?? 0;
      stderr = failure.stderr ?? '';
    }
    expect(status).toBe(1);
    expect(stderr).toContain('undocumented-declaration');
    expect(stderr).toContain('undeclared');
  });
});
