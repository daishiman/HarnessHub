// HarnessHub-fnzl: GitHub Actions の secret / variable 台帳と workflow の実参照が乖離しないことを検査する。
//
// 元の defect は「backup.yml が要求する secret がどの文書にも載っておらず、0 件のまま 4 夜連続で失敗した」こと。
// 台帳を置くだけでは同じ乖離がまた起きるため、台帳と workflow の突合そのものを CI ゲートにし、
// そのゲートが本当に乖離を検出できることをここで確かめる。

// biome-ignore-all lint/suspicious/noTemplateCurlyInString: 検査対象の fixture が GitHub Actions の `${{ secrets.X }}` 記法そのもの。JS のテンプレート展開ではなく、本番 workflow と同じ文字列を渡すことが検査の前提

import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCRIPT = path.join(REPO_ROOT, 'scripts/ci/check-actions-secrets.mjs');
const workDirs: string[] = [];

type RegistryEntry = {
  name: string;
  kind: 'secret' | 'variable';
  requirement: 'required' | 'optional' | 'auto';
  workflows: string[];
  purpose: string;
  setup: string;
};

function makeWorkDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'hub-actions-secrets-'));
  workDirs.push(dir);
  return dir;
}

/** 検査対象の最小リポジトリ (workflows + 台帳) を組み立てる。 */
function scaffold(workflows: Record<string, string>, entries: RegistryEntry[]) {
  const dir = makeWorkDir();
  const workflowsDir = path.join(dir, '.github', 'workflows');
  mkdirSync(workflowsDir, { recursive: true });
  for (const [name, body] of Object.entries(workflows)) writeFileSync(path.join(workflowsDir, name), body, 'utf8');
  const registry = path.join(dir, 'registry.json');
  writeFileSync(registry, JSON.stringify({ entries }), 'utf8');
  return { root: dir, registry };
}

/**
 * gh CLI を PATH 上の fake に差し替えて --live 経路を検証する。
 *
 * 本体は `gh api repos/:owner/:repo/actions/{secrets,variables}` を叩くので、fake も同じ引数形で受ける。
 * ここを本物と違う形にすると、fake では通るのに実 gh で落ちる穴が空く (実際に一度そうなった)。
 */
function fakeGhBin(secrets: string[], variables: string[]): string {
  const dir = makeWorkDir();
  const gh = path.join(dir, 'gh');
  writeFileSync(
    gh,
    [
      '#!/bin/sh',
      '[ "$1" = "api" ] || { echo "unexpected gh invocation: $*" >&2; exit 1; }',
      'case "$2" in',
      `  */actions/secrets) printf '%s' ${JSON.stringify(secrets.join('\n'))};;`,
      `  */actions/variables) printf '%s' ${JSON.stringify(variables.join('\n'))};;`,
      '  *) echo "unexpected endpoint: $2" >&2; exit 1;;',
      'esac',
      '',
    ].join('\n'),
    'utf8',
  );
  chmodSync(gh, 0o755);
  return dir;
}

function runCheck(argv: string[], extraPath?: string): { status: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [SCRIPT, ...argv], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: extraPath ? { ...process.env, PATH: `${extraPath}:${process.env.PATH ?? ''}` } : process.env,
    });
    return { status: 0, output };
  } catch (error) {
    const result = error as { status?: number; stdout?: string; stderr?: string };
    return { status: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
  }
}

const entry = (over: Partial<RegistryEntry> & { name: string }): RegistryEntry => ({
  kind: 'secret',
  requirement: 'required',
  workflows: ['a.yml'],
  purpose: 'テスト用',
  setup: 'gh secret set X',
  ...over,
});

afterAll(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe('Actions secret / variable 台帳の突合', () => {
  it('本番構成 (実 workflows × 実台帳) が乖離なしで通る', () => {
    const result = runCheck([]);
    expect(result.output).not.toContain('NG');
    expect(result.status).toBe(0);
  });

  it('台帳に無い secret を workflow が参照していたら落ちる', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ secrets.KNOWN }} ${{ secrets.UNDOCUMENTED }}' }, [
      entry({ name: 'KNOWN' }),
    ]);
    const result = runCheck(['--root', root, '--registry', registry]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('UNDOCUMENTED');
  });

  it('説明コメントとコメントアウト済み step を実参照として数えない', () => {
    const { root, registry } = scaffold(
      {
        'a.yml': [
          '# secrets.PLAIN_COMMENT は説明に過ぎない',
          '# disabled: ${{ secrets.COMMENTED_OUT }}',
          'run: echo ok',
        ].join('\n'),
      },
      [],
    );
    const result = runCheck(['--root', root, '--registry', registry]);
    expect(result).toMatchObject({ status: 0 });
  });

  it('台帳の kind と参照コンテキスト (secrets. / vars.) の食い違いを落とす', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ vars.MISLABELED }}' }, [
      entry({ name: 'MISLABELED', kind: 'secret' }),
    ]);
    const result = runCheck(['--root', root, '--registry', registry]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('MISLABELED');
  });

  it('同じ名前を secrets / vars の両方で参照する曖昧な workflow を落とす', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ secrets.AMBIGUOUS }} ${{ vars.AMBIGUOUS }}' }, [
      entry({ name: 'AMBIGUOUS' }),
    ]);
    const result = runCheck(['--root', root, '--registry', registry]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('reference-kind-conflict');
    expect(result.output).toContain('AMBIGUOUS');
  });

  it('台帳の workflows 欄が実態とずれていたら落ちる (影響範囲を追えなくなるため)', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ secrets.USED }}' }, [
      entry({ name: 'USED', workflows: ['a.yml', 'b.yml'] }),
    ]);
    const result = runCheck(['--root', root, '--registry', registry]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('b.yml');
  });

  it('どの workflow も参照していない台帳エントリを落とす (投入すれば効くと誤読されるため)', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ secrets.USED }}' }, [
      entry({ name: 'USED' }),
      entry({ name: 'GHOST', requirement: 'optional' }),
    ]);
    const result = runCheck(['--root', root, '--registry', registry]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('GHOST');
  });

  it('--live: required が未投入なら落ちる', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ secrets.NEEDED }}' }, [entry({ name: 'NEEDED' })]);
    const result = runCheck(['--root', root, '--registry', registry, '--live'], fakeGhBin([], []));
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('NEEDED');
  });

  it('--live: required が投入済みなら通る', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ secrets.NEEDED }}' }, [entry({ name: 'NEEDED' })]);
    const result = runCheck(['--root', root, '--registry', registry, '--live'], fakeGhBin(['NEEDED'], []));
    expect(result).toMatchObject({ status: 0 });
  });

  it('--live: optional / auto は未投入でも落とさない (縮退はするが workflow は成功するため)', () => {
    const { root, registry } = scaffold(
      { 'a.yml': 'run: echo ${{ secrets.NICE_TO_HAVE }} ${{ secrets.GITHUB_TOKEN }}' },
      [entry({ name: 'NICE_TO_HAVE', requirement: 'optional' }), entry({ name: 'GITHUB_TOKEN', requirement: 'auto' })],
    );
    const result = runCheck(['--root', root, '--registry', registry, '--live'], fakeGhBin([], []));
    expect(result).toMatchObject({ status: 0 });
  });

  it('--live: 台帳に無い secret が GitHub に投入されていたら落ちる (用途不明の credential を残さない)', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ secrets.NEEDED }}' }, [entry({ name: 'NEEDED' })]);
    const result = runCheck(['--root', root, '--registry', registry, '--live'], fakeGhBin(['NEEDED', 'ORPHAN'], []));
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('ORPHAN');
  });

  it('--live: 台帳と違う入れ物にも同名を投入していたら落ちる', () => {
    const { root, registry } = scaffold({ 'a.yml': 'run: echo ${{ vars.PUBLIC_URL }}' }, [
      entry({ name: 'PUBLIC_URL', kind: 'variable' }),
    ]);
    const result = runCheck(
      ['--root', root, '--registry', registry, '--live'],
      fakeGhBin(['PUBLIC_URL'], ['PUBLIC_URL']),
    );
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('configured-kind-mismatch');
    expect(result.output).toContain('PUBLIC_URL');
  });

  it('deploy / backup の台帳 setup と foundation runbook の投入コマンドが一致する', () => {
    const registry = JSON.parse(
      readFileSync(path.join(REPO_ROOT, 'scripts/ci/actions-secrets-registry.json'), 'utf8'),
    ) as { entries: RegistryEntry[] };
    const runbook = readFileSync(path.join(REPO_ROOT, 'docs/features/feat-hub-foundation/runbook.md'), 'utf8');
    const relevant = registry.entries.filter(
      (item) =>
        item.requirement !== 'auto' &&
        item.workflows.some((workflow) => workflow === 'backup.yml' || workflow === 'ci.yml'),
    );

    expect(relevant.length).toBeGreaterThan(0);
    for (const item of relevant) expect(runbook).toContain(item.setup);
    expect(runbook).not.toContain('gh secret set TURSO_API_TOKEN');
    expect(runbook).not.toContain('gh secret set TURSO_DATABASE_NAME');
  });

  it('CWV 専用 credential は台帳・workflow・runbook で同じ 3 Secret を追跡する', () => {
    const registry = JSON.parse(
      readFileSync(path.join(REPO_ROOT, 'scripts/ci/actions-secrets-registry.json'), 'utf8'),
    ) as { entries: RegistryEntry[] };
    const workflow = readFileSync(path.join(REPO_ROOT, '.github/workflows/cwv.yml'), 'utf8');
    const runbook = readFileSync(path.join(REPO_ROOT, 'docs/features/feat-hub-foundation/runbook.md'), 'utf8');
    const names = ['HUB_CWV_PROBE_SECRET', 'HUB_CWV_PROBE_TENANT_ID', 'HUB_CWV_PROBE_WORKSPACE_ID'];

    for (const name of names) {
      const entry = registry.entries.find((item) => item.name === name);
      expect(entry).toMatchObject({ kind: 'secret', requirement: 'required', workflows: ['cwv.yml'] });
      expect(workflow).toContain(`secrets.${name}`);
      expect(runbook).toContain(`gh secret set ${name}`);
    }
    expect(workflow).not.toContain('secrets.AUTH_SESSION_SECRET');
    expect(workflow).not.toContain('secrets.AUTH_ACCESS_TOKEN_SECRET');
  });

  it('Workers deploy token と R2 write token を workflow の役割ごとに分離する', () => {
    const backup = readFileSync(path.join(REPO_ROOT, '.github/workflows/backup.yml'), 'utf8');
    const ci = readFileSync(path.join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');
    const deployStart = ci.indexOf('- name: wrangler deploy');
    const deployEnd = ci.indexOf('- name:', deployStart + 1);
    const smokeStart = ci.indexOf('- name: 本番 DB / R2 スモークテスト');
    const smokeEnd = ci.indexOf('- name:', smokeStart + 1);

    expect(backup).not.toContain('secrets.CLOUDFLARE_API_TOKEN');
    expect(backup).toContain('secrets.CLOUDFLARE_R2_API_TOKEN');
    expect(deployStart).toBeGreaterThan(-1);
    expect(ci.slice(deployStart, deployEnd)).toContain('secrets.CLOUDFLARE_API_TOKEN');
    expect(ci.slice(deployStart, deployEnd)).not.toContain('secrets.CLOUDFLARE_R2_API_TOKEN');
    expect(smokeStart).toBeGreaterThan(-1);
    expect(ci.slice(smokeStart, smokeEnd)).toContain('secrets.CLOUDFLARE_R2_API_TOKEN');
    expect(ci.slice(smokeStart, smokeEnd)).not.toContain('secrets.CLOUDFLARE_API_TOKEN');
  });

  it('backup heartbeat は required で、未投入時に workflow を fail-closed で止める', () => {
    const registry = JSON.parse(
      readFileSync(path.join(REPO_ROOT, 'scripts/ci/actions-secrets-registry.json'), 'utf8'),
    ) as { entries: RegistryEntry[] };
    const backup = readFileSync(path.join(REPO_ROOT, '.github/workflows/backup.yml'), 'utf8');
    const heartbeatEntry = registry.entries.find((item) => item.name === 'BACKUP_HEARTBEAT_URL');
    const preflightStart = backup.indexOf('- name: 前提 secret の存在確認');
    const preflightEnd = backup.indexOf('- uses:', preflightStart);
    const heartbeatStart = backup.indexOf('- name: heartbeat 通知');

    expect(heartbeatEntry).toMatchObject({
      kind: 'secret',
      requirement: 'required',
      workflows: ['backup.yml'],
    });
    expect(preflightStart).toBeGreaterThan(-1);
    expect(backup.slice(preflightStart, preflightEnd)).toContain('[ -n "${{ secrets.BACKUP_HEARTBEAT_URL }}" ]');
    expect(backup.slice(heartbeatStart)).not.toContain('BACKUP_HEARTBEAT_URL 未設定');
    expect(backup.slice(heartbeatStart)).toContain('curl -fsS -m 10 "${{ secrets.BACKUP_HEARTBEAT_URL }}"');
  });

  it('DB 識別子の secret 系統が TURSO_DATABASE_URL の 1 本に統一されている', () => {
    const workflows = execFileSync(
      'grep',
      ['-rho', '-E', 'secrets\\.TURSO_[A-Z_]+', path.join(REPO_ROOT, '.github/workflows')],
      {
        encoding: 'utf8',
      },
    );
    expect(workflows).toContain('secrets.TURSO_DATABASE_URL');
    expect(workflows).not.toContain('secrets.TURSO_DATABASE_NAME');
  });
});
