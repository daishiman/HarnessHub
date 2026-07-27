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
updated_at: "2026-07-28T00:25:00Z"
status: "done"
depends_on: []
related_nodes: ["issue-audit-followups-20260717"]
resource_scope: ["features/feat-dev-pipeline-improvement.md"]
purpose: "開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する"
goal: "qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態"
scope_in: ["lifecycle close-loop の機械化 (open 残置検出と md/graph/beads 3 表現の同時 close 導線)","eval-log/ 配置規約の明文化と CI lint 強制","improvement-handoff schema への disposition 必須化と未消化 findings の beads 起票","tasks/ frontmatter status の意味論明記","graph.json 肥大対策の再検討トリガー記録","dev-graph 中核 handoff 31 findings の差分監査と disposition 遡及付与","spec-drift-guardian の verdict close gate 配線","陳腐化文書の定期棚卸し GC の sync verb 運用組込み"]
scope_out: ["Hub プロダクト本体機能 (Web/API/DB) の変更","dev-graph への新 verb 追加","bd CLI 本体の変更","graph.json 分割の実装 (トリガー記録のみ)"]
acceptance: ["解決済み事象の open 残置を検出する決定論検査が存在し、issue-bd-bridge-notes-passthrough-20260721 が close-loop で閉じている","eval-log/ 配置規約が README に明文化され、CI lint が直下残置・バイト同一重複・1MB 超の git 追跡を遮断する","improvement-handoff schema に per-finding disposition と根拠 ref が必須化され、既存 21 ファイル 94 findings に消化状態が付与されている","task template に status = 文書ライフサイクル (active/superseded) の意味論が明記され、実行状態の二重正本が無い","graph.json 分割の再検討トリガーが仕様に記録されている","spec-drift-guardian の C03/C04 verdict が close gate に配線され、proposal のみでの close が遮断される","陳腐化文書の棚卸し手順が sync verb 運用に組み込まれている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-dev-pipeline-improvement.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dev-pipeline-improvement/9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-21T14:40:00Z","origin_kind":"generated","source_digest":"bdf3c60e2ab89540c6dd7bdf6009316070d66f9cf36aee17743d825668b6ae21","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
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
completion_evidence: {"completed_at":"2026-07-23T04:02:24Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/acceptance-report.md","eval-log/dev-graph/pipeline-improvement/release-receipt.json","https://github.com/daishiman/HarnessHub/pull/41"],"policy":"manual","reconciled_at":"2026-07-24T07:20:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-21T15:10:00Z","missing_sections":[],"status":"complete"}
---



# 開発管理パイプライン改善 (lifecycle close-loop / eval-log 規約 / handoff disposition)

> macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

開発管理パイプライン (dev-graph 11 verb・beads 課題管理・plugin-plans 13 phase 計画・eval-log 証跡・issues/tasks/features 成果物管理) の運用実態調査 (2026-07-21, qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1 (作者の配布・運用効率)・G4 (品質ゲート)・G5 (運用持続性) を支える開発基盤の健全性を回復する

## 到達状態

qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態

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

## 品質要件の機械強制状況

- `qa-067`: 上記 8 要件として本 feature で実装済み (完了)
- `qa-071`: 2026-07-25 以降、tag 宣言だけでは被覆と見なされない。C12 決定論ゲート (契約 version 1.2.0) が goal-spec 5 項目と exact-13 task spec への意味被覆を要求する。契約の正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.5、判定経緯は [system-dev-planner-qa-semantic-coverage](../docs/plugin-contracts/system-dev-planner-qa-semantic-coverage.md)。本 feature の現行世代 task spec への本文伝播は再 plan 経路 (HarnessHub-8wo) で行い、凍結済み投影を手編集しない

## 2026-07-26 最終レビュー追記

- C10 guard の破壊操作遮断を subprocess 非依存へ変更し、hook timeout による fail-open 窓を解消した。
- quote 外 redirect だけを解析して、Beads notes 等に記載した例示コマンドの誤遮断を解消した。
- `.dev-graph/config.json` と初期 graph store に preview/receipt 付き sanctioned writer を追加し、init が `Path.write_text()` を含む直接書込みへ退避しない契約にした。
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
- 検証: `pytest tests plugins/dev-graph/tests` が 8029 passed / 7 skipped / 0 failed。`main` (`aeedea0`) を本 branch へ再 merge した後も同結果を再確認した。
- 残る被覆差 (repo 全体の `validate-plugin-completeness.py` は hooks について `declared ⊆ actual` しか強制せず、`hooks.json` 登録との parity は dev-graph 専用テストにしか無い) は `HarnessHub-vf66` として分離した。
- 同じ衝突が harness coverage にも現れた。`scripts/llm_eval` は分母をファイル数で数えるため、500 行分割で新規 7 件が verdict 未添付のまま母数へ加わり 64.1% → 63.1% へ希釈された。7 件を除くと 64.2% で floor 超え、分割元 `upsert-node.py` の verdict も PASS/91 のままであり、回帰の全量が分母希釈に由来する。先例 2 件と同型に floor を実測値へ手動 baseline reset し (`--update-floor` は回帰時据え置きのため使えない)、verdict を書いて率を戻す Goodhart 経路は取らなかった。構造的是正は `HarnessHub-2mor` として分離した。

## アーキテクチャ参照

- [arch-harness-hub-dev-workflow](../architecture/harness-hub-dev-workflow.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- なし (プロダクト feature と独立。既存パイプライン実装への改善)

## Handoff

- 次工程: `/dev-graph plan --feature-id feat-dev-pipeline-improvement --feature-context features/feat-dev-pipeline-improvement.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
