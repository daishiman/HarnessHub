import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InspectionResult, InspectionVerdict } from '@harness-hub/inspection';
import { publishVerdictSchema } from '@harness-hub/schemas';
import { describe, expect, it } from 'vitest';

import {
  blocksPublish,
  FALLBACK_PUBLISH_VERDICT,
  inspectionEventFor,
  PUBLISH_VERDICTS,
  summarizeInspection,
  toPublishVerdict,
} from '@/lib/publish/verdict';

const INSPECTION_VERDICTS: readonly InspectionVerdict[] = ['pass', 'warn', 'fail'];

describe('検査語彙 → 公開語彙 (T3-A)', () => {
  it('3 対 3 の写像である (全射かつ単射)', () => {
    const mapped = INSPECTION_VERDICTS.map(toPublishVerdict);

    expect(mapped).toEqual(['green', 'yellow', 'red']);
    // 単射: 3 入力が 3 個の異なる値へ落ちる
    expect(new Set(mapped).size).toBe(3);
    // 全射: 公開語彙の全値が現れる
    expect([...mapped].sort()).toEqual([...PUBLISH_VERDICTS].sort());
  });

  it('公開語彙の値域は zod の enum から導出される', () => {
    expect(PUBLISH_VERDICTS).toEqual(publishVerdictSchema.options);
  });

  it('公開判定 → 状態機械イベントも 3 対 3 である', () => {
    const events = PUBLISH_VERDICTS.map(inspectionEventFor);

    expect(events).toEqual(['inspection_green', 'inspection_yellow', 'inspection_red']);
    expect(new Set(events).size).toBe(3);
  });
});

describe('検査結果の畳み込み', () => {
  function resultOf(verdict: InspectionVerdict, findings: InspectionResult['findings'] = []): InspectionResult {
    return { verdict, findings, evaluatedRuleIds: [] };
  }

  it('location が無い finding は path / line を null で埋める', () => {
    // 応答契約 (publishFindingSchema) が「キーが存在し値が null」を要求する。
    // optional のままだと zod が落ち、検査結果そのものが応答から消える
    const summary = summarizeInspection(
      resultOf('fail', [{ ruleId: 'R1', stage: 'policy', severity: 'error', message: 'だめ' }]),
    );

    expect(summary.findings).toEqual([
      { rule_id: 'R1', stage: 'policy', severity: 'error', message: 'だめ', path: null, line: null },
    ]);
  });

  it('location がある finding は path / line を引き写す', () => {
    const summary = summarizeInspection(
      resultOf('warn', [
        { ruleId: 'R2', stage: 'secret-scan', severity: 'warn', message: '注意', location: { path: 'a.md', line: 3 } },
      ]),
    );

    expect(summary.findings[0]).toMatchObject({ path: 'a.md', line: 3 });
  });

  it('path はあるが line が無い場合も欠けたキーを作らない', () => {
    const summary = summarizeInspection(
      resultOf('warn', [
        { ruleId: 'R3', stage: 'policy', severity: 'warn', message: '注意', location: { path: 'a.md' } },
      ]),
    );

    expect(summary.findings[0]).toMatchObject({ path: 'a.md', line: null });
  });

  it('verdict は写像表どおりに変換される', () => {
    expect(summarizeInspection(resultOf('pass')).verdict).toBe('green');
    expect(summarizeInspection(resultOf('warn')).verdict).toBe('yellow');
    expect(summarizeInspection(resultOf('fail')).verdict).toBe('red');
  });
});

describe('写像の一意性 (T3-B)', () => {
  it("verdict.ts 以外の publish 実装に 'green' / 'yellow' / 'red' のリテラルが無い", () => {
    // 写像が 2 箇所にあると片方だけ直る。構造で禁じる以外に守る手が無いので
    // ソースを走査して固定する。走査範囲を本 feature の実装面に限るのは、
    // 無関係な UI が色名として 'green' を使ったときに巻き添えで落ちないようにするため
    const srcRoot = fileURLToPath(new URL('../../src', import.meta.url));
    const owner = join(srcRoot, 'lib', 'publish', 'verdict.ts');
    const roots = [join(srcRoot, 'lib', 'publish'), join(srcRoot, 'app', 'api', 'v1')];
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!path.endsWith('.ts') && !path.endsWith('.tsx')) continue;
        if (path === owner) continue;
        if (/'(?:green|yellow|red)'/.test(readFileSync(path, 'utf8'))) offenders.push(path.slice(srcRoot.length + 1));
      }
    };
    for (const root of roots) walk(root);

    expect(offenders).toEqual([]);
  });

  it('安全側の既定は red である', () => {
    // 判断材料が欠けたときに通す側へ倒すと、検査を経ていない物が公開される経路ができる
    expect(FALLBACK_PUBLISH_VERDICT).toBe(toPublishVerdict('fail'));
  });

  it('公開を止めるのは red だけ (yellow は保管したうえで差し戻す)', () => {
    expect(PUBLISH_VERDICTS.filter(blocksPublish)).toEqual([FALLBACK_PUBLISH_VERDICT]);
  });
});
