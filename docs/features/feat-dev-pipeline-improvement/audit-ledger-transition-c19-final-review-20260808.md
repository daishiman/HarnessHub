---
status: recorded
layer: final-review-and-spec-reflection
beads_ids:
  - HarnessHub-3vmz
  - HarnessHub-d15
  - HarnessHub-4z0
  - HarnessHub-dxfe
  - HarnessHub-iuoq
  - HarnessHub-ntj
  - HarnessHub-yg3
  - HarnessHub-o4zi
  - HarnessHub-uypz
  - HarnessHub-duej
dev_graph_node_id: issue-audit-fork-ledger-forgery-20260728
parent_feature: feat-dev-pipeline-improvement
spec_impact: internal-development-contract
reviewed_at: 2026-08-09
---

# 監査台帳・状態遷移・C19 見出し契約 — 最終レビュー兼仕様反映受領書

## 目的と背景

独立監査の結果を上位 agent が書き換えたり、監査台帳を直接偽装したりしても合格できた問題を閉じるため、監査結果の帰属、聞き取り状態遷移、live-trial（実環境に近い試験）の入力契約を最終確認した。あわせて C19 system-spec import で specification と architecture の必須見出しが実際の生成物に合わず、正規 C02 登録が失敗していた問題を解消した。

## 結論

本変更は HarnessHub 製品の画面、公開 API、DB、認証認可、Cloudflare 配備単位を変更しない。一方で、開発管理パイプラインの内部仕様・設計には影響があるため、次を正規反映した。

- system-spec 監査を五軸で統一し、foundation U1-U9 の出典と承認参照を停止条件に含める。
- 状態遷移は保存済み `max_loops` の実値、破棄履歴、再開後 progress を正しく保持する。
- live-trial の negative control（存在してはいけない実装の検査）対象を fixture root に限定する。
- specification / architecture の C11 必須見出しを生成物の lineage（出所のつながり）に応じて判定する。
- 既存の architecture 7 文書と specification 3 文書を新しい見出し契約へ移行する。

`system-spec/spec-state.json` は変更しない。新しいユーザー要求、QA 回答、製品の承認判断は発生しておらず、開発ツール内部の検証契約を製品要求の正本へ複製すると二重正本になるためである。

## 層別の反映

| 層 | 反映 | 判断 |
| --- | --- | --- |
| `docs/` | 本書 | 目的、差分、検証、残課題の詳細な正本を記録する。 |
| `features/` | feature 変更履歴へ追記 | `feat-dev-pipeline-improvement` に今回の内部品質契約を関連付ける。 |
| `system-spec/` | 正本は非変更 | 新しい利用者要求や承認判断がないため変更せず、本書に非影響の理由を記録する。 |
| `specs/` | 既存3文書の見出し移行、分冊を正規登録 | C11 が必要とする index 見出しを追加する。500行超過を避け、実装 writeback を別冊化する。 |
| `architecture/` | 既存7文書の見出し移行、分冊を正規登録 | U1-U9 と決定事項を明示し、architecture の readiness を対称に検査できるようにする。 |
| `tasks/` | P13 handoff を正規登録 | 凍結済み exact-13 task 本文は手編集せず、最終ゲート結果と Beads 対応を別 task に記録する。 |

## 実装と設計の要点

### 監査証拠の真正性

監査 hook の台帳行を raw response digest と auditor verdict に結び付け、上位 agent の自己申告だけでは PASS にできない。completeness evaluator と hearing auditor の契約は五軸へ統一し、foundation evidence と approval reference が欠ける場合は fail-closed（安全側に失敗）とする。

### 状態遷移

matrix 更新後に progress を再計算し、確定済みセルを初期化で巻き戻す操作を拒否する。reopen では破棄した証拠の trace を残し、`max_loops` は固定の 5 ではなく保存した値を監査する。

### live-trial と C19

task contract lint は negative control を fixture の対象 root だけで探索する。C19 import は system-spec-harness の lineage を解決して、生成された specification / architecture に適用すべき見出し集合を選ぶ。architecture も specification / task と同じく全 graph 検査の対象にした。

C19 の confirmed bundle 再利用は、単なる `verdict: PASS` では通さない。正規 completeness
report の全観点、`G-matrix` / `G-source-citation`、fork 台帳の session と response digest、
対象 artifact の SHA-256、対応 plugin の semver 範囲を再検査する。新しい
`build-resume-receipt.py` は completeness evaluator の PASS 後だけ schema 1.1 の受領書を
atomic（途中状態を見せず一括置換）に生成する。

import runner は graph を変更する前に boundary、source/evidence digest、2 node 合成後の graph
schema、各 C02 dry-run をすべて通す。したがって preflight の不合格で graph の一部だけが残らない。
goal-seek の `intermediate.jsonl` も上書きせず、既存行と original goal を検査して追記する。

system-spec elicit は、legacy schema 1.0 を読み取り専用、schema 1.1 +
`design_application_contract_version: 1.0` を現行更新契約として JSON Schema に明示した。
`bootstrap → R0-foundation → R1-init` の順序、legacy 1.0 だけに許す明示 migration、全 matrix
writer が `hearing_progress` を再同期する挙動を、SKILL・prompt・writer の説明で統一した。

completeness evaluator の完了境界は、Skill 起動結果の完全な `agentId` と native
`task-notification` を transcript 上で対応付け、完了通知より後にだけ実登録が始まることを
`validate-system-spec-evaluator-completion.py` で検査する。`upsert-node.py --help` は read-only
（説明表示だけ）なので mutation から除外し、実登録コマンドだけを順序判定へ使う。

## 検証記録

- task specification: P01-P13 exact、digest `af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6`、violations 0。
- focused pytest: system-spec / dev-graph の変更境界 202件 PASS。criteria / fixture 63件 PASS。hearing auditor 契約 7件 PASS。
- MVP 初回 combined pytest: 84件 PASS / 1件 FAIL。FAIL は、r6 の改変不能な旧 observer FAIL を理由に current formal live receipt を未達とする既知の1件だけだった。最終再実行ではその外部 gate だけを明示的に deselect し、変更境界は64件 PASS / 1件 deselected。現行 task contract 単体は41件 PASS / violation 0、observer 回帰は7件 PASS。
- MVP 最終ゲート: task package validator、変更境界の focused pytest、lint、diff check を実行し、
  plugin-wide/exhaustive live-trial は Draft PR 後の追加評価へ回す。
- `origin/main` (`99371e39`) をローカル `main` へマージした commit は `b35d0737`。その
  ローカル `main` を本ブランチへ取り込み、競合は各仕様の新旧契約を統合して解消した。
- main 取込み後の focused pytest は dev-graph 69件、system-spec 71件が PASS（合計140件）。
  task package validator、`make lint`、coverage、diff check も再度 PASS した。
- 最終レビュー指摘の修正後は、C19 import / evaluator completion の focused test 29件、
  system-spec harness の関連 suite 382件が PASS。production receipt の閉ループ、自己申告
  gate 欠落、fork ledger 不一致、semver 境界、preflight 不合格時の graph 非変更、JSONL
  履歴保持、spec-state schema 1.0/1.1 境界を回帰テストへ追加した。
- criteria evidence gate は22件中20件 PASS、2件 FAIL。失敗は C19 Skill の統合後に、main
  由来の criteria / content-review 受領書へ記録された `skill_md_sha256` が旧値になったためで、
  実装テストの失敗ではない。受領書を手編集せず、正規 live-trial と review の再取得を
  `HarnessHub-o4zi` の Draft PR gate として継続する。
- system-spec coverage `--require-complete`: PASS。
- source citation（spec-state 対象）: PASS。
- system-spec compile: 一時ディレクトリへの生成は成功。既存の手動 writeback による checked-in 文書との差は、本変更で上書きしない。
- content review: fresh independent reviewer の初回レビューで、C19 に high 2件 / medium 2件、
  system-spec elicit に medium 3件 / low 1件を検出した。自己申告 receipt、mutation 順序、
  production writer 不在、semver、JSONL 上書き、state 契約説明/schema、receipt の canonical
  path と exact-field parity の各指摘を実装修正し、
  focused suite を再実行した。最終 independent static verdict は3 Skillとも findings 0で PASSし、
  current Skill SHA に束縛した6件の content-review verdict を記録した。実走証拠の stale は
  static PASS で代替していない。
- C01/C02/C03/C04/C05/C14/C18: fresh live-trial 7件 PASS。
- C19 r6: 正規4 entry point、fresh evaluator、C02 import、lineage/evidence gate は完走した。
  run 内の旧 validator は `upsert-node.py --help` を実登録と誤認して status=FAIL としたため証跡を
  書き換えず保持した。修正後の current validator で同じ一次 transcript を再検査すると、evaluator
  completion line 623、最初の実登録 line 638、TaskStop/outer report write/foreground blocking wait
  すべて0件、violations 0で PASS。receipt は
  `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260809T000500-wt27-c19-final-r6/posthoc-transcript-validation.json`。
- `git diff --check`: PASS。
- `make lint`: PASS。文書行数 lint の検査対象650文書はすべて300行以下。infrastructure の運用追補を `architecture/harness-hub-infrastructure-operations-addenda.md` へ責務分割した。

全 graph validator は origin/main でも 160件の既存違反を持つ。本変更後は同じ7ノードに限定された112件へ減少し、新規 failing node と architecture failure は 0 件である。残る既存 debt は今回の機能差分に混ぜず Beads で追跡する。

`--require-foundation` が示す U1-U9 source-index の qa_log 未登録9件、coverage certificate の文言と配列値の不一致、複数監査 dispatch 時の null verdict、compile 出力と手動 writeback の drift は follow-up として追跡し、今回の合格条件を偽って消さない。

MVP のため r6 の改変不能な `out/status.json` は FAIL のまま保全し、posthoc PASS へ書き換えない。
main から取り込んだ bounded-resume の formal evidence は取込み前の Skill に対しては成立していたが、
本ブランチで C19 の evaluator 完了境界を統合したため SHA 受領書は stale（内容更新後の古い証跡）に
なった。現行 behavior closure の formal live verdict と content review の再取得は
`HarnessHub-o4zi` の Draft PR review gate として残し、本 PR では決定論 replay と focused gate を
MVP の受入根拠にする。

pre-push 相当チェックの初回実行では、誤った receipt 配置、stale content-review、stale
live-trial、LLM coverage ledger、実行 bit 欠落の5分類を検出した。配置は中央受領書 + 正規登録済み
P13 handoff へ集約し、coverage と package 契約を更新した。current formal live-trial だけは実対話を
要するため `HarnessHub-o4zi` の Draft PR gate として残し、緊急回避を使う場合も PR と Beads に
明示して CI の失敗を隠さない。

- `HarnessHub-uypz`: 複数監査 dispatch の `audit_verdict=null` を原子的に記録する。
- `HarnessHub-duej`: certificate・foundation qa_log・compile writeback の証拠 projection を揃える。

## 中学生向けの説明

これは、先生が採点した答案を、生徒があとから勝手に「合格」に書き換えられないようにする仕組みである。採点した人、採点内容、元の答えを指紋のような番号で結び、違えば止める。また、提出物の見出しが説明書とずれて受付で落ちる問題も直した。Web サイトの画面や利用者データは変わらないが、開発者が間違った証拠で合格させにくくなる。

## 専門的な説明

audit-fork ledger の event identity、`response_sha256`、生 `AUDIT_VERDICT`、session attribution を集約時に照合し、stale/malformed/latest-event mismatch を拒否する。state transition matrix は mutation 後の derived progress、confirmed-cell initialization guard、discarded trace preservation、persisted `max_loops` を invariant（常に守る条件）としてテストする。C19 は `graph_artifact_readiness.py` が system-spec-harness lineage を解決し、`template-contract.json` の conditional headings を specification と architecture に適用する。全体 schema validator に architecture heading readiness を追加し、局所 upsert と全体検査の非対称を解消した。

## Beads と Dev Graph

- 主課題: `HarnessHub-3vmz`
- 関連完了課題: `HarnessHub-d15`, `HarnessHub-4z0`, `HarnessHub-dxfe`, `HarnessHub-iuoq`, `HarnessHub-ntj`, `HarnessHub-yg3`
- C19 見出し契約: `HarnessHub-o4zi`
- 最終レビューで起票した残課題: `HarnessHub-uypz`, `HarnessHub-duej`
- Dev Graph node: `issue-audit-fork-ledger-forgery-20260728`

Beads の更新は `bd-bridge.py` 経由で行う。Draft PR の review / CI / merge は外部 gate のため、PR 作成時点では主課題と C19 課題を `in_progress` のまま維持し、PR URL と検証証拠を notes に追記する。

## 行数と残課題

本書と正規登録した handoff、および通常の実装・仕様ファイルは500行以下である。`specs/harness-hub-system-specification.md` は500行を超えないよう、実装 writeback を `specs/harness-hub-system-specification-implementation-writebacks.md` へ意味単位で分冊した。transcript JSONL、pane capture、fixture の graph/state JSON は、時系列または schema が単一 artifact を要求する生成済み一次証拠なので分割しない。

残課題は Beads に起票し、今回の対象 commit から独立させる。旧 Draft PR #680 は未マージのため勝手に閉じず、今回作る最終 Draft PR との関係を notes に記録する。
