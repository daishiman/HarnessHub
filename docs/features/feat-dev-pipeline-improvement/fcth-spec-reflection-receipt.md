---
status: confirmed
layer: feature-operations
beads_ids:
  - HarnessHub-fcth
dev_graph_node_id: issue-schedule-blocked-exclusion-unreported-20260728
feature_node_id: feat-dev-pipeline-improvement
spec_impact: none
reviewed_at: 2026-08-01
---

# schedule-graph 依存未充足 silent drop 解消の仕様反映受領書

## 1. 受領対象

`HarnessHub-fcth` は `schedule-graph.py`(C15 スケジューラ本体。ready set = 次に着手可能な
task 一覧を計算するスクリプト)が、未充足の `depends_on`(上流 task が完了していないため
着手不可という依存関係)を持つ task を ready set から除外するとき、除外した事実と理由を
一切出力しない silent drop(サイレントドロップ=結果を報告から黙って落とし、見かけ上は
問題ないように見せてしまう挙動。本リポジトリで禁止されている設計原則)を解消する。

本 issue は先行 PR (`HarnessHub-mfh7` / `ii90`) の棚卸し作業中に見つかった follow-up として
起票されたもので、`docs/features/feat-dev-pipeline-improvement/mfh7-ii90-spec-reflection-
receipt.md` §7.1 にも記載がある。

- Beads ID: `HarnessHub-fcth`(close 済み)
- dev-graph node ID: `issue-schedule-blocked-exclusion-unreported-20260728`(`parent_feature:
  null` のスタンドアロン issue node)
- 対象 feature node: `feat-dev-pipeline-improvement`(`schedule-graph.py` は本 feature の
  choke-point 契約下にあるスクリプトだが、fcth 自体はスタンドアロン issue node)

## 2. 仕様・設計影響の判定

判定は **none(今回の差分による新しい仕様・設計影響なし)**。

`schedule-graph.py` の ready 判定ループが除外する理由には、選択外(scope 対象外)・
非 schedulable(実装未完了などで着手不可)・依存未充足の 3 種類がある。今回の変更は
この 3 理由を条件式上で分離し、依存未充足だけを `unmapped[]`
(スケジュールに載らなかった node の一覧)へ `reason: "dependency_unsatisfied"` と
`blocking_depends_on`(どの上流 node が未充足かのリスト)付きで報告するようにした。
ready set(着手可能と判定される task の集合)そのものの値は変えていない。

これは **既存の可観測性契約(除外理由は必ず機械可読に報告する)の内部実装の是正**であり、
新しい利用者要件・外部 API・データ構造・セキュリティ境界・配備方式を追加しない。
`references/execution-tracker-contract.md` §10 は元々「unmapped の理由は網羅的に列挙する」
契約を持っており、依存未充足だけがその契約から漏れていた欠陥を埋めるものである。

## 3. 確認した正本と設計

| 層 | 確認結果 |
|---|---|
| `system-spec/` | schedule の外部契約(スケジューラ・API・DB・認証認可・UI・deploy の構造)に変更なし。`system-spec/testing-qa.md` / `spec-state.json` qa-089・qa-100 は「C15 schedule の新規 run は現行動作の再観測であり構造は変えない」と明記しており、本変更と整合する |
| `specs/` | Harness Hub 製品の外部契約に変更なし |
| `architecture/` | `architecture/harness-hub-testing-qa.md` の記述(上記と同旨)に変更なし。component・責務境界・データフローに変更なし |
| `features/` | `feat-dev-pipeline-improvement` の purpose/goal/scope_in に変更なし。fcth は同 feature の scope_in・related_nodes に元々含まれていないスタンドアロン issue であり、feature frontmatter への追記は別途 C02 upsert-node.py の正規フローを要するため本 PR では見送る |
| `tasks/` | 手編集なし。P01〜P13 の task spec に影響する変更を含まない |
| `docs/` | `plugins/dev-graph/references/execution-tracker-contract.md` §10(メタ層自身の正本)に新 reason を追記済み(diff に含まれる)。本受領書を追加 |

`docs/shared-layers.md`(104 行目)の明文規約:

> メタ層のゲート(配置規約 lint・skill description lint・live-trial 証跡の検査など)を
> qa-038 の 8 種へ数え入れないこと。(中略)両者はゲートの数を互いに増減させない独立系統で
> あり、**片方の変更はもう片方の仕様反映を要さない**。

`schedule-graph.py` と `execution-tracker-contract.md` はいずれも `plugins/dev-graph/`
配下のメタ層(Claude Code スキルハーネス側)であり、`system-spec/`・`specs/`・
`architecture/`(プロダクト層 = Harness Hub 本体)の改訂を要さない。実装状態の写しで
`system-spec/` や `architecture/` を更新すると、確定要件と実行状態の二重正本を作るため
編集しない。

## 4. 正規フローによる反映

凍結済み task を手編集せず、次の経路で反映した。

1. `schedule-graph.py` の `dependencies_satisfied()`(bool を返す既存関数)はそのまま
   ラッパーとして残し、未充足の依存 ID 一覧を返す `blocking_dependencies()` を新設。
   ready 判定ループを「選択外」「非 schedulable」「依存未充足」の 3 分岐へ分離した
2. 依存未充足で除外した node は `unmapped[]` へ
   `{"external_ref": node_id, "reason": "dependency_unsatisfied", "blocking_depends_on":
   [...], "source": "schedule-graph"}` を追加するようにした
3. `references/execution-tracker-contract.md` §10 の unmapped 分類表に新 reason の行を
   追記し、除外条件分岐の明文化ルールを追加した(正本改訂を実装と同一 PR で実施)
4. 回帰テスト `test_schedule_reports_unsatisfied_dependencies_without_
   misclassifying_other_exclusions` を追加し、選択外・非 schedulable・依存未充足の
   3 経路が誤分類なく区別されることを固定した
5. C15 (`run-dev-graph-schedule`) の live-trial(fresh agent による実環境再試験)を
   再取得し、独立評価者が `the blocked task is excluded from the ready set and the
   reason is reported` を実測で PASS と判定することを確認した

## 5. 品質ゲートと 500 行分割

`plugins/dev-graph/tests/test_sync_render_schedule_v2.py` は、今回の作業途中で
回帰テストを追加した結果 539 行に達し、ユーザー指定の 500 行上限を超過した。既存の
`test_schedule_graph_mvp_first.py`(`plugins/dev-graph/tests/` 直下に自前の `load()` /
`call_main()` ヘルパーを持つ独立ファイル)の命名・構造慣習に倣い、新規追加分
(1 テスト関数・78 行)を `plugins/dev-graph/tests/test_schedule_dependency_exclusion_
reporting.py`(113 行)へ切り出した。元ファイルは編集前の内容(461 行、HEAD と byte 同一)
に復帰したため、今回の diff には含まれていない。

`schedule-graph.py` 自体は変更前から 523 行で既に 500 行を超えていた(今回の変更後は
551 行)。これは本 issue のスコープ外の既存問題であり、今回新たに超過させたものではない
ため分割は見送った。手書き Markdown 対象の
`scripts/lint-doc-line-limit.py`(300 行制限、`system-spec/architecture/features/
tasks/docs` の 5 root のみ対象)・harness coverage ratchet(`scripts/*.py` と
`plugins/*/**/scripts/*.py` の分割で分母が希釈され回帰扱いされる既知の懸念、
`HarnessHub-2mor`)のいずれも `tests/` は対象外・`scripts/schedule-graph.py` は
今回未着手のため、CI ゲート上のブロッカーではない。

| ゲート | 結果 |
|---|---|
| `pytest plugins/dev-graph/tests/`(分割前) | 731 passed, 2 skipped (785.98s) |
| `pytest plugins/dev-graph/tests/`(分割後、最終確認) | 731 passed, 2 skipped (256.19s) |
| C15 `run-dev-graph-schedule` live-trial 再取得 | PASS(run `20260730T134837Z-fcth-schedule-finalmain-r3`、`nudge_count=0`、`gate_response_count=0`、`poll_exit=DONE`) |
| C14 `run-dev-graph-decompose` live-trial 再取得 | PASS(run `20260730T131336Z-fcth-decompose-finalmain-r14`) |
| C03 `run-dev-graph-sync` live-trial 再取得 | PASS(run `20260730T133000Z-fcth-sync-finalmain-r4`) |

C14 decompose と C03 sync も再取得したのは、`execution-tracker-contract.md`(両 skill の
behavior closure が参照する契約正本)への追記が両 skill の behavior closure digest
(スキル本体+参照スクリプトの内容ハッシュ)をずらしたためである。これは先行 PR
(`mfh7-ii90-spec-reflection-receipt.md` §7.5〜§7.7)で観測されたのと同型の連鎖であり、
digest だけを書き換える緑化は `lint-live-trial-verdict.py --check-provenance` が
`digest-only-rewrite` として遮断するため、fresh agent による再実走で解消した。

## 6. main 統合

作業開始時点で `origin/main` を fetch すると、ローカル `main` は既に `origin/main` と
同一コミットまで進んでいたが、その `main` には本ブランチ未取込みの 2 件のマージ
コミット(`SYS-PUBLISH-PIPELINE-P13`、`issue-c02-upsert-lifecycle-regression-20260729`)が
あった。`git diff` で確認したところ、これらはいずれも `apps/hub/`・`packages/*`
(プロダクト層)の変更であり、`plugins/dev-graph/`・`eval-log/dev-graph/` には一切
触れていない。ローカル `main` を本ブランチへ `git merge main`(マージコミット
`a980a4d4`)でコンフリクトなく統合し、本ブランチが `origin/main` の全内容を含む状態にした。

作業中、worktree の `.git/worktrees/wt-15/index.lock`(git の書き込み操作を排他制御する
一時ファイル)が 2026-07-30 22:15 作成のまま stale(対応するアクティブな git プロセスが
存在しない古いロック)で残留しており、`git merge` が index 書き込み失敗で止まった。
ユーザーへ状況を説明し承認を得たうえで解除し、マージを完了させた。

## 7. Beads / dev-graph

`HarnessHub-fcth` は前回のレビューサイクルで close 済み(close reason に
「dependency_unsatisfied reporting 実装・契約文書化・回帰テスト追加・C15 live-trial
再取得・731 tests passed, 2 skipped」を記録済み)。dev-graph node
(`issue-schedule-blocked-exclusion-unreported-20260728`)は `status: draft` のままで
beads 側の CLOSED と不整合だが、node の status 更新は C02 (`run-dev-graph-node`) 正規
フロー経由で行うべきものであり、`.dev-graph/state/graph.json` や
`issues/sys-schedule-blocked-exclusion-unreported-20260728.md` を本 PR で直接編集しない
(single writer 原則)。PR マージ後に別途 C02 で同期する。

## 8. 残課題

- dev-graph node の status を `draft` から実装完了へ同期する作業(C02 正規フロー、
  PR マージ後に別途実施)
- `schedule-graph.py` 自体の 500 行超過(551 行)の是正。今回のスコープ外の既存問題であり、
  follow-up issue 化は未実施
- commit 対象外とした中間試行の live-trial 評価ディレクトリ(decompose r1〜r13、
  schedule 初回×2、sync 初回×2、計 17 ディレクトリ、約 20MB)は、いずれも
  `scenario-verdict.json` から参照されない中間ログであり、放置してもゲートやテストには
  影響しない。整理(削除)は別途判断事項として残す
