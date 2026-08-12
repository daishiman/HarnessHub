/**
 * 実ブラウザ検証ハーネスが「opt-in のまま」であることの回帰検査。
 *
 * ハーネスは便利なので、後から既定の `pnpm test` へ混ぜたくなる。しかしそうすると
 * (a) 全開発者の毎回の実行に Chromium 起動が乗り、(b) ブラウザ実体の無い環境で
 * 既定のテストごと落ちる。逆に「専用 script も CI job も無い」状態にすると、
 * 書いたはずのブラウザテストが誰にも実行されないまま緑になる。
 * どちらへ倒れても気付けるよう、分離と起動経路の両方をここで固定する。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const hubRoot = fileURLToPath(new URL('../../', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

const read = (relativePath: string): string => readFileSync(`${hubRoot}${relativePath}`, 'utf8');

/** workflow から指定 job の本体だけを取り出す (コメント行は除去する)。 */
function jobBody(workflow: string, jobName: string): string {
  const lines = workflow.split('\n');
  const start = lines.indexOf(`  ${jobName}:`);
  if (start === -1) {
    throw new Error(`job が見つからない: ${jobName}`);
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^ {2}[a-z0-9-]+:$/.test(line));
  const body = end === -1 ? rest : rest.slice(0, end);
  return body.filter((line) => !/^\s*#/.test(line)).join('\n');
}

describe('実ブラウザ検証ハーネスの opt-in 契約', () => {
  it('既定の vitest 設定が tests/browser を除外する', () => {
    const config = read('vitest.config.ts');

    expect(config).toContain("'tests/browser/**'");
  });

  it('専用の実行設定と script が存在する', () => {
    const browserConfig = read('vitest.browser.config.ts');
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    expect(browserConfig).toContain('tests/browser/**/*.browser.test.ts');
    expect(packageJson.scripts['test:browser']).toBe('vitest run --config vitest.browser.config.ts');
  });

  /**
   * 命名が崩れると、専用設定の include から外れて「置いてあるが実行されない」テストになる。
   * ハーネス本体 (browser-harness.ts) はテストではないので対象外にする。
   */
  it('tests/browser のテストは *.browser.test.* 命名に揃っている', () => {
    const entries = readdirSync(`${hubRoot}tests/browser`);
    const tests = entries.filter((name) => name.includes('.test.'));

    expect(tests.length).toBeGreaterThan(0);
    for (const name of tests) {
      expect(name).toMatch(/\.browser\.test\.tsx?$/);
    }
  });

  it('CI に opt-in 起動経路がある (必須ゲート job には混ぜない)', () => {
    const ci = readFileSync(`${repoRoot}.github/workflows/ci.yml`, 'utf8');
    const uiVisual = readFileSync(`${repoRoot}.github/workflows/ui-visual.yml`, 'utf8');

    expect(uiVisual).toContain('run: pnpm --filter @harness-hub/hub run test:browser');
    // 手動実行かラベル付与でだけ回る。無条件実行にすると必須ゲートの所要時間へ跳ね返る
    expect(uiVisual).toContain("contains(github.event.pull_request.labels.*.name, 'ui-visual')");
    // 必須ゲート job (G2-G9) の中で呼ばれていないこと。
    // コメント行を落としてから見るのは、job の説明文に含まれる語で誤判定しないため
    expect(jobBody(ci, 'test')).not.toContain('test:browser');
    expect(ci).not.toContain('test:browser');
    expect(jobBody(uiVisual, 'browser')).toContain('test:browser');
  });

  it('更新モードは失敗時も manifest と Linux baseline を回収し、検証成功と扱わない', () => {
    const uiVisual = readFileSync(`${repoRoot}.github/workflows/ui-visual.yml`, 'utf8');
    const alwaysUpdateCondition = 'if: ${{ always() && inputs.update_baseline }}';

    for (const stepName of [
      '更新した Linux 版基準画像の manifest',
      '更新した Linux 版基準画像',
      '更新モードは検証ではないことを明示して落とす',
    ]) {
      const stepStart = uiVisual.indexOf(`- name: ${stepName}`);
      expect(stepStart).toBeGreaterThanOrEqual(0);
      expect(uiVisual.slice(stepStart, stepStart + 220)).toContain(alwaysUpdateCondition);
    }

    expect(uiVisual).toContain(
      'git diff --name-only --diff-filter=ACMRTUXB -- apps/hub/tests/browser/__vrt__/linux/',
    );
    expect(uiVisual.match(/apps\/hub\/artifacts\/vrt\/baseline-update-manifest\.txt/g)).toHaveLength(2);
    expect(uiVisual).toContain('name: vrt-baseline-linux');
    expect(uiVisual).toContain('exit 1');
  });
});
