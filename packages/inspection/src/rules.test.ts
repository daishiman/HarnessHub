// ルール生成ヘルパ (拡張点) の単体テスト。

import { describe, expect, it } from 'vitest';

import { definePolicyRule, defineSecretScanRule, defineStaticValidationRule, maskSecret } from './rules';
import { InspectionRuleError } from './types';
import type { InspectionTarget } from './types';

const target: InspectionTarget = {
  files: [{ path: 'app.ts', content: 'const k = "sk-LIVE-1234";' }],
  metadata: {},
};

describe('defineStaticValidationRule / definePolicyRule', () => {
  it('stage と既定 severity を設定する', () => {
    const rule = defineStaticValidationRule({ id: 'static/x', evaluate: () => [] });
    expect(rule.stage).toBe('static-validation');
    expect(rule.severity).toBe('error');
  });

  it('severity を明示できる', () => {
    const rule = definePolicyRule({ id: 'policy/x', severity: 'info', evaluate: () => [] });
    expect(rule.stage).toBe('policy');
    expect(rule.severity).toBe('info');
  });

  it('空 ID / 前後空白の ID を拒否する', () => {
    expect(() => defineStaticValidationRule({ id: '   ', evaluate: () => [] })).toThrow(
      InspectionRuleError,
    );
    expect(() => definePolicyRule({ id: 'policy/x ', evaluate: () => [] })).toThrow(
      InspectionRuleError,
    );
  });
});

describe('defineSecretScanRule', () => {
  it('検出位置を 1 始まりの line / column で返す', () => {
    const rule = defineSecretScanRule({ id: 'secret/sk', pattern: /sk-LIVE-\d+/ });
    const findings = rule.evaluate(target);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.location).toStrictEqual({ path: 'app.ts', line: 1, column: 12 });
  });

  it('検出値そのものを message に残さない (マスクする)', () => {
    const rule = defineSecretScanRule({ id: 'secret/sk', pattern: /sk-LIVE-\d+/ });
    const message = rule.evaluate(target)[0]?.message ?? '';
    expect(message).not.toContain('sk-LIVE-1234');
    expect(message).toContain('sk***(len=12)');
  });

  it('g フラグ付きの RegExp を渡しても評価ごとに結果が変わらない', () => {
    const pattern = /sk-LIVE-\d+/g;
    const rule = defineSecretScanRule({ id: 'secret/sk', pattern });
    expect(rule.evaluate(target)).toStrictEqual(rule.evaluate(target));
  });

  it('幅 0 一致のパターンでも無限ループしない', () => {
    const rule = defineSecretScanRule({ id: 'secret/empty', pattern: /(?:)/g });
    expect(rule.evaluate(target).length).toBeGreaterThan(0);
  });

  it('message の組み立てを差し替えられる', () => {
    const rule = defineSecretScanRule({
      id: 'secret/sk',
      pattern: /sk-LIVE-\d+/,
      message: (masked) => `禁止: ${masked}`,
    });
    expect(rule.evaluate(target)[0]?.message).toContain('禁止: sk***');
  });
});

describe('maskSecret', () => {
  it('先頭 2 文字と長さのみを残す', () => {
    expect(maskSecret('abcdef')).toBe('ab***(len=6)');
    expect(maskSecret('')).toBe('***(len=0)');
  });
});
