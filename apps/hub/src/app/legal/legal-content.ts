/**
 * /legal に出す規約・方針の本文。**差し替えはこのファイルだけで完結する。**
 *
 * 画面 (page.tsx) は見出しの階層・改定日の出し方・未確定の断り書きだけを持ち、
 * 文言は一切持たない。法務確認が終わったら、ここの `approved` を true にして
 * `revisedOn` に改定日を入れ、`lead` と `sections` を確認済みの本文へ置き換える。
 * 条・項の数が変わっても画面側の修正は要らない。
 *
 * いま入っているのは前任の雛形の文面で、法務確認は取れていない。
 * 確認が取れていない文面を、取れているかのように見せてはいけないため、
 * `approved: false` の間は画面に断り書きを出す (法的効力があると誤解させない)。
 */

export interface LegalSection {
  /** 「第1条 (適用)」のような条見出し。 */
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface LegalDocument {
  /** 画面に出す見出し。 */
  readonly title: string;
  /**
   * 法務確認済みか。false の間は画面に「確認中」の断り書きが出る。
   * 確認が済むまで true にしない (この 1 つの値が断り書きの有無を決める)。
   */
  readonly approved: boolean;
  /**
   * 改定日 (YYYY-MM-DD)。未確定の間は null。
   * 規約は「いつ時点のものか」が分からないと同意の対象にならないため、画面に必ず出す。
   */
  readonly revisedOn: string | null;
  /** 前置きの一段落。 */
  readonly lead: string;
  readonly sections: readonly LegalSection[];
}

export const TERMS_OF_SERVICE: LegalDocument = {
  title: '利用規約',
  approved: false,
  revisedOn: null,
  lead: '本規約は、Harness Hub (以下「本サービス」といいます) の利用条件を定めるものです。本サービスを利用するお客様 (以下「利用者」といいます) は、本規約に同意した上で本サービスをご利用ください。',
  sections: [
    {
      heading: '第1条 (適用)',
      paragraphs: ['本規約は、利用者と本サービス提供者との間の本サービスの利用に関わる一切の関係に適用されます。'],
    },
    {
      heading: '第2条 (禁止事項)',
      paragraphs: [
        '利用者は、本サービスの利用にあたり、法令または公序良俗に違反する行為、本サービスの運営を妨げる行為、他の利用者または第三者の権利を侵害する行為を行ってはなりません。',
      ],
    },
    {
      heading: '第3条 (免責事項)',
      paragraphs: [
        '本サービス提供者は、本サービスに関して利用者と他の利用者または第三者との間において生じた紛争について、一切責任を負いません。',
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  title: 'プライバシーポリシー',
  approved: false,
  revisedOn: null,
  lead: '本サービス提供者は、利用者から取得した情報を、本サービスの提供・維持・改善の目的の範囲内でのみ利用し、関連する法令を遵守して適切に取り扱います。',
  sections: [
    {
      heading: '第1条 (取得する情報)',
      paragraphs: [
        '本サービスは、契約に基づき利用者組織が登録したアカウント情報および業務利用に伴い生成される情報を取り扱います。',
      ],
    },
    {
      heading: '第2条 (第三者提供)',
      paragraphs: ['本サービス提供者は、法令に基づく場合を除き、利用者の同意なく取得した情報を第三者に提供しません。'],
    },
    {
      heading: '第3条 (お問い合わせ)',
      paragraphs: ['本ポリシーに関するお問い合わせは、契約窓口までご連絡ください。'],
    },
  ],
};

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [TERMS_OF_SERVICE, PRIVACY_POLICY];
