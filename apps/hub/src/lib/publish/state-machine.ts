/**
 * PublishRequest 状態機械 (ADR AD-4 / docs/backend-spec.md §5.1)。
 *
 * **副作用を持たない**。乱数・時刻・I/O をこの module へ入れない。
 * 理由は 2 つ:
 *   1. 9 状態 × 全イベントの直積を property test で全数検証できるようにするため。
 *      DB 書込を含む関数にすると、組合せの各点で実 I/O が要るので網羅が現実的でなくなる。
 *   2. 「今どの状態か」の判断を DB の応答ではなく引数に閉じることで、
 *      同じ入力が常に同じ遷移になる (= 状態の解釈が呼び出し側ごとにぶれない)。
 *
 * 遷移が許されない組は例外ではなく `{ok: false}` を返す。例外にすると呼び出し側が
 * try/catch で握り潰したときに「遷移していないのに成功した」ように見えてしまう。
 */

import { type PublishRequestState, publishRequestStateSchema } from '@harness-hub/schemas';

/**
 * 9 状態の正準順序。**zod の enum 定義から導出する** (配列を書き写さない)。
 *
 * 状態の値域そのものは `@harness-hub/schemas` が単一ソース (shared-layers §2)。
 * ここで union 型を再宣言すると、値域が 2 箇所になるうえ
 * `scripts/ci/check-shared-layer-duplicates.mjs` の「owner 外に同名 export」に該当する。
 */
export const PUBLISH_REQUEST_STATES: readonly PublishRequestState[] = publishRequestStateSchema.options;

export type PublishRequestEvent =
  | 'submit'
  | 'inspection_green'
  | 'inspection_yellow'
  | 'inspection_red'
  | 'approve'
  | 'reject'
  | 'start_publishing'
  | 'publish_succeeded'
  | 'publish_failed'
  | 'cancel';

export const PUBLISH_REQUEST_EVENTS: readonly PublishRequestEvent[] = [
  'submit',
  'inspection_green',
  'inspection_yellow',
  'inspection_red',
  'approve',
  'reject',
  'start_publishing',
  'publish_succeeded',
  'publish_failed',
  'cancel',
];

/**
 * 直列化の対象外となる状態 (= その channel が「空いている」とみなせる状態)。
 *
 * **`packages/db/schema/core/publish.ts` の partial UNIQUE index 述語
 * `status NOT IN ('published','failed','draft')` と同じ集合でなければならない。**
 * 両者がずれると「index が効かない非終端状態」が生まれ、同一 channel に
 * 並行 publish が通ってしまう。型では守れないため一致検査をテストで固定する
 * (test-design.md T1-F)。
 */
export const TERMINAL_STATES: readonly PublishRequestState[] = ['published', 'failed', 'draft'];

export function isTerminal(state: PublishRequestState): boolean {
  return TERMINAL_STATES.includes(state);
}

/** 直列化の対象 (同一 channel に 1 件しか存在できない) かどうか。 */
export function occupiesChannel(state: PublishRequestState): boolean {
  return !isTerminal(state);
}

export type TransitionResult =
  | { readonly ok: true; readonly state: PublishRequestState }
  | { readonly ok: false; readonly reason: 'illegal_transition' };

/**
 * 遷移表。docs/backend-spec.md §5.1 の遷移図と 1:1。
 * ここに無い (state, event) の組は**すべて拒否**される (許可の上界がこの表)。
 */
const TRANSITIONS: Readonly<Record<PublishRequestState, Partial<Record<PublishRequestEvent, PublishRequestState>>>> = {
  draft: {
    submit: 'validating',
  },
  validating: {
    // Green だけが前進する。Yellow / Red は MVP では区別せず一律差戻し (制約 i2)。
    inspection_green: 'ready',
    inspection_yellow: 'needs_fix',
    inspection_red: 'needs_fix',
  },
  needs_fix: {
    // 差戻しの完了 = 作者が再編集できる draft へ戻す
    cancel: 'draft',
  },
  ready: {
    // policy 自動承認 (Green) と管理者承認の共通口
    approve: 'approved',
    // Stage 2 でのみ使う辺。MVP では policy が Green を自動承認するため到達しない
    // (到達不能であること自体を test-design.md T1-D が固定する)
    submit: 'approval_pending',
    cancel: 'draft',
  },
  approval_pending: {
    approve: 'approved',
    reject: 'needs_fix',
    cancel: 'draft',
  },
  approved: {
    start_publishing: 'publishing',
    cancel: 'draft',
  },
  publishing: {
    publish_succeeded: 'published',
    // 失敗しても stable pointer は触らない。旧 stable は「何もしないこと」で維持される
    publish_failed: 'failed',
  },
  // 終端。ここからはどのイベントでも動かない
  failed: {},
  published: {},
};

/**
 * 状態遷移。表に無い組は `illegal_transition`。
 *
 * `cancel` を各状態へ個別に書いているのは、`publishing` 中の取消を**表の形で**禁じるため。
 * 「非終端なら一律 cancel 可」と条件で書くと、publishing 中 (R2 書込と Release 生成が
 * 進行中) の取消が通ってしまい、中断点によって DB と R2 の整合が崩れる。
 */
export function transition(state: PublishRequestState, event: PublishRequestEvent): TransitionResult {
  const next = TRANSITIONS[state]?.[event];
  if (next === undefined) {
    return { ok: false, reason: 'illegal_transition' };
  }
  return { ok: true, state: next };
}

/** ある状態から発火しうるイベント一覧 (UI/デバッグ用。判定には使わない)。 */
export function allowedEvents(state: PublishRequestState): readonly PublishRequestEvent[] {
  return PUBLISH_REQUEST_EVENTS.filter((event) => TRANSITIONS[state]?.[event] !== undefined);
}
