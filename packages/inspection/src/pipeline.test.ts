// pipeline の決定性 (同一入力→同一判定) と骨格挙動の単体テスト。

import { describe, expect, it } from 'vitest';

import { createInspectionPipeline, describePipeline, inspect, runInspection, withRules } from './pipeline';
import { definePolicyRule, defineSecretScanRule, defineStaticValidationRule } from './rules';
import type { InspectionRule, InspectionTarget } from './types';
import { INSPECTION_STAGES, InspectionRuleError } from './types';

const target: InspectionTarget = {
  files: [
    { path: 'b.txt', content: 'token=AAAA1111\nplain' },
    { path: 'a.txt', content: 'token=BBBB2222' },
  ],
  metadata: { name: 'sample-plugin' },
};

const secretRule = defineSecretScanRule({
  id: 'secret/token',
  pattern: /[A-Z]{4}\d{4}/g,
});

const staticRule = defineStaticValidationRule({
  id: 'static/requires-name',
  evaluate: (input) => (typeof input.metadata['name'] === 'string' ? [] : [{ message: 'name が必要です' }]),
});

const policyRule = definePolicyRule({
  id: 'policy/file-count',
  severity: 'warn',
  evaluate: (input) => (input.files.length > 1 ? [{ message: 'ファイルが 2 件以上あります' }] : []),
});

const allRules: readonly InspectionRule[] = [secretRule, staticRule, policyRule];

describe('決定性', () => {
  it('同一入力を 2 回検査しても完全に同一の結果を返す', () => {
    const pipeline = createInspectionPipeline(allRules);
    expect(inspect(pipeline, target)).toStrictEqual(inspect(pipeline, target));
  });

  it('ルールの登録順が違っても結果は変わらない', () => {
    const forward = inspect(createInspectionPipeline(allRules), target);
    const reversed = inspect(createInspectionPipeline([...allRules].reverse()), target);
    expect(reversed).toStrictEqual(forward);
  });

  it('同一 pipeline を使い回しても secret scan の検出数が変わらない (RegExp lastIndex の持ち越しなし)', () => {
    const pipeline = createInspectionPipeline([secretRule]);
    const first = inspect(pipeline, target).findings.length;
    const second = inspect(pipeline, target).findings.length;
    expect(first).toBe(2);
    expect(second).toBe(first);
  });

  it('findings は stage → ruleId → path → line の正準順序に整列される', () => {
    const result = inspect(createInspectionPipeline(allRules), target);
    expect(result.findings.map((finding) => [finding.stage, finding.location?.path])).toStrictEqual([
      ['secret-scan', 'a.txt'],
      ['secret-scan', 'b.txt'],
      ['policy', undefined],
    ]);
  });
});

describe('pipeline 骨格', () => {
  it('ID 重複を構築時に弾く', () => {
    expect(() => createInspectionPipeline([secretRule, secretRule])).toThrow(InspectionRuleError);
  });

  it('withRules は元の pipeline を変更せず新しい pipeline を返す', () => {
    const base = createInspectionPipeline([staticRule]);
    const extended = withRules(base, [policyRule]);
    expect(base.rules).toHaveLength(1);
    expect(extended.rules).toHaveLength(2);
  });

  it('describePipeline が stage 別のルール ID を返す', () => {
    const descriptor = describePipeline(createInspectionPipeline(allRules));
    expect(descriptor.ruleIds).toStrictEqual(['static/requires-name', 'secret/token', 'policy/file-count']);
    expect(descriptor.stages['policy']).toStrictEqual(['policy/file-count']);
    expect(Object.keys(descriptor.stages)).toStrictEqual([...INSPECTION_STAGES]);
  });

  it('ルールが例外を投げても判定は fail へ封じ込められる', () => {
    const broken = defineStaticValidationRule({
      id: 'static/broken',
      evaluate: () => {
        throw new Error('意図的な失敗');
      },
    });
    const result = runInspection([broken], target);
    expect(result.verdict).toBe('fail');
    expect(result.findings[0]?.message).toContain('意図的な失敗');
  });

  it('runInspection は evaluatedRuleIds を返し、指摘なしなら pass になる', () => {
    const result = runInspection([staticRule], target);
    expect(result.verdict).toBe('pass');
    expect(result.findings).toStrictEqual([]);
    expect(result.evaluatedRuleIds).toStrictEqual(['static/requires-name']);
  });

  it('warn のみなら verdict は warn になる', () => {
    expect(runInspection([policyRule], target).verdict).toBe('warn');
  });
});
