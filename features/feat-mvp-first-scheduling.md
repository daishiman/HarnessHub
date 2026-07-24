---
graph_node_id: "feat-mvp-first-scheduling"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["macro-feature","dev-workflow","scheduling","mvp-first","qa-069"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "タスク優先度選定の MVP ファースト化 (目的・背景・MVP 3軸)"
owners: ["daishiman"]
created_at: "2026-07-23T05:00:00Z"
updated_at: "2026-07-23T09:50:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement"]
resource_scope: ["features/feat-mvp-first-scheduling.md"]
purpose: "dev-graph/beads (bd) のタスク優先度選定が品質・本質・再現性を先回りする基準に寄り、いちばん作りたい機能 (MVP) から離れて同じ基盤タスクを繰り返す停滞が起きている (qa-069)。判断軸を「目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの」の3軸へ組み替え、まず作って使って課題をあぶり出す build-use-learn の回転を取り戻す"
goal: "next/schedule と bd ready の着手候補選定が MVP 適合 (今必要な動くものへの直結度) を第一ソートキーとして動作し、品質・再現性強化系タスクは MVP 成立後へ繰り延べられ、同一入力での選定結果が冪等に再現される状態 (既確定 CI/CD・quality gate 要件 qa-066 は維持)"
scope_in: ["feature/task metadata への MVP 判断軸 (目的・背景・MVP 適合度) の表現追加と登録経路","schedule/next の着手候補算出への MVP 適合第一ソートキー導入","bd-bridge ready 候補順序の MVP-first 整合","品質・再現性強化系タスクの MVP 成立後繰り延べ規則","選定理由 (なぜこのタスクが先か) の receipt 出力"]
scope_out: ["bd CLI 本体の変更","CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除","dev-graph への新 verb 追加","既存 task 資産の一括書き換え","Hub プロダクト本体機能 (Web/API/DB) の変更"]
acceptance: ["MVP 適合度を持つ task と品質先行 task が混在する入力で、next が MVP 適合 task を先に選定する","同一入力で next を再実行しても選定 batch と順序が一致する (冪等)","MVP 判断軸 metadata を持つ node が validate-graph-schema.py PASS で登録できる","選定 receipt に 目的・背景・MVP 適合の判断根拠が記録される","qa-066 由来の既存品質ゲートの検査が非退行である"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-mvp-first-scheduling.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-mvp-first-scheduling/55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-23T05:00:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 qa-069 タスク優先度選定 MVP ファースト化から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-mvp-first-scheduling.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6gl","linked_at":"2026-07-23T08:22:25Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-23T06:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

dev-graph/beads (bd) のタスク優先度選定は、品質・本質・再現性を先回りする基準で AI が文脈から優先度を決めており、「本質的なシステムを作り上げること」が最優先になって同じ基盤タスクを繰り返し、依存関係でつながった他タスクまで止まり、いちばん作りたかった機能 (MVP) から離れる停滞が起きている (qa-069)。根本原因は品質と再現性を求めすぎる完璧主義がスケジューラの優先度に転写されたこと。判断軸を「目的=何のために作るか / 背景=どういう経緯で必要になったか / MVP=今必要な動くもの」の3軸へ組み替え、まず作って、使って、課題をあぶり出す build-use-learn の回転を取り戻す。

## 到達状態

next/schedule と bd ready の着手候補選定が MVP 適合 (今必要な動くものへの直結度) を第一ソートキーとして動作し、品質・再現性強化系タスクは MVP 成立後へ繰り延べられ、同一入力での選定結果が冪等 (何度実行しても同じ結果) に再現される状態。既確定の CI/CD・quality gate 要件 (qa-066) は維持する。

## スコープ

- スコープ内: feature/task metadata への MVP 判断軸 (目的・背景・MVP 適合度) の表現追加と登録経路
- スコープ内: schedule/next の着手候補算出への MVP 適合第一ソートキー導入
- スコープ内: bd-bridge ready 候補順序の MVP-first 整合
- スコープ内: 品質・再現性強化系タスクの MVP 成立後繰り延べ規則
- スコープ内: 選定理由 (なぜこのタスクが先か) の receipt 出力
- スコープ外: bd CLI 本体の変更
- スコープ外: CI/CD・quality gate 要件 (qa-066) 自体の緩和・削除
- スコープ外: dev-graph への新 verb 追加
- スコープ外: 既存 task 資産の一括書き換え
- スコープ外: Hub プロダクト本体機能 (Web/API/DB) の変更

## 受入

- [ ] MVP 適合度を持つ task と品質先行 task が混在する入力で、next が MVP 適合 task を先に選定する
- [ ] 同一入力で next を再実行しても選定 batch と順序が一致する (冪等)
- [ ] MVP 判断軸 metadata を持つ node が validate-graph-schema.py PASS で登録できる
- [ ] 選定 receipt に 目的・背景・MVP 適合の判断根拠が記録される
- [ ] qa-066 由来の既存品質ゲートの検査が非退行である

## アーキテクチャ参照

- `architecture_refs`: arch-harness-hub-dev-workflow

## 機能間依存

- `depends_on`: (なし)
- 依存理由: 本 feature は scheduling の選定基準変更のみを扱い、他 feature の完了を前提としない。feat-dev-pipeline-improvement とは related (同じ dev-workflow 基盤) だが順序依存はない。

## Handoff

- 次工程: `/dev-graph plan --feature-id feat-mvp-first-scheduling --feature-context features/feat-mvp-first-scheduling.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
