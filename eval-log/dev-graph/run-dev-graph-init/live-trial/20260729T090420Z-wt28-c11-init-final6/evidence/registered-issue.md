---
graph_node_id: "sys-init-idempotence-test-20260729"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "wt28-init-final6"
domain: "dev-graph"
tags: ["init-test"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "Init idempotence test fixture issue"
owners: []
created_at: "2026-07-29T09:04:20Z"
updated_at: "2026-07-29T09:04:20Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: []
purpose: "Verify that dev-graph init is idempotent"
goal: "Confirm second init pass reports zero planned changes"
scope_in: ["init idempotence"]
scope_out: ["production use"]
acceptance: ["Second init reports 0 changes"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-init-idempotence-test-20260729.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":null,"origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 1.0
classification_reason: "Explicitly created as test fixture issue"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

# 概要

dev-graph init の冪等性を検証するためのテスト用 issue。二回目の init 実行で planned changes が 0 であること、利用者編集済み template が上書きされないことを確認する。

## 背景と問題

dev-graph init は同一 repository に対して複数回実行される可能性がある。冪等性が保証されない場合、既存の設定やテンプレートが意図せず上書きされる。

## 現在の挙動

初回 init で 6 content root、config、graph store、templates が正常に生成される。

## 期待する挙動

二回目の init 実行で planned changes が 0 件となり、利用者が編集した template の内容が保持される。

## 再現手順またはユースケース

1. 未初期化の Git repository で dev-graph init を実行する
2. template ファイルを編集する
3. 再度 dev-graph init を実行する
4. edited template の SHA-256 が変化していないことを確認する

## 影響と優先度

- 影響範囲: system
- 深刻度: high
- 緊急度: 冪等性の欠如は既存作業の破壊につながる

## スコープ

- In: init の冪等性検証
- Out: 他の dev-graph コマンドの検証

## 関連グラフ

- 原因/親ノード: N/A
- 関連仕様: N/A
- 関連アーキテクチャ: N/A
- 解決タスク: N/A

## 受入条件

- [ ] 二回目 init の planned changes が 0 件
- [ ] 編集済み template の SHA-256 が不変

## 検証証跡

- コマンド/テスト: run-dev-graph-init live-trial C01-OUT1-positive-idempotence-r17
- 証跡 path: eval-log/dev-graph/run-dev-graph-init/live-trial/20260729T090420Z-wt28-c11-init-final6/
