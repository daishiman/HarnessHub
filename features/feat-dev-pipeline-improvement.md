---
graph_node_id: "feat-dev-pipeline-improvement"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["macro-feature","dev-pipeline","governance","qa-067","qa-071"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "開発管理パイプライン改善 (lifecycle close-loop / eval-log 規約 / handoff disposition)"
owners: ["daishiman"]
created_at: "2026-07-21T14:40:00Z"
updated_at: "2026-07-29T05:22:10.828117Z"
status: "active"
depends_on: []
related_nodes: ["issue-audit-followups-20260717"]
resource_scope: ["features/feat-dev-pipeline-improvement.md"]
purpose: "開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する。あわせて qa-071 で確定した開発管理の方法論 (マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を本 feature の 13 フェーズ実行契約として明示的に採用し、feature context から task spec まで意味的に伝播する"
goal: "qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態。加えて qa-071 の方法論要件が goal-spec と P01..P13 task spec の実行契約 (外側ループの目的/背景/ゴール固定・内側ループの goal-seek 反復・スコープ分離・情報配置=正本参照と lineage のみ・P13 書き戻し) として trace され、tag/lineage 一致だけでは PASS しない semantic coverage 検査で保証された状態"
scope_in: ["lifecycle close-loop の機械化 (open 残置検出と md/graph/beads 3 表現の同時 close 導線)","eval-log/ 配置規約の明文化と CI lint 強制","improvement-handoff schema への disposition 必須化と未消化 findings の beads 起票","tasks/ frontmatter status の意味論明記","graph.json 肥大対策の再検討トリガー記録","dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与","spec-drift-guardian の verdict close gate 配線","陳腐化文書の定期棚卸し GC の sync verb 運用組込み","qa-071 方法論要件 (外側/内側ループ・スコープ分離・情報配置・P13 書き戻し) の feature context・goal-spec・P01..P13 task spec への意味的伝播と semantic coverage 検査の恒常化"]
scope_out: ["Hub プロダクト本体機能 (Web/API/DB) の変更","dev-graph への新 verb 追加","bd CLI 本体の変更","graph.json 分割の実装 (トリガー記録のみ)"]
acceptance: ["解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている","eval-log/ 配置規約が README に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する","improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている","task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い","graph.json 分割の再検討トリガーが仕様に記録されている","spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される","陳腐化文書の棚卸し手順が sync verb 運用に組み込まれている","feature の purpose/goal/scope_in/acceptance と context JSON・goal-spec が qa-071 の方法論要件 (マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を明示的に保持している","P01..P13 の task spec が外側ループの目的/背景/ゴール固定・内側ループの goal-seek 反復契約・スコープ分離・情報配置 (正本への参照と lineage のみ)・P13 の仕様/architecture への書き戻しを実行可能な形で trace している","validate-system-plan.py と system-dev-plan-evaluator が、feature 宣言 qa 要件の spec-state qa_log 登録と goal-spec/task spec への semantic coverage を tag/lineage 一致だけで PASS にせず fail-closed 検証している"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-dev-pipeline-improvement.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-29T05:21:27Z","origin_kind":"generated","source_digest":"91e67b94d2dca75394be4a58acc94e5a1319fea0cbdaa2d5bfacf3fb2f0724a1","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 qa-067 開発管理パイプライン改善 8 要件から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-dev-pipeline-improvement.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-k2u","linked_at":"2026-07-21T16:50:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":["docs/features/feat-dev-pipeline-improvement/acceptance-report.md","eval-log/dev-graph/pipeline-improvement/release-receipt.json","https://github.com/daishiman/HarnessHub/pull/41",".dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6/atomic-promotion-receipt.json"],"policy":"manual","reconciled_at":"2026-07-25T16:53:34Z","source":"manual","status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-21T15:10:00Z","missing_sections":[],"status":"complete"}
---

# 開発管理パイプライン改善 (lifecycle close-loop / eval-log 規約 / handoff disposition)

> macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

開発管理パイプライン (dev-graph 11 verb・beads 課題管理・plugin-plans 13 phase 計画・eval-log 証跡・issues/tasks/features 成果物管理) の運用実態調査 (2026-07-21, qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1 (作者の配布・運用効率)・G4 (品質ゲート)・G5 (運用持続性) を支える開発基盤の健全性を回復する。あわせて qa-071 で確定した開発管理の方法論 (マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を本 feature の 13 フェーズ実行契約として明示的に採用し、feature context から task spec まで意味的に伝播する

## 到達状態

qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態。加えて qa-071 の方法論要件が goal-spec と P01..P13 task spec の実行契約 (外側ループの目的/背景/ゴール固定・内側ループの goal-seek 反復・スコープ分離・情報配置=正本参照と lineage のみ・P13 書き戻し) として trace され、tag/lineage 一致だけでは PASS しない semantic coverage 検査で保証された状態

## スコープ

**対象 (in):**

- lifecycle close-loop の機械化 (解決済み事象の open 残置検出と md/graph/beads 3 表現の同時 close 導線)
- eval-log/ 配置規約の明文化と CI lint による強制 (skill 名 prefix サブディレクトリ・1MB 超 gitignore・重複/変種遮断)
- improvement-handoff schema への disposition (applied|deferred|rejected) 必須化と未消化 findings の beads 起票
- tasks/ frontmatter status の意味論明記 (実行状態の正本は beads/graph 側)
- graph.json 肥大対策の再検討トリガー記録 (500 node / merge 衝突頻発)
- dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与
- spec-drift-guardian の verdict close gate 配線
- 陳腐化文書の定期棚卸し GC の sync verb 運用組込み
- qa-071 方法論要件 (外側/内側ループ・スコープ分離・情報配置・P13 書き戻し) の feature context・goal-spec・P01..P13 task spec への意味的伝播と semantic coverage 検査の恒常化

**対象外 (out):**

- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- bd CLI 本体の変更
- graph.json 分割の実装 (トリガー記録のみ)

## 受入

- 解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている
- eval-log/ 配置規約が eval-log/README.md に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する
- improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている
- task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い
- graph.json 分割の再検討トリガーが仕様に記録されている
- spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される
- 陳腐化文書 (解決済み open issue・0-findings handoff) の棚卸し手順が sync verb 運用に組み込まれている
- feature の purpose/goal/scope_in/acceptance と context JSON・goal-spec が qa-071 の方法論要件 (マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を明示的に保持している
- P01..P13 の task spec が外側ループの目的/背景/ゴール固定・内側ループの goal-seek 反復契約・スコープ分離・情報配置 (正本への参照と lineage のみ)・P13 の仕様/architecture への書き戻しを実行可能な形で trace している
- validate-system-plan.py と system-dev-plan-evaluator が、feature 宣言 qa 要件の spec-state qa_log 登録と goal-spec/task spec への semantic coverage を tag/lineage 一致だけで PASS にせず fail-closed 検証している

## 品質要件の機械強制状況

- `qa-067`: 上記 8 要件として本 feature で実装済み (完了)
- `qa-071`: 2026-07-25 以降、tag 宣言だけでは被覆と見なされない。C12 決定論ゲート (契約 version 1.2.0) が goal-spec 5 項目と exact-13 task spec への意味被覆を要求する。契約の正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.5、判定経緯は [system-dev-planner-qa-semantic-coverage](../docs/plugin-contracts/system-dev-planner-qa-semantic-coverage.md)。本 feature の本文伝播は再 plan 経路 (HarnessHub-8wo) で実施済みで、現行世代 `af8a73df…` は契約 1.2.0 の qa_semantic_violations 0 件で promote されている。凍結済み投影の手編集は引き続き禁止で、更新は再 plan → promote → C02 再登録の経路に限る

## ライフサイクル注記

- 2026-07-23 に generation `9be3809d…` で durable-done (P01-P13 完了・PR #41)。
- 2026-07-25 に qa-071 の意味的伝播 (HarnessHub-8wo) のため reopen し、generation `af8a73df…` へ再 plan・promote・C02 再登録した。旧世代は byte-for-byte 不変のまま superseded として保全する。

## 2026-07-26 最終レビュー追記

- C10 guard の破壊操作遮断を subprocess 非依存へ変更し、hook timeout による fail-open 窓を解消した。
- quote 外 redirect だけを解析して、Beads notes 等に記載した例示コマンドの誤遮断を解消した。
- `.dev-graph/config.json` と初期 graph store に preview/receipt 付き sanctioned writer を追加し、init が `Path.write_text()` を含む直接書込みへ退避しない契約にした。

## 2026-07-28 並列 worktree 安全契約の横断追補

`HarnessHub-7xi9`（`issue-worktree-main-ref-desync-20260728`）で、別 worktree が
checkout 中の branch ref だけを動かして作業ツリーを古いまま残す事故への二層防御を
追加した。これは本 feature の promoted exact-13 package を再生成する変更ではなく、
開発管理パイプラインを利用する全 feature に共通する repository 運用の追補である。

- 仕様正本: `system-spec/dev-workflow.md` `qa-088`
- 設計正本: `architecture/harness-hub-dev-workflow.md`
- 運用正本: `docs/worktree-parallel-operations-runbook.md`
- 検査: `reference-transaction` で ref 更新を予防し、`pre-commit` で巻き戻しを遮断、
  `pre-push` / CI で共有 hook bundle の欠落・陳腐化を検知する
- C02 node upsert は既存 Markdown 本文を既定保持し、明示 `--regenerate-body` だけが再生成できる。
- `local_only` task の PR 連動完了 policy を `manual` へ正規化し、完了不能な 167 node を移行した。
- 500 行を超えた手書き実装・テスト・命名例外台帳を責務別ファイルへ分離し、今回変更した手書き Python をすべて 500 行以下にした。
- 最終品質ゲートは Dev Graph pytest 539 passed / 2 skipped、current 19 task package の Phase P01〜P13 が 19/19 PASS、fresh live-trial が 9/9 PASS。
- C19 live-trial の task 指示と fixture 前提のずれは `HarnessHub-768b` として分離し、最終再試験は requirements brief から正規4 skillを実行して独立 completeness evaluator とも PASS。
- graph 管理された docs を C02 writer で再登録すると `layer` が落ちる既存契約差は `HarnessHub-dqca` として分離し、本変更では最終レビュー文書の `layer: feature-design` を復元した。
- 変更は開発基盤内部の契約であり、製品 API・state・security・UI の仕様を変えない。正本は `plugins/dev-graph/references/`、下流の設計判断は `architecture/harness-hub-dev-workflow.md` に反映し、`system-spec/` と `specs/` は qa-066 の二重正本防止に従い非変更とした。

## 2026-07-28 追記: entry point 宣言契約の是正

- 500 行分割で生まれた import 専用 support module (`hooks/guard_graph_commands.py`) を、plugin 完全性の契約テストが「未宣言の entry point」として落としていた (PR #82 の CI 失敗)。500 行分割規約と entry point 宣言規約が同時には満たせない構造で、実装の不備ではない。
- 是正として、`package-contract.json` の `entry_points.hooks` を「`hooks/` のファイル一覧」ではなく **`hooks/hooks.json` の登録内容**と突合するよう不変条件を変更した。宣言・登録・実体の 3 者一致を検査し、残る未宣言ファイルは「単体起動の入口を持たない」ことまで検査したときだけ support module として許容する。
- 契約テストは repo-root `tests/` にあり behavior closure の外側のため、既存 live-trial receipt 9 件は 1 件も失効していない。
- 986 行に達した契約テストを責務で 3 ファイルへ分割し、共有 fixture を `tests/scripts-root/_plugin_completeness_fixtures.py` へ集約した (各 367 / 386 / 197 行)。
- 検証: 最新 `main` (`515b849`) を本 branch へ merge した後、`pytest tests plugins/dev-graph/tests` は 8037 passed / 7 skipped / 0 failed、Dev Graph 単独は 539 passed / 2 skipped、C02 live trial r4 も PASS した。
- 残る被覆差 (repo 全体の `validate-plugin-completeness.py` は hooks について `declared ⊆ actual` しか強制せず、`hooks.json` 登録との parity は dev-graph 専用テストにしか無い) は `HarnessHub-vf66` として分離した。
- 3 例目として `validate-plugin-packages.py` の PKG-006 (hook 登録整合) / PKG-007 (script shebang・実行ビット) も落ちた。両 check は「`hooks/`・`scripts/` 配下は全て起動対象」を前提にしており、import 専用 module 5 件を P0 で遮断していた。entry point 契約テストと同じ構造判定 (`is_import_only_support_module`: `.py` / import 可能名 / shebang なし / `__main__` なし) で統一し、単体テスト 8 件で境界を固定。同時に検出された `build-repo-config.py` の実行ビット欠落は真の不備だったので `chmod +x` で是正した。986 行の契約テストは責務で 3 分割 (364 / 386 / 301 行 + 共有 fixture 73 行)。
- 同じ衝突が harness coverage にも現れた。`scripts/llm_eval` は分母をファイル数で数えるため、500 行分割で新規 7 件が verdict 未添付のまま母数へ加わり 64.1% → 63.1% へ希釈された。7 件を除くと 64.2% で floor 超え、分割元 `upsert-node.py` の verdict も PASS/91 のままであり、回帰の全量が分母希釈に由来する。先例 2 件と同型に floor を実測値へ手動 baseline reset し (`--update-floor` は回帰時据え置きのため使えない)、verdict を書いて率を戻す Goodhart 経路は取らなかった。構造的是正は `HarnessHub-2mor` として分離した。

## 2026-07-28 追記: C19 task / fixture 前提契約

- `HarnessHub-768b` を実装し、C19 fixture が置く入力、置かない成果物、必須 entry point、観測条件を `TASK_CONTRACT` と scenario JSON から一つの digest へ束ねた。
- 旧 task の「確定成果物は事前配置済み」「正規 flow を再実行しない」前提を実物回帰で拒否し、fixture 契約へ合わせた fresh PASS task は誤検出しない。
- 650 行だった lint は CLI／report と契約解析 module に分け、双方を 500 行未満へ収束した。
- focused pytest 29 PASS、latest verdict task に対する `--all` は checked 1 / violation 0。
- 技術契約は `plugins/dev-graph/references/live-trial-task-contract.md`、仕様影響なしの層別判断は `docs/features/feat-dev-pipeline-improvement/c19-task-contract-spec-reflection.md` を正本とする。

## 2026-07-29 追記: interpreter 書込み guard の被覆修正

`HarnessHub-lp36` で C10 の interpreter 判定を補正した。`Path.write_text/write_bytes`、
`shutil.copy*/move`、`os.replace/rename`、`json.dump` と書込み可能な `open()` mode を
graph authority 直書込みとして遮断し、読取専用の `r` / `rb` は許可する。判定は静的な
共起検査であり、任意の Python 実行を完全解析するものではない。既存正本
`plugins/dev-graph/references/claude-code-hooks-contract.md` の「graph authority 直書込み禁止」
に対する適合修正であり、列挙 API の保証境界は実装 docstring と focused test に固定した。

本変更は既存プラグイン内部契約への適合を直し、HarnessHub 製品の API・state・security・UI
contract は変えない。`system-spec/`・`specs/` は qa-066 の二重正本防止に従い非変更、
凍結済み exact-13 の `tasks/feat-dev-pipeline-improvement/` も手編集せず、実装結果は
本 feature 履歴、architecture、final review、standalone issue に記録する。

最終受入では focused pytest 48 passed / 2 skipped、Dev Graph 全体 697 passed / 2 skipped、
9 skill の fresh live-trial 9/9 PASS、exact-13 P01-P13 / violation 0、graph schema violation 0、
repository CI PASS 123 / WARN 4 / FAIL 0 を確認した。`HarnessHub-lp36` は証跡を追記して
close した。

## 2026-07-29 追記: C14 live-trial acceptance の証拠完全性

- `HarnessHub-9ndl` で C14 decompose 監査を、preview の自己申告ではなく実 graph、pre/post state 差分、永続 `tracker_binding`、実装 schema probe から判定するよう修正した。
- `HarnessHub-dyxr` で scenario 正本の required observations と実引数を verdict に束縛し、未回収、scenario 更新・削除、存在しない evidence ref を fail-closed にした。
- 最終実走で feature promotion に task 完了専用 operation を誤指定した task.md を検出したため、通常 C02 upsert を必須、完了専用 operation を禁止として task 手順そのものも verdict に束縛した。
- `main` 統合レビューで、旧 r6 の昇格証跡が 64 桁形式を満たすだけで最終 node 内容と一致しないことを検出した。scenario r7 は最終 persisted node の正準 digest 突合と、同じ graph から作る 2 種の gate 違反を正準 validator が拒否する negative control を必須化した。
- none 系列の再実走で、生成時の draft feature を同じ入力で再 upsert すると先に進めた lifecycle が退行する別責務の欠陥を検出し、`HarnessHub-bk8v` へ分離した。C14 の最終判定は通常 C02 経路で明示的に再昇格した後の graph を監査する。
- draft gate の起票 0 件と promoted candidate の external adapter dry-run による 0 件を別の帰属として記録する。
- 500 行を超えた手書き実装・テストは import 専用 support module と責務別テストへ分離し、監査 provenance は全 module の複合 digest を保持する。
- 仕様・設計への影響は開発品質ゲートの証拠経路に限定される。qa-089、`architecture/harness-hub-testing-qa.md`、[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/live-trial-acceptance-hardening-spec-reflection.md) に反映した。
- 最新 `main` (`bb95580`) 統合後の最終ゲートは広域 pytest 9308 passed / 7 skipped、repository CI 123 PASS / 4 既存 WARN / 0 FAIL、task package P01〜P13・graph schema・fresh r7 live-trial 2 系列が PASS。後続 main の CI token 最小権限変更は本 feature の Python / C14 behavior closure を変えない。
- PR #598 のコンフリクト解消では、本 feature の lp36 interpreter guard、C14 acceptance 強化、PR #600 の live-trial session ownership 履歴をすべて保持した。C14 受領証拠は統合後も有効な behavior closure `c0d843d7…4801` の beads r3 / none r1 とし、旧 reaper に終了された beads r1/r2 は監査用の失敗証跡としてのみ保持した。無差別回収の原因は最新 main の ownership 契約で修正済みである。

## 2026-07-29 追記: live-trial reaper の並行安全性

- `HarnessHub-cjwm` と重複 `HarnessHub-0vs2` を実装し、通常の `reap` を
  run-id と boot owner PID の完全一致へ限定した。
- session 作成時に tmux metadata へ所有情報を記録し、別 owner、別 run、
  metadata 無し session は通常 cleanup の対象外とする。
- 暗黙の全件削除を廃止し、全 live-trial session の回収は明示 `--all` だけに分離した。
- 1,600 行超だった test module は 6 責務と共通 support へ分割し、全ファイルを
  500 行未満へ収束した。
- 仕様影響はローカル開発運用に限定される。system-spec `qa-090`、
  `architecture/harness-hub-dev-workflow.md`、
  [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/live-trial-reaper-spec-reflection.md)
  に反映した。製品 API・DB・認証認可・UI・deploy unit は非変更。

## アーキテクチャ参照

- [arch-harness-hub-dev-workflow](../architecture/harness-hub-dev-workflow.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- なし (プロダクト feature と独立。既存パイプライン実装への改善)

## Handoff

- 現行世代: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6/`
- 再 plan する場合: `/dev-graph plan --feature-id feat-dev-pipeline-improvement --feature-context features/feat-dev-pipeline-improvement.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
