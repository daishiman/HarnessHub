/**
 * 公開検査の合成 (I2 の 3 本立て) が実際に 3 本とも走ることの確認。
 *
 * 個別ルールの振る舞いは `package-rules.test.ts` / `secret-scan-preset.test.ts` が持つ。
 * ここが見るのは**束ね方**だけである。この観点のテストが無かったせいで、
 * Hub 側が構造ルールだけを pipeline へ渡し、secret scan が 1 度も走らないまま
 * 142 件のテストが全て緑になっていた。
 */

import { describe, expect, it } from 'vitest';

import { createPackageInspectionRules, PACKAGE_MANIFEST_PATH } from './package-rules';
import { runInspection } from './pipeline';
import { createPublishInspectionRules, PUBLISH_INSPECTION_REQUIRED_STAGES } from './publish-inspection';
import { createDefaultSecretScanRules } from './secret-scan-preset';
import type { InspectionFile } from './types';

/** 検査に通る最小構成。ここへ 1 つだけ問題を混ぜて、どの stage が拾うかを見る。 */
const MANIFEST: InspectionFile = {
  path: PACKAGE_MANIFEST_PATH,
  content: JSON.stringify({
    name: 'demo-skills',
    version: '1.0.0',
    description: 'デモ用の skills package',
    owner: 'acme',
    visibility: 'workspace',
    summary: 'Catalog 表示用の短い説明',
  }),
};

const SKILL: InspectionFile = { path: 'skills/demo/SKILL.md', content: '# demo\n\n手順を書く。\n' };

function inspect(files: readonly InspectionFile[]) {
  return runInspection(createPublishInspectionRules(), { files, metadata: {} });
}

describe('PUBLISH_INSPECTION_REQUIRED_STAGES', () => {
  it('I2 の 3 本立てと 1:1 で並ぶ', () => {
    expect(PUBLISH_INSPECTION_REQUIRED_STAGES).toEqual(['static-validation', 'secret-scan', 'policy']);
  });
});

describe('createPublishInspectionRules — 束ね方', () => {
  it('必須 3 stage のすべてにルールが存在する', () => {
    const stages = new Set(createPublishInspectionRules().map((rule) => rule.stage));

    // 1 stage でも空だと、その観点の検査が「静かに」消える
    for (const stage of PUBLISH_INSPECTION_REQUIRED_STAGES) expect(stages.has(stage)).toBe(true);
  });

  it('構造ルールと secret scan の両方を過不足なく含む', () => {
    const composed = createPublishInspectionRules().map((rule) => rule.id);
    const expected = [
      ...createPackageInspectionRules().map((rule) => rule.id),
      ...createDefaultSecretScanRules().map((rule) => rule.id),
    ];

    expect([...composed].sort()).toEqual([...expected].sort());
  });

  it('ID が重複しない (pipeline は重複を例外で弾くため、合成の時点で成立していること)', () => {
    const ids = createPublishInspectionRules().map((rule) => rule.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('呼ぶたびに新しい配列を返す (pipeline による凍結を持ち越さない)', () => {
    const first = createPublishInspectionRules();
    const second = createPublishInspectionRules();

    expect(first).not.toBe(second);
    expect(first.map((rule) => rule.id)).toEqual(second.map((rule) => rule.id));
  });
});

describe('createPublishInspectionRules — 実際に走らせる', () => {
  it('問題の無い package は pass する', () => {
    const result = inspect([MANIFEST, SKILL]);

    expect(result.verdict).toBe('pass');
    expect(result.findings).toEqual([]);
  });

  it('評価済みルール ID に secret scan が必ず現れる (走っていることの証跡)', () => {
    const result = inspect([MANIFEST, SKILL]);
    const secretRuleIds = createDefaultSecretScanRules().map((rule) => rule.id);

    // findings が 0 件でも「評価した」ことは残る。ここが空だと未結線を検出できない
    for (const id of secretRuleIds) expect(result.evaluatedRuleIds).toContain(id);
  });

  it('埋め込まれた資格情報を fail として拾う — 構造だけの束では素通りしていた経路', () => {
    // 行末のマーカーは **この source 行** を G6 (monorepo 全体の secret scan) から外すためのもの。
    // fixture 文字列の中にはマーカーが無いので、検査対象としては通常どおり検出される。
    // 公式サンプル値 (KNOWN_PUBLIC_EXAMPLE_SECRETS) を使うと値単位で抑制されて検出されない
    const leaked: InspectionFile = {
      path: 'skills/demo/SKILL.md',
      content: '# demo\n\nAWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF\n', // secret-scan:allow
    };

    const composed = inspect([MANIFEST, leaked]);
    const structureOnly = runInspection(createPackageInspectionRules(), {
      files: [MANIFEST, leaked],
      metadata: {},
    });

    expect(composed.findings.some((finding) => finding.stage === 'secret-scan')).toBe(true);
    // 対照: 構造ルールだけだと同じ入力が pass する = これが実際に起きていた欠落
    expect(structureOnly.findings.some((finding) => finding.stage === 'secret-scan')).toBe(false);
  });

  it('構造の問題と資格情報の問題を同時に報告する (どちらか一方で打ち切らない)', () => {
    const brokenManifest: InspectionFile = {
      path: PACKAGE_MANIFEST_PATH,
      content: JSON.stringify({ name: 'demo-skills', version: 'not-semver', owner: 'acme' }),
    };
    const leaked: InspectionFile = {
      path: 'skills/demo/SKILL.md',
      content: '# demo\n\ngithub_token = "ghp_0123456789abcdefghijklmnopqrstuvwxyz"\n', // secret-scan:allow
    };

    const result = inspect([brokenManifest, leaked]);
    const stages = new Set(result.findings.map((finding) => finding.stage));

    expect(result.verdict).toBe('fail');
    expect(stages.has('static-validation')).toBe(true);
    expect(stages.has('secret-scan')).toBe(true);
  });
});
