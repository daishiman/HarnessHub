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
updated_at: "2026-08-04T07:13:19.802900Z"
status: "active"
depends_on: []
related_nodes: ["issue-audit-followups-20260717","issue-c02-upsert-lifecycle-regression-20260729","issue-id-uniqueness-gate-generalization-20260728","issue-doc-line-limit-followup-mfh7-20260728","issue-register-package-projection-idempotency-drift-20260728"]
resource_scope: ["features/feat-dev-pipeline-improvement.md","system-spec/dev-workflow.md","docs/features/feat-dev-pipeline-improvement/live-trial-evidence-selection-spec-reflection-receipt.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-live-trial-evidence-selection-handoff.md"]
purpose: "開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する。あわせて qa-071 で確定した開発管理の方法論 (マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を本 feature の 13 フェーズ実行契約として明示的に採用し、feature context から task spec まで意味的に伝播する"
goal: "qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態。加えて qa-071 の方法論要件が goal-spec と P01..P13 task spec の実行契約 (外側ループの目的/背景/ゴール固定・内側ループの goal-seek 反復・スコープ分離・情報配置=正本参照と lineage のみ・P13 書き戻し) として trace され、tag/lineage 一致だけでは PASS しない semantic coverage 検査で保証された状態"
scope_in: ["lifecycle close-loop の機械化 (open 残置検出と md/graph/beads 3 表現の同時 close 導線)","eval-log/ 配置規約の明文化と CI lint 強制","improvement-handoff schema への disposition 必須化と未消化 findings の beads 起票","tasks/ frontmatter status の意味論明記","graph.json 肥大対策の再検討トリガー記録","dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与","spec-drift-guardian の verdict close gate 配線","陳腐化文書の定期棚卸し GC の sync verb 運用組込み","qa-071 方法論要件 (外側/内側ループ・スコープ分離・情報配置・P13 書き戻し) の feature context・goal-spec・P01..P13 task spec への意味的伝播と semantic coverage 検査の恒常化"]
scope_out: ["Hub プロダクト本体機能 (Web/API/DB) の変更","dev-graph への新 verb 追加","bd CLI 本体の変更","graph.json 分割の実装 (トリガー記録のみ)"]
acceptance: ["解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている","eval-log/ 配置規約が README に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する","improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている","task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い","graph.json 分割の再検討トリガーが仕様に記録されている","spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される","陳腐化文書の棚卸し手順が sync verb 運用に組み込まれている","feature の purpose/goal/scope_in/acceptance と context JSON・goal-spec が qa-071 の方法論要件 (マクロ構造・exact-13・外側/内側ループ・スコープ分離・情報配置・書き戻し・既存保全と更新統制) を明示的に保持している","P01..P13 の task spec が外側ループの目的/背景/ゴール固定・内側ループの goal-seek 反復契約・スコープ分離・情報配置 (正本への参照と lineage のみ)・P13 の仕様/architecture への書き戻しを実行可能な形で trace している","validate-system-plan.py と system-dev-plan-evaluator が、feature 宣言 qa 要件の spec-state qa_log 登録と goal-spec/task spec への semantic coverage を tag/lineage 一致だけで PASS にせず fail-closed 検証している"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-dev-pipeline-improvement.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-04T07:20:00Z","origin_kind":"generated","source_digest":"5b4d532a90bbeaf7629a84cbea82390934e5c91912eaf0a20f2d0c374ac88bee","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
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

## 変更履歴

> 2026-07-26〜2026-08-01 の差分追記は
> [feat-dev-pipeline-improvement-changelog.md](../docs/features/feat-dev-pipeline-improvement/feat-dev-pipeline-improvement-changelog.md)
> へ分割済み (300 行上限超過による remediation)。新規の差分追記は同ファイルへ追記する。

`HarnessHub-w7n7` では、Beads チョークポイントの CLI を残したまま判定責務を
四つの内部 module へ分離し、`bd-bridge.py` と mfh7 棚卸し文書を各 500 行以下へ
収束させた。製品機能と外部契約は変更せず、詳細は
[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/w7n7-bd-bridge-split-spec-reflection-receipt.md)
を正とする。

`HarnessHub-dc7` では Beads 自由フィールドの書込経路を単一 bridge へ統一した。
製品仕様は変えず、内部設計と検証は
[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/dc7-bd-free-field-write-route-spec-reflection-receipt.md)
を正とする。

`HarnessHub-f84o` では C10 が inline Python の変数・Path 式経由書込みを見逃す穴を、
subprocess 非依存の AST 定数伝播で閉じた。製品 API・DB・認証認可・UI は変えず、
開発品質ゲートの内部契約を `qa-139` / `appr-028` と architecture へ反映した。実装境界、既知の限界、
検証結果は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md)
を正とする。

`HarnessHub-7xi9` の更新時刻診断追補は、`qa-140` の R4-reopen により再確定した。
mtime クラスタは調査開始点に限定し、reflog などの直接証拠で原因を確認する。詳細は
[差分追記ログ](../docs/features/feat-dev-pipeline-improvement/feat-dev-pipeline-improvement-changelog.md)を正とする。

`HarnessHub-0ui0` では、後続 sync が registration 時点の graph digest を古くしても、
node ID・件数・source digest・lineage が一致する登録証拠を失わないよう、`partial` 状態を追加した。
証拠不一致の fail-closed と製品 API・DB・認証認可・UI・deploy unit の非変更は維持し、
詳細は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/render-registration-stale-digest-spec-reflection-receipt.md) を正とする。

## アーキテクチャ参照・機能間依存

- [arch-harness-hub-dev-workflow](../architecture/harness-hub-dev-workflow.md) / 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)
- 機能間依存: なし (プロダクト feature と独立。既存パイプライン実装への改善)

## Handoff

- 現行世代: `.dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6/`。再 plan は `/dev-graph plan --feature-id feat-dev-pipeline-improvement --feature-context features/feat-dev-pipeline-improvement.context.json`、昇格条件は `confirmation_status=confirmed` + `evaluation_status=pass` + `implementation_readiness=complete`。
- 2026-08-02 の C10/C11/C28 authority 防御と Beads 更新経路は qa-138 / appr-027 に再確定し、実装・設計・検証の対応は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/guard-authority-c10-c11-c28-spec-reflection-receipt.md) を正とする。

HarnessHub-xz0u では、C16 schedule が Beads の ready payload に無い着手可能 node を黙って落とさず、ready_payload_entry_absent と source=schedule-graph を持つ unmapped[] として報告するようにした。pre-lease は ready/unmapped、active lease 後は conflicts を加えた和で候補を被覆し、不正な依存形状は停止、dependency 配列順だけの parity 不一致は除く。これは製品 runtime を変えず、開発管理パイプラインの観測可能性（原因を後から判断できる性質）を改善する内部契約である。正規 C01/C03 仕様反映、復旧境界、検証結果は [仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/xz0u-ready-payload-entry-absent-spec-reflection-receipt.md) を正とする。

`HarnessHub-85z0` と `HarnessHub-3tw` では、C11 が specification の必須見出し不在を
`heading_missing` として fail-closed にし、C14 dry-run の stdin preview は未書込み artifact
だけを許容するようにした。既存 specification 2 件を canonical template の全見出しへ移行し、
task / issue の conditional template は `HarnessHub-yzv0` に切り分けた。これは Hub 製品 runtime
を変えず、開発管理パイプラインの入力品質と dry-run の安全性を改善する内部契約である。
C01 `qa-143` / `appr-032`、C02 取得証跡、C03 compile、全層の判断は
[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/c11-heading-presence-preview-spec-reflection-receipt.md)
を正とする。
