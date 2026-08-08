// 配信版一致ゲート (ci.yml の version_gate) の「文言」ではなく「挙動」を検査する。
//
// production-auth-gates.test.ts は workflow の記述内容 (step の順序・必要な式が書かれているか) を見る。
// それだけだと、条件式を書き間違えて実際には常に通過するようになっても緑のままになる。
// ここでは ci.yml から run 本文をそのまま抜き出し、偽の curl を PATH 先頭に置いて bash で実行し、
// 「一致しない状況で本当に exit 1 になるか」を exit code で確かめる。
//
// 由来: 2026-08-07 の run 31221676748。/health が 1.3 秒後に新版へ切替わってゲートは通ったのに、
// 続く hearing smoke は修正前のコード (tenant_mismatch=403) を叩いて落ちた。Cloudflare は colo ごとに
// 切替時刻が違うため、単発の一致では「全拠点で入れ替わった」ことにならない。

import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const WORKFLOW = readFileSync(path.join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');
const DEPLOYED_VERSION = 'new-af5778f5';
const OLD_VERSION = 'old-2e4a6c5b';

/** ci.yml の version_gate step から `run:` 本文だけを取り出し、実行可能な bash script にする */
function extractVersionGateScript(): string {
  const start = WORKFLOW.indexOf('- name: 配信版が今デプロイした版であることの検査');
  // 直後の step (鮮度検査) の手前で切る。OIDC smoke まで広げると、間に挟まった step の YAML が
  // bash script の末尾へ紛れ込み、抽出した本文が version_gate 単体でなくなる
  const end = WORKFLOW.indexOf('- name: 稼働ビルドの鮮度検査');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  const block = WORKFLOW.slice(start, end);
  const marker = '        run: |\n';
  const body = block.slice(block.indexOf(marker) + marker.length);
  const dedented = body
    .split('\n')
    .map((line) => (line.startsWith(' '.repeat(10)) ? line.slice(10) : line))
    .join('\n');

  // 診断出力の wrangler は CI 環境にしか無い。判定には使われていないので実行だけ差し替える
  return `#!/usr/bin/env bash\n${dedented.replaceAll('pnpm --filter @harness-hub/hub exec wrangler', 'echo skipped-wrangler')}`;
}

/**
 * 偽の curl。`SWITCH_AT` 回目以降は新版を返し、`FLAP_EVERY` 回に 1 回だけ旧版へ戻る
 * (= colo ごとに切替時刻が違い、当たる拠点によって新旧が混ざる状況の再現)。
 */
const FAKE_CURL = `#!/usr/bin/env bash
hdr=""
prev=""
for a in "$@"; do
  if [ "$prev" = "-D" ]; then hdr="$a"; fi
  prev="$a"
done
n=$(cat "$COUNTER" 2>/dev/null || echo 0); n=$((n+1)); echo "$n" > "$COUNTER"
[ -n "$hdr" ] && printf 'HTTP/2 200\\r\\ncf-ray: ray%03d-NRT\\r\\n\\r\\n' "$n" > "$hdr"
if [ "$n" -ge "\${SWITCH_AT:-1}" ]; then v="${DEPLOYED_VERSION}"; else v="${OLD_VERSION}"; fi
if [ -n "\${FLAP_EVERY:-}" ] && [ $(( n % FLAP_EVERY )) -eq 0 ]; then v="${OLD_VERSION}"; fi
printf '{"status":"ok","version":"%s"}' "$v"
`;

let workDir: string;
let scriptPath: string;

function runGate(env: Record<string, string>): { code: number; stdout: string } {
  const counter = path.join(workDir, `counter-${Math.abs(hashOf(JSON.stringify(env)))}`);
  writeFileSync(counter, '0');
  try {
    const stdout = execFileSync('bash', [scriptPath], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${path.join(workDir, 'bin')}:${process.env.PATH ?? ''}`,
        COUNTER: counter,
        HEALTH_URL: 'http://version-gate.invalid/health',
        DEPLOYED_VERSION,
        VERSION_GATE_INTERVAL_SECONDS: '0',
        VERSION_GATE_TIMEOUT_SECONDS: '3',
        ...env,
      },
    });
    return { code: 0, stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string };
    return { code: failure.status ?? -1, stdout: failure.stdout ?? '' };
  }
}

function hashOf(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return hash;
}

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), 'version-gate-'));
  const binDir = path.join(workDir, 'bin');
  execFileSync('mkdir', ['-p', binDir]);

  scriptPath = path.join(workDir, 'version-gate.sh');
  writeFileSync(scriptPath, extractVersionGateScript());
  chmodSync(scriptPath, 0o755);

  const curlPath = path.join(binDir, 'curl');
  writeFileSync(curlPath, FAKE_CURL);
  chmodSync(curlPath, 0o755);
});

describe('配信版一致ゲートの実挙動 (ci.yml の run 本文を bash で実行して検査)', () => {
  it('最初から一致していれば通過する', () => {
    const { code, stdout } = runGate({ SWITCH_AT: '1' });
    expect(code).toBe(0);
    expect(stdout).toContain('streak=3/3');
  });

  it('伝播が遅れても、一定時間内に連続一致すれば通過する', () => {
    const { code, stdout } = runGate({ SWITCH_AT: '4' });
    expect(code).toBe(0);
    // 切替前の観測で streak が 0 に戻っていること = 通算回数で代用していない
    expect(stdout).toContain(`served=${OLD_VERSION} streak=0/3`);
  });

  // 旧実装 (単発一致で通過) はこの状況を通していた。ここが今回塞いだ窓そのもの
  it('新旧が混ざる状況では通過させない (単発の一致で smoke へ進まない)', () => {
    const { code } = runGate({ SWITCH_AT: '1', FLAP_EVERY: '3' });
    expect(code).toBe(1);
  });

  it('配信版が入れ替わらないまま期限切れになったら失敗する (fail-open にしない)', () => {
    const { code, stdout } = runGate({ SWITCH_AT: '9999' });
    expect(code).toBe(1);
    expect(stdout).toContain('回連続で一致しなかった');
  });

  it('観測した colo を記録し、後から何拠点を見て通したか検証できる', () => {
    const { stdout } = runGate({ SWITCH_AT: '1' });
    expect(stdout).toContain('colo=NRT');
    expect(stdout).toContain('colos=');
  });
});
