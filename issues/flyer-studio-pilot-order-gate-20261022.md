---
graph_node_id: "issue-flyer-studio-pilot-order-gate-20261022"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","flyer-studio","pilot","gate"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "flyer-studio: 先行試作(pilot)の独立PASS前に残り案へ展開した順序違反を機械検査で止める"
owners: ["daishiman"]
created_at: "2026-10-22T13:00:57Z"
updated_at: "2026-10-25T01:45:24.387393Z"
status: "draft"
depends_on: []
related_nodes: ["doc-flyer-studio-final-review-spec-reflection-20261025","task-flyer-studio-final-integration-20261025"]
resource_scope: ["plugins/flyer-studio/scripts/analysis.cjs","plugins/flyer-studio/schemas/analysis.schema.json","plugins/flyer-studio/tests"]
purpose: "analysis.executionPlan の先行試作（pilot＝一部の案だけで先に処方を試すこと）について、機械検査は「pilot が既存案の真部分集合か」「選んだ理由と展開方法が書かれているか」だけを見ている。pilot の独立レビュー PASS より前に残りの案へ処方を広げても、機械では止まらない。"
goal: "propagation 対象案の再制作が、pilot 案の独立 PASS（同じ画像 SHA に結び付いた判定）より前に行われた場合、検査が非 0 終了する。"
scope_in: ["visual-review.json の案ごと pngSha256 と再制作の記録を突き合わせる検査","EVALS.json PILOT ケースの「順序は独立評価で確認」を機械検査に格上げ"]
scope_out: ["pilot の選び方そのものの自動決定","小さな修正で executionPlan を省く運用の禁止"]
acceptance: ["pilot の独立 PASS 前に propagation 対象案を再制作した記録があると検査が非 0 終了する","pilot PASS 後の展開は通る","executionPlan を省いた小修正は従来どおり通る","異常系の試験が tests に追加されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/flyer-studio-pilot-order-gate-20261022.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-10-22T13:00:57Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "flyer-studio への v13 品質層反映で残った追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/flyer-studio-pilot-order-gate-20261022.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-h9ah","linked_at":"2026-10-22T13:13:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-10-22T14:18:34Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/flyer-studio-final-review-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-10-25T00:00:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-10-22T13:00:57Z","missing_sections":[],"status":"complete"}
---

# 概要

analysis.executionPlan の先行試作（pilot＝一部の案だけで先に処方を試すこと）について、機械検査は「pilot が既存案の真部分集合か」「選んだ理由と展開方法が書かれているか」だけを見ている。pilot の独立レビュー PASS より前に残りの案へ処方を広げても、機械では止まらない。

## 背景と問題

v13 では「提案→1案で試作→独立レビュー→残りへ展開」の順で品質を上げていた。flyer-studio へ反映した際、順序そのものは独立評価で確認する扱いにし、EVALS.json の PILOT ケースにもそう書いた。全案へ一斉に同じ処方を当てると、案ごとの長所が均されるおそれがある。

## 現在の挙動

- `plugins/flyer-studio/scripts/analysis.cjs` は pilotVariantIds が案の真部分集合か、reason/propagation が空でないかを検査する。
- pilot 案の visual-review PASS と、残り案の再制作の前後関係は検査しない。

## 期待する挙動

propagation 対象案の再制作が、pilot 案の独立 PASS（同じ画像 SHA に結び付いた判定）より前に行われた場合、検査が非 0 終了する。

## 再現手順またはユースケース

1. executionPlan で pilotVariantIds=[F01] を指定した analysis を用意する。
2. F01 の visual-review が PASS になる前に F02 以降を再制作する。
3. 現行の検査が通ってしまうことを確認する。

## 影響と優先度

- 影響範囲: plugins/flyer-studio
- 深刻度は中。v13 の「試作してから展開」が独立評価頼みのままで、評価者が見落とすと全案が同時に崩れる。

## スコープ

- In: visual-review.json の案ごと pngSha256 と再制作の記録を突き合わせる検査、EVALS.json PILOT ケースの「順序は独立評価で確認」を機械検査に格上げ
- Out: pilot の選び方そのものの自動決定、小さな修正で executionPlan を省く運用の禁止

## 関連グラフ

- 原因/親ノード: なし（flyer-studio への v13 反映の残作業）
- 関連仕様: `plugins/flyer-studio/references/review-rubric.md`・`plugins/flyer-studio/references/style-profiles.md`
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue の実装時に作成する

## 受入条件

- pilot の独立 PASS 前に propagation 対象案を再制作した記録があると検査が非 0 終了する。
- pilot PASS 後の展開は通る。
- executionPlan を省いた小修正は従来どおり通る。
- 異常系の試験が tests に追加されている。

## 検証証跡

- 起票元: flyer-studio へ v13 の品質層を反映した作業の残作業
- 実装後の証跡: 試験結果と検査の終了コードを本 issue の notes に記録する


## 2026-10-25 完了反映

上記は起票時点の記録。Beads h9ah は 2026-10-22T14:18:34Z に受入4件・試験・配布前検査・plugin検証を根拠にclosed。render前にassertPilotOrderで拒否し、fingerprint・画像SHA・規範hashを再検証する。詳細は最終統合受領書へ接続する。
