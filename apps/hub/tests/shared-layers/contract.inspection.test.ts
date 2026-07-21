// HF-A4-CONTRACT-003: @harness-hub/inspection を Hub 正式検査 / Publisher ローカル pre-check の 2 系統が
// public API 経由で参照し、同一入力に対する判定が一致すること (挙動同値) を検証

import { createInspectionPipeline, describePipeline, type InspectionTarget, inspect } from '@harness-hub/inspection';
import { describe, expect, it } from 'vitest';
import { createHubInspectionRegistry, runHubInspection } from '../../src/shared/inspection/index.js';
import * as consumerA from '../fixtures/consumer-a/uses-inspection.js';
import { APP_SRC, boundaryBypassImports, CONSUMER_A, deepImports, publicApiImports } from './source-scan.js';

const PACKAGE_NAME = '@harness-hub/inspection';

/** 判定が割れうる入力 (必須項目欠落 + 空ファイル + 秘密情報の植え込み) を使う */
const target: InspectionTarget = {
  files: [
    { path: 'plugin.json', content: '{}' },
    { path: 'empty.md', content: '   ' },
    // 秘密情報は AWS 公式ドキュメントの例示用キー。実在しない
    { path: 'src/config.ts', content: 'const token = "AKIAIOSFODNN7EXAMPLE";' },
  ],
  metadata: {},
};

describe('contract: @harness-hub/inspection', () => {
  it('consumer 系統 1 (apps/hub 本体) が public API 経由で参照している', () => {
    expect(publicApiImports(APP_SRC, PACKAGE_NAME).length).toBeGreaterThan(0);
    expect(deepImports(APP_SRC, PACKAGE_NAME)).toEqual([]);
  });

  it('consumer 系統 2 (consumer-a fixture) が public API 経由で参照している', () => {
    expect(publicApiImports(CONSUMER_A, PACKAGE_NAME).length).toBeGreaterThan(0);
    expect(deepImports(CONSUMER_A, PACKAGE_NAME)).toEqual([]);
  });

  it('相対 path で packages/ を直接参照している箇所が無い', () => {
    expect(boundaryBypassImports(APP_SRC)).toEqual([]);
    expect(boundaryBypassImports(CONSUMER_A)).toEqual([]);
  });

  it('2 系統が同一の実装 (同一オブジェクト) を指している', () => {
    expect(consumerA.boundInspect).toBe(inspect);
    expect(consumerA.boundCreateInspectionPipeline).toBe(createInspectionPipeline);
  });

  // 「両 consumer の出力が一致する」だけでは、両方が同時に空ルールへ退化した故障を検知できない
  // (runInspection([], target) は必ず pass を返すため、空同士でも一致してしまう)。
  // 検査が実際に働いていることを固定するゲートをここに置く。
  // 固定するのは package 側が正準順序として保証している ruleId 並びと location だけで、
  // 文言 (message) は package 側の責務なので固定しない
  it('共有ルールが実際に違反を検出している (空ルールへの退化で緑にならない)', () => {
    const registry = createHubInspectionRegistry();
    registry.register(consumerA.sharedRules);
    const result = runHubInspection(registry, target);

    expect(result.verdict).toBe('fail');
    expect(result.findings.map((finding) => finding.ruleId)).toStrictEqual([
      // stage 順 (static-validation → secret-scan → policy)、同 stage 内は ruleId 順
      'manifest-name-required',
      'no-empty-file',
      'secret-aws-access-key',
      'policy-max-files',
    ]);
    expect(result.evaluatedRuleIds).toHaveLength(consumerA.sharedRules.length);

    const secretFinding = result.findings.find((finding) => finding.ruleId === 'secret-aws-access-key');
    expect(secretFinding?.location).toStrictEqual({ path: 'src/config.ts', line: 1, column: 16 });
    // 検出メッセージに秘密の生値が残らないこと (漏洩経路を検査結果自体が作らない)
    expect(secretFinding?.message).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  it('Hub 正式検査と Publisher ローカル pre-check の判定が一致する', () => {
    // Hub 側: 登録簿経由で pipeline を組み立てて実行する
    const registry = createHubInspectionRegistry();
    registry.register(consumerA.sharedRules);
    const hubResult = runHubInspection(registry, target);

    // Publisher 側: 簡易入口から同じルールで実行する
    const publisherResult = consumerA.preCheck(target);

    expect(hubResult.verdict).toBe(publisherResult.verdict);
    expect(hubResult.findings).toEqual(publisherResult.findings);
    expect(hubResult.evaluatedRuleIds).toEqual(publisherResult.evaluatedRuleIds);
  });

  it('pipeline の構成記述子も一致する (同じルール集合を評価している)', () => {
    const registry = createHubInspectionRegistry();
    registry.register(consumerA.sharedRules);

    expect(describePipeline(registry.buildPipeline())).toEqual(consumerA.describeSharedPipeline());
  });

  it('ルール登録順が判定に影響しない (正準順序が package 側で保証されている)', () => {
    const forward = createHubInspectionRegistry();
    forward.register(consumerA.sharedRules);

    const reversed = createHubInspectionRegistry();
    reversed.register([...consumerA.sharedRules].reverse());

    expect(runHubInspection(forward, target).findings).toEqual(runHubInspection(reversed, target).findings);
  });
});
