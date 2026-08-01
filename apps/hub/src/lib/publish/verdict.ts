/**
 * 検査 pipeline の語彙 (`pass | warn | fail`) と公開判定の語彙 (`green | yellow | red`) の**唯一の写像点**
 * (ADR AD-4 / test-design.md T3)。
 *
 * 語彙が 2 つあるのは翻訳漏れではなく責務の違いによる。`packages/inspection` は
 * 「ルールに違反したか」までしか知らず、「公開してよいか」は Hub の業務判断である。
 * 同じ語を共有すると、検査 package の側が公開可否まで決めているように読めてしまう。
 *
 * **この module 以外に `green` / `yellow` / `red` のリテラルを書かない**。
 * 書くと写像が 2 箇所になり、片方だけ直る事故が起きる。構造テスト (T3-B) がこれを固定する。
 */

import type { InspectionResult, InspectionVerdict } from '@harness-hub/inspection';
import { type PublishFinding, type PublishVerdict, publishVerdictSchema } from '@harness-hub/schemas';

import type { PublishRequestEvent } from './state-machine.js';

/** 検査語彙 → 公開語彙。全射かつ単射 (3 対 3) であることを T3-A が固定する。 */
const PUBLISH_VERDICT_BY_INSPECTION: Readonly<Record<InspectionVerdict, PublishVerdict>> = {
  pass: 'green',
  warn: 'yellow',
  fail: 'red',
};

/**
 * 公開判定 → 状態機械イベント。
 *
 * MVP では Yellow と Red の**遷移先**が同じ (どちらも needs_fix) だが、
 * イベントは分けたまま持つ。統合すると監査ログと状態遷移から
 * 「警告で止まったのか、違反で止まったのか」が消える。
 * 遷移先を同じにするのは状態機械側 (制約 i2) の判断で、ここは事実を落とさない。
 */
const EVENT_BY_PUBLISH_VERDICT: Readonly<Record<PublishVerdict, PublishRequestEvent>> = {
  green: 'inspection_green',
  yellow: 'inspection_yellow',
  red: 'inspection_red',
};

/** 検査結果 → 公開判定。 */
export function toPublishVerdict(verdict: InspectionVerdict): PublishVerdict {
  return PUBLISH_VERDICT_BY_INSPECTION[verdict];
}

/** 公開判定 → 状態機械へ流すイベント。 */
export function inspectionEventFor(verdict: PublishVerdict): PublishRequestEvent {
  return EVENT_BY_PUBLISH_VERDICT[verdict];
}

/**
 * 検査結果を公開判定と finding 一覧へ畳む。
 *
 * `findings` の `path` / `line` を null 埋めしているのは、応答契約
 * (`publishFindingSchema`) が「キーが存在し値が null」を要求するため。
 * optional のまま返すと zod が落ちる — 落ちた場合に検査結果そのものが応答から消えるので、
 * 変換はここで済ませておく。
 */
export function summarizeInspection(result: InspectionResult): {
  readonly verdict: PublishVerdict;
  readonly findings: readonly PublishFinding[];
} {
  return {
    verdict: toPublishVerdict(result.verdict),
    findings: result.findings.map((finding) => ({
      rule_id: finding.ruleId,
      stage: finding.stage,
      severity: finding.severity,
      message: finding.message,
      path: finding.location?.path ?? null,
      line: finding.location?.line ?? null,
    })),
  };
}

/** 公開判定の値域。zod の enum から導出する (配列を書き写さない)。 */
export const PUBLISH_VERDICTS: readonly PublishVerdict[] = publishVerdictSchema.options;

/**
 * 判断材料が欠けたときに倒す先。
 *
 * 「本体はあるのに検査結果が無い」のような起こりえない組合せは、**通すのではなく止める**。
 * 通す側へ倒すと、検査を経ていないパッケージが公開される経路が 1 本できる。
 */
export const FALLBACK_PUBLISH_VERDICT: PublishVerdict = 'red';

/**
 * この判定で公開を止めるか。
 *
 * MVP では Red だけが保管そのものを拒む (Yellow は保管したうえで needs_fix へ差し戻す)。
 * この境目を呼び出し側に書かせないのは、判定語リテラルを本 module の外へ出さないため。
 */
export function blocksPublish(verdict: PublishVerdict): boolean {
  return verdict === FALLBACK_PUBLISH_VERDICT;
}

/** 現行 policy で公開可能か。MVP は Green だけを許可し、Yellow / Red は止める。 */
export function allowsPublish(verdict: PublishVerdict): boolean {
  return verdict === PUBLISH_VERDICT_BY_INSPECTION.pass;
}
