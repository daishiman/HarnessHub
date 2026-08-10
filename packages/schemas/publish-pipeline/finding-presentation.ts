/**
 * 検査結果 (findings) を人が読む 1 行へ落とす唯一の実装 (feat-web-only-publish-journey 受入 3)。
 *
 * なぜ契約 package に表示の関数を置くのか:
 * 検査を受ける経路は CLI (`apps/publisher`) と Web (`apps/hub`) の 2 つあり、両者が共有するのは
 * この `@harness-hub/schemas` だけである。整形を各アプリに書くと、同じ検査結果が経路によって
 * 別の文面になる。実際 2026-08-10 時点では CLI が `[rule_id] message`、Web が `message` だけを
 * 出しており、Web の利用者だけが「どのルールで落ちたか」を知れない状態だった。
 *
 * ここが持つのは**表示だけ**で、判定 (verdict) も遷移も持たない。それらは
 * feat-publish-pipeline (`state-machine.ts` / `verdict.ts`) の所有物である。
 */

import type { PublishVerdict } from './primitives.js';
import type { PublishFinding } from './publish-request.js';

/**
 * finding 1 件の本文。
 *
 * rule_id を必ず前置するのは、利用者が同じ指摘を検索・報告できる語をここでしか得られないため。
 * 位置 (path / line) は分かっている分だけ添える —— 無い finding を「(不明)」と埋めると、
 * 位置が特定できないことと位置が無関係であることが同じ見た目になる。
 */
export function formatPublishFinding(finding: PublishFinding): string {
  const location =
    finding.path === null ? '' : finding.line === null ? ` (${finding.path})` : ` (${finding.path}:${finding.line})`;
  return `[${finding.rule_id}] ${finding.message}${location}`;
}

/** 複数件。並びは検査 pipeline が返した順のまま変えない (stage の正準順序が保たれる)。 */
export function formatPublishFindings(findings: readonly PublishFinding[]): readonly string[] {
  return findings.map(formatPublishFinding);
}

/** 差し戻し一覧の見出し。CLI の本文冒頭と Web の見出しで同じ語を使う。 */
export const PUBLISH_NEEDS_FIX_HEADING = '修正が必要な内容';

/**
 * 差し戻しの説明。verdict ごとに何が起きたかを述べる。
 *
 * `red` と `yellow` を同じ文面にしない。前者は必ず直さないと公開できず、後者は内容次第で
 * 判断が要る。同じ「Needs Fix」でも次の行動が違うため、そこだけは区別する。
 */
export function publishNeedsFixSummary(verdict: PublishVerdict | null): string {
  if (verdict === 'red') {
    return '公開できない問題が見つかりました。下の指摘をすべて解消してから、もう一度パッケージを投入してください。';
  }
  if (verdict === 'yellow') {
    return '公開を保留する指摘が見つかりました。下の内容を確認し、修正したパッケージをもう一度投入してください。';
  }
  return '検査で修正が必要と判定されました。下の内容を確認してから、もう一度パッケージを投入してください。';
}

/**
 * 再投入の行動文言。
 *
 * CLI も Web も「直した中身をもう一度投入する」= 新しい公開要求を作る、という同一の手順を採る
 * (どちらも差し戻された要求を編集して再送はしない)。同じ手順を別の言葉で案内しないためにここへ置く。
 */
export const PUBLISH_RESUBMIT_ACTION_LABEL = 'パッケージを修正してもう一度投入する';
