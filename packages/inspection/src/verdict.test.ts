// verdict 集約規則の単体テスト。

import { describe, expect, it } from 'vitest';
import type { Finding, FindingSeverity } from './types';
import { mergeVerdicts, resolveVerdict, severityRank, verdictRank } from './verdict';

function finding(severity: FindingSeverity): Finding {
  return { ruleId: 'r', stage: 'policy', severity, message: 'm' };
}

describe('resolveVerdict', () => {
  it('findings が空なら pass', () => {
    expect(resolveVerdict([])).toBe('pass');
  });

  it('info のみなら pass', () => {
    expect(resolveVerdict([finding('info')])).toBe('pass');
  });

  it('warn を含めば warn', () => {
    expect(resolveVerdict([finding('info'), finding('warn')])).toBe('warn');
  });

  it('error が 1 件でもあれば fail', () => {
    expect(resolveVerdict([finding('warn'), finding('error'), finding('info')])).toBe('fail');
  });
});

describe('mergeVerdicts', () => {
  it('空なら pass、最も重い verdict を返す', () => {
    expect(mergeVerdicts([])).toBe('pass');
    expect(mergeVerdicts(['pass', 'warn'])).toBe('warn');
    expect(mergeVerdicts(['fail', 'warn', 'pass'])).toBe('fail');
  });
});

describe('rank', () => {
  it('severity / verdict の順序が info < warn < error, pass < warn < fail', () => {
    expect(severityRank('info')).toBeLessThan(severityRank('warn'));
    expect(severityRank('warn')).toBeLessThan(severityRank('error'));
    expect(verdictRank('pass')).toBeLessThan(verdictRank('warn'));
    expect(verdictRank('warn')).toBeLessThan(verdictRank('fail'));
  });
});
