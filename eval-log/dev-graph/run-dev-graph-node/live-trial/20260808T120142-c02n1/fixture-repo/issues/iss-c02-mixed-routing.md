---
graph_node_id: "iss-c02-mixed-routing"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "c02fix"
domain: "dev-workflow"
tags: ["live-trial","c02-out1","issue"]
priority: null
start_date: null
target_date: null
iteration: null
title: "混在バッチ登録で issue が canonical root へ routing されない懸念"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T03:10:03Z"
updated_at: "2026-08-08T03:11:48.818836Z"
status: "draft"
depends_on: []
related_nodes: ["spec-c02-mixed-batch-contract","arch-c02-writer-boundary","task-c02-verify-mixed-routing","doc-c02-mixed-batch-runbook"]
resource_scope: ["issues/iss-c02-mixed-routing.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/iss-c02-mixed-routing.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T03:10:03Z","origin_kind":"manual","source_digest":"db95e0994a17f656d563447b0d7398f43cff896ba1081cfec061711e06001ad8","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "背景/事象/期待の3節構成で観測済みの懸念を追跡する形であり issue へ写像した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/iss-c02-mixed-routing.md","confidence":0.99},{"artifact_kind":"task","candidate_path":"tasks/iss-c02-mixed-routing.md","confidence":0.18}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T03:10:03Z","missing_sections":[],"status":"complete"}
---

# 概要

混在バッチ (issue/task/specification/architecture/document 各1件) を 1 回で登録したとき、各成果物が kind ごとの canonical content root へ決定論的に routing されるかが実走で未検証である。

## 背景と問題

C02 の単一 writer が issue/task/specification/architecture/document の混在入力を 1 バッチで受けたとき、各成果物が kind ごとの canonical content root へ決定論的に振り分けられるかを実走で確認する必要がある。fork acceptance の合成入力では 1 kind ずつしか通しておらず、混在時の routing 実挙動が残課題として残っている。

## 現在の挙動

混在バッチの登録経路は fork acceptance では観測できず、routing の実挙動が未検証のまま残っている。graph.json は空 (graph_revision=0, nodes=[]) で、6 つの content root だけが初期化されている状態から観測を開始する。

## 期待する挙動

issue は issues/ 配下へ保存され、frontmatter の kind と保存 path が一致する。同時に task は tasks/、specification は specs/、architecture は architecture/、document は docs/ へ保存され、features/ には何も生成されない。

## 再現手順またはユースケース

1. dev-graph 初期化済み repository で mixed-artifacts.json (5 kind 各1件) を用意する。
2. run-dev-graph-node の add で 5 件を登録する。
3. 各 artifact の保存 path と graph.json の file_path を突き合わせる。

## 影響と優先度

- 影響範囲: dev-graph を使う全 caller repository の成果物配置と graph 整合
- 深刻度: high (誤 routing は graph と実ファイルの二重正本を生む)
- 緊急度: C02 OUT1 の live-trial 判定に直結するため本 run 内で確認する

## スコープ

- In: 5 kind の routing 実測、連続更新後の frontmatter kind と保存 path の一致、features/ 非生成の確認
- Out: Beads/GitHub 同期、exact-13 package 登録、render/schedule 経路

## 関連グラフ

- 原因/親ノード: iss-c02-mixed-routing
- 関連仕様: spec-c02-mixed-batch-contract
- 関連アーキテクチャ: arch-c02-writer-boundary
- 解決タスク: task-c02-verify-mixed-routing

## 受入条件

- [ ] 5 件すべてが kind に対応する canonical root 直下へ保存されている
- [ ] graph.json の file_path と実ファイル path が 5 件とも一致する
- [ ] features/ 配下に新規ノードが 0 件である

## 検証証跡

- コマンド/テスト: `python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json`
- 証跡 path: .dev-graph/state/graph.json および各 content root の Markdown 実体
