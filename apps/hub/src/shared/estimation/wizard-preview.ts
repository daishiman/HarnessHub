/**
 * ヒアリング入力ウィザードが「確認」ステップで出す削減時間の目安。
 *
 * 正式な削減時間と金額はサーバが計算する (features/hearing-intake/estimation-adapter)。
 * ここにあるのは入力途中の手応えを出すためだけの前倒し計算で、
 * 送信前の画面はテナント設定の係数を読めない (coefficients.read は workspace-admin 限定) ため、
 * 既定の係数で計算していることを画面側の文言でも明示している。
 *
 * この層を画面から分けている理由は 2 つ。
 * 1. 数値 (0.35) に名前を付け、業務上の判断であることを読み取れるようにする。
 * 2. サーバの式とズレていないことをテストで突き合わせられるようにする
 *    (tests/hearing-intake/wizard-preview.test.ts が年換算と付き合わせる)。
 */

/**
 * 既定の削減率。DB の tenant_coefficients.sheet_reduction_rate の既定値と同じ。
 *
 * ここに写しを置いているのは、この値をクライアント側の計算で使うため。
 * `@harness-hub/db` を client component から import すると drizzle ごと
 * バンドルに入ってしまう (First Load JS 予算 120 KiB)。
 * 写しが本体とズレていないことは、上記テストが `DEFAULT_TENANT_COEFFICIENT_VALUES` と
 * 直接突き合わせて落とす。
 */
export const DEFAULT_SHEET_REDUCTION_RATE = 0.35;

export interface WizardPreviewInput {
  /** 1 か月あたりの作業時間 */
  readonly hours: number;
  /** その作業に関わる人数 */
  readonly people: number;
}

/** 月あたりの削減時間の目安。丸めは表示側の責務なので、ここでは生の値を返す。 */
export function previewMonthlySavedHours(input: WizardPreviewInput, reductionRate: number): number {
  return input.hours * input.people * reductionRate;
}
