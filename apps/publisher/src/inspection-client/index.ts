/**
 * packages/inspection の consumer wrapper (AD-3)。
 *
 * Hub 側 (apps/hub/src/lib/publish/package-inspection.ts) と全く同じ `createPublishInspectionRules`
 * を呼ぶだけに徹する。static validation / secret scan / policy の 3 本立てをここで束ね直さない —
 * 束ね方を 2 箇所に置くと、片方だけ secret scan を結線し忘れる事故が起こりうる
 * (createPublishInspectionRules 冒頭コメント参照)。同一 fixture に対し Hub と Publisher が
 * 同じ verdict を返すことは、この 1 行の呼び出しが同一である以上の意味を持たない。
 */
import {
  createPublishInspectionRules,
  type InspectionFile,
  type InspectionResult,
  runInspection,
} from '@harness-hub/inspection';

export function runLocalPreCheck(files: readonly InspectionFile[]): InspectionResult {
  return runInspection(createPublishInspectionRules(), { files, metadata: {} });
}
