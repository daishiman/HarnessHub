/**
 * 公開検査のルール合成 (qa-006 / I2 / quality_constraint green-auto-publish-yellow-red-needs-fix-i2)。
 *
 * I2 は公開時検査を「static validation・secret scan・policy 判定」の 3 本立てと定めている。
 * この 3 本を **1 箇所で束ねる**のが本 module の唯一の仕事である。
 *
 * 束ねる場所を作った理由は、束ねる場所が無かったから起きた事故にある。
 * Hub 側は当初 `createPackageInspectionRules()` (= static validation + policy) だけを
 * pipeline へ渡しており、secret scan が **1 度も走っていなかった**。
 * どのテストも落ちなかった — 「結線されているか」を誰も assert していなかったためである。
 * ルール個別のテストは「書いた振る舞い」を守るが「書き忘れた合成」は守らない。
 *
 * したがってここでは合成そのものを値として公開し、
 * `apps/hub/scripts/check-publish-inspection-gate.mjs` が静的に検査できる形にしてある。
 * Publisher (feat-publisher-plugin) のローカル pre-check も同じ関数を呼ぶこと。
 * 別々に束ねると qa-010/qa-020 の「二重実装しない」が合成の層で破れる。
 */

import { createPackageInspectionRules } from './package-rules';
import { createDefaultSecretScanRules } from './secret-scan-preset';
import type { InspectionRule, InspectionStage } from './types';

/**
 * 公開検査が必ず含む stage。I2 の 3 本立てと 1:1。
 *
 * `INSPECTION_STAGES` (全 stage の宣言) と別に持つのは、
 * 「pipeline が扱える stage」と「公開検査が**必ず**動かす stage」が別の概念だから。
 * 前者が増えても本 feature の受入条件は変わらないが、後者が減ったら受入条件が壊れる。
 */
export const PUBLISH_INSPECTION_REQUIRED_STAGES: readonly InspectionStage[] = [
  'static-validation',
  'secret-scan',
  'policy',
];

/**
 * Hub 正式検査と Publisher ローカル pre-check が共有する唯一のルール束。
 *
 * 順序に意味がある。static validation と policy (構造ルール) を先に置くのは、
 * パッケージの形が壊れている場合の findings を先頭に出したいためで、
 * 判定 (verdict) 自体は `resolveVerdict` が severity で決めるため順序に依存しない。
 */
export function createPublishInspectionRules(): readonly InspectionRule[] {
  return [...createPackageInspectionRules(), ...createDefaultSecretScanRules()];
}
