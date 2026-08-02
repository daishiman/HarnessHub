---
status: confirmed
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-bd-free-field-write-route-20260721
beads_id: HarnessHub-dc7
updated: 2026-08-02
spec_impact: reflected-internal-design
---

# Beads 自由フィールド更新経路 — 仕様反映受領書

## 1. 目的と背景

Beads の `priority`、`assignee`、`labels` は Dev Graph と完全一致させない自由領域だったが、
guard は直接 `bd update` を全て遮断し、正規入口 `bd-bridge.py` も三フィールドを受け取らなかった。
そのため、契約上は更新可能に見える値が実際にはどこからも更新できなかった。

本変更は guard を緩めず bridge の受理範囲を広げ、書き込みの入口を一本に保ったまま
到達不能を解消する。目的は「自由領域」という語の曖昧さをなくし、契約・案内・実装を
同じ経路へ揃えることである。

## 2. 対象

| 項目 | 値 |
|---|---|
| Beads | `HarnessHub-dc7` |
| dev-graph node | `issue-bd-free-field-write-route-20260721` |
| branch | `devgraph/issue-bd-free-field-write-route-20260721` |
| base | `main` |
| task type | implementation / NON_VISUAL |
| deploy unit | repository development tooling |

## 3. 中学生向けの説明

学校の係で、予定表に書かなくてもよい「担当者」「大切さ」「分類シール」があるとします。
でも先生は勝手な書き換えを禁止していて、受付の人もその三つを受け付けていませんでした。
つまり、変えてよいはずなのに変える方法がありません。

今回、先生の禁止ルールはそのままにして、受付の人が三つを正式に受け取れるようにしました。
分類シールは「追加・削除」ではなく、毎回「この一覧にする」と全部渡します。同じ依頼を
二度しても同じ結果になるため、途中でやり直しても安全です。

## 4. 技術者向けの説明

### 4.1 不変条件

- Beads mutation の唯一の入口は C28 `bd-bridge.py`。
- `priority`、`assignee`、`labels` は graph parity の exact-set 対象外。
- 対象外であることは bridge bypass を許可しない。
- guard は field-aware parser を持たず、直接 `bd update` を一律遮断する。
- labels は `--set-labels` だけを使い、現在値に依存する add/remove を使わない。

### 4.2 実装

- 分割後の `bd_bridge_contracts.py` にある `UPDATE_FIELDS` を 6 から 9 フィールドへ拡張した。
- priority は create と同じ `normalize_priority` を update にも適用する。
- labels は空白を除去し、空要素を拒否して comma-separated 値へ正規化する。
- dry-run receipt は `applied_fields` に適用フィールド名を、各フィールドキーに
  実 argv と同じ正規化後の値を返す。
- 非 update operation に更新専用引数が混入した場合は fail-closed にする。
- guard の拒否メッセージは bridge を案内し、契約文書は read-only help に
  `bd help update` を使うことを明示する。

### 4.3 テスト契約

契約文書、guard の案内、bridge の許可フィールドを同じテストで比較する。さらに、
直接更新の遮断、bridge と read-only help の許可、全フィールド転送、正規化、dry-run、
空 labels、操作外引数、更新値なしの負例を固定する。

## 5. 仕様・設計への影響判定

**内部設計への影響あり、製品仕様への影響なし**と判断した。

- `system-spec/dev-workflow.md`: execution tracker の単一チョークポイントを三フィールドへ具体化。
- `specs/harness-hub-system-specification.md`: 製品境界の非変更と trace を要約。
- `architecture/harness-hub-dev-workflow.md`: guard / bridge / parity の責務境界を追記。
- `features/feat-dev-pipeline-improvement.md` と changelog: 実装履歴と受領書への導線を追加。
- `tasks/feat-dev-pipeline-improvement/...-p13.md`: post-completion 書き戻しとして記録。
- `plugins/dev-graph/references/execution-tracker-contract.md`: 実行時契約の正本を更新。

`system-spec/spec-state.json` は変更しない。理由は、新しい利用者要件や QA 判断を追加する
変更ではなく、execution tracker に既存の「全 mutation を単一チョークポイントへ通す」契約の
実装欠落を修復するためである。製品 API、DB schema、認証認可、UI、Cloudflare deploy unit、
確定済み QA 回答は変更しない。

## 6. 500 行判定

今回の新規文書・テストと、bridge 以外の変更対象は 500 行以下である。
`HarnessHub-w7n7` / PR #630 は今回の main 取込前に merge 済みだったため、本変更を
分割後の `bd_bridge_contracts.py` と 500 行以下の CLI adapter へ正規に配置した。
先行分割そのものは main の履歴として取り込み、本変更の commit 対象には含めない。

例外は機械生成された live-trial 証跡の `transcript.jsonl`（777 行）、
`decompose-audit.json`（1212 / 1216 行）、schedule の `graph.json`（577 行）である。
これらは検証器が既定ファイル名で一体として読む session log / state snapshot であり、
`transcript.jsonl` はさらに `verdict.json` の `transcript_sha256` がファイル全体へ束縛される。
分割すると再検証可能性を失うため、生成物に限って分割しない。手書きの実装・テスト・
仕様文書には 500 行超過がない。

## 7. 最終検証

最終結果は `origin/main` → local `main` → 本 branch の順に統合した tree で確定する。

| gate | 結果 |
|---|---|
| focused bridge / contract tests | PASS: 43 passed |
| Dev Graph test suite | PASS: 752 passed / 2 skipped / 5 subtests passed |
| task specification package | PASS: P01〜P13、violations 0、digest `sha256:af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6` |
| system-spec gate | PASS: coverage complete + foundation、source citation 全件整合 |
| graph / document / placement | PASS: graph schema violations 0、483 文書の行数制限、artifact placement、plugin manifest |
| fresh live trials | PASS: node / sync / schedule / decompose、独立 evaluator blockers 0 |
| live-trial / criteria receipts | PASS: verdict 9/9、criteria evidence 22 passed |
| repository CI checks | PASS: 136 PASS / 4 既存 WARN / 0 FAIL |
| `git diff --check` / staged check | PASS |

## 8. 残課題

- 本変更の受入条件に対する残課題はなし。先行していた `HarnessHub-w7n7` / PR #630
  との競合は、分割後の `bd_bridge_contracts.py` と CLI adapter へ移植して解消済み。
- 運用上の残りは draft PR の review と merge。これは実装・仕様反映の未完了ではなく、
  repository の承認フローである。

最終レビューで、本 issue の受入条件に関する新しい未解決不具合は検出されなかった。
