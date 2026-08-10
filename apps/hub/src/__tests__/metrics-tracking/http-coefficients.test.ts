/**
 * MT-HTTP-* / MT-COEF-*: HTTP 境界ヘルパーと係数解決の単体契約。
 *
 * route 経由では踏みにくい失敗系 (壊れた JSON・長すぎる冪等キー・不正な環境変数) を直接叩く。
 * どれも「落とし方」に意味がある経路で、静かに既定値へ倒れると
 * 二重計上や桁違いの金額が確定してしまうため、境界値をここで固定する。
 */
import { metricsEventIngestRequestSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STANDARD_ANNUAL_SALARY_JPY,
  readStandardAnnualSalary,
  resolveMetricsCoefficients,
} from '../../features/metrics-tracking/coefficients.js';
import { IDEMPOTENCY_KEY_HEADER, parseJsonRequest, readIdempotencyKey } from '../../features/metrics-tracking/http.js';

const URL_BASE = 'https://hub.example.com/api/v1/metrics/events';

function requestWith(headers: Record<string, string>, body?: string): Request {
  return new Request(URL_BASE, { method: 'POST', headers, ...(body === undefined ? {} : { body }) });
}

describe('MT-HTTP: 境界ヘルパー', () => {
  it('MT-HTTP-001: 壊れた JSON は 400 の problem+json になる', async () => {
    const outcome = await parseJsonRequest(
      requestWith({ 'content-type': 'application/json' }, '{ぶっ壊れ'),
      // schema には到達しない。parse 前に落ちることを確かめる
      metricsEventIngestRequestSchema,
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error('前提: 失敗するはず');
    expect(outcome.response.status).toBe(400);
    expect(outcome.response.headers.get('content-type')).toContain('application/problem+json');
  });

  it('MT-HTTP-002: 冪等キーは前後の空白を落として受理する', () => {
    const outcome = readIdempotencyKey(requestWith({ [IDEMPOTENCY_KEY_HEADER]: '  key-1  ' }));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error('前提: 成功するはず');
    expect(outcome.data).toBe('key-1');
  });

  it('MT-HTTP-003: 空白だけ・長すぎる冪等キーは 400 で拒否する', () => {
    const blank = readIdempotencyKey(requestWith({ [IDEMPOTENCY_KEY_HEADER]: '   ' }));
    const tooLong = readIdempotencyKey(requestWith({ [IDEMPOTENCY_KEY_HEADER]: 'x'.repeat(201) }));

    expect(blank.ok).toBe(false);
    expect(tooLong.ok).toBe(false);
    if (tooLong.ok) throw new Error('前提: 失敗するはず');
    expect(tooLong.response.status).toBe(400);
  });

  it('MT-HTTP-004: 上限ちょうどの冪等キーは受理する (境界を 1 文字ずらしていないこと)', () => {
    expect(readIdempotencyKey(requestWith({ [IDEMPOTENCY_KEY_HEADER]: 'x'.repeat(200) })).ok).toBe(true);
  });
});

describe('MT-COEF: 係数の解決', () => {
  const ROW = { annualHours: 2000, minutesPerRun: 15, sheetReductionRate: 0.35 };

  it('MT-COEF-001: 環境変数が未設定なら既定の標準年収を使う', () => {
    expect(readStandardAnnualSalary({})).toBe(DEFAULT_STANDARD_ANNUAL_SALARY_JPY);
    expect(readStandardAnnualSalary({ METRICS_STANDARD_ANNUAL_SALARY_JPY: '   ' })).toBe(
      DEFAULT_STANDARD_ANNUAL_SALARY_JPY,
    );
  });

  it('MT-COEF-002: 妥当な環境変数は上書きとして採用する', () => {
    expect(readStandardAnnualSalary({ METRICS_STANDARD_ANNUAL_SALARY_JPY: '8000000' })).toBe(8_000_000);
  });

  it('MT-COEF-003: 桁違い・非数値は既定値へ倒す (cron 全体を止めない)', () => {
    for (const raw of ['0', '-1', '100000001', 'たくさん', 'NaN']) {
      expect(readStandardAnnualSalary({ METRICS_STANDARD_ANNUAL_SALARY_JPY: raw })).toBe(
        DEFAULT_STANDARD_ANNUAL_SALARY_JPY,
      );
    }
  });

  it('MT-COEF-004: 時給は「標準年収 ÷ 年間労働時間」として組み立てる (個人年収を使わない / SEC4)', () => {
    const coefficients = resolveMetricsCoefficients(ROW, 6_000_000);

    expect(coefficients).toEqual({
      minutesPerRun: 15,
      reductionRate: 0.35,
      hourlyRate: { kind: 'from-salary', annualSalary: 6_000_000, annualHours: 2000 },
    });
  });
});
