// 検査 pipeline の公開型。検査対象・findings・判定 verdict の語彙をここに一元化する。

/** 検査の 3 系統。配列順がそのまま pipeline の実行順・findings の整列順になる。 */
export type InspectionStage = 'static-validation' | 'secret-scan' | 'policy';

/** stage の正準順序 (docs/shared-layers.md §2「static validation / secret scan / policy 判定」の順)。 */
export const INSPECTION_STAGES: readonly InspectionStage[] = ['static-validation', 'secret-scan', 'policy'] as const;

/** finding 1 件の重大度。verdict への畳み込みは resolveVerdict が行う。 */
export type FindingSeverity = 'info' | 'warn' | 'error';

/** 検査全体の判定。error が 1 件でもあれば fail、warn があれば warn、それ以外は pass。 */
export type InspectionVerdict = 'pass' | 'warn' | 'fail';

/** 検査対象のファイル 1 件。content は UTF-8 テキストとして扱う。 */
export interface InspectionFile {
  readonly path: string;
  readonly content: string;
}

/**
 * 検査対象。Hub の正式検査と Publisher のローカル pre-check が同じ形へ正規化して渡す。
 * I/O はこの package の外 (呼び出し側) で完了させ、ここには読み込み済みの値だけを渡す。
 */
export interface InspectionTarget {
  readonly files: readonly InspectionFile[];
  /** 判定に使う付帯情報 (manifest 値など)。中身の意味づけは consumer feature の責務。 */
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** finding の発生位置。line / column は 1 始まり。 */
export interface FindingLocation {
  readonly path: string;
  readonly line?: number;
  readonly column?: number;
}

/** 検査結果 1 件。ruleId + stage で「どのルールが出したか」を必ず追跡できる。 */
export interface Finding {
  readonly ruleId: string;
  readonly stage: InspectionStage;
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly location?: FindingLocation;
}

/** ルールが返す finding。ruleId / stage は pipeline 側が補完する。 */
export interface RuleFinding {
  readonly message: string;
  /** 省略時はルール既定の severity を使う。 */
  readonly severity?: FindingSeverity;
  readonly location?: FindingLocation;
}

/**
 * 検査ルール 1 件。evaluate は純関数でなければならない
 * (同一 target に対し常に同一 findings。乱数・時刻・I/O 禁止)。
 */
export interface InspectionRule {
  readonly id: string;
  readonly stage: InspectionStage;
  /** RuleFinding.severity が省略されたときに使う既定値。 */
  readonly severity: FindingSeverity;
  readonly evaluate: (target: InspectionTarget) => readonly RuleFinding[];
}

/** 検査結果。findings は常に正準順序へ整列済み。 */
export interface InspectionResult {
  readonly verdict: InspectionVerdict;
  readonly findings: readonly Finding[];
  /** 実際に評価したルール ID (整列済み)。Hub / Publisher の挙動同値検証に使う。 */
  readonly evaluatedRuleIds: readonly string[];
}

/** pipeline の同一性を外から比較するための記述子 (HF-A4-CONTRACT-003 の照合単位)。 */
export interface PipelineDescriptor {
  readonly ruleIds: readonly string[];
  readonly stages: Readonly<Record<InspectionStage, readonly string[]>>;
}

/** ルール登録時の不正 (ID 重複・空 ID など) を表す例外。 */
export class InspectionRuleError extends Error {
  readonly ruleId: string;

  constructor(message: string, ruleId: string) {
    super(message);
    this.name = 'InspectionRuleError';
    this.ruleId = ruleId;
  }
}
