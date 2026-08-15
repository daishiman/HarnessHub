---
graph_node_id: "issue-architect-graph-node-id-lowercase-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-dev-planner","node-id","case"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "architect の graph_node_registration.graph_node_id が小文字で出力される"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:20.030756Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-dev-planner/"]
purpose: "node id の表記ゆれによる突合失敗を防ぐ"
goal: "architect の出力する graph_node_id が canonical な大文字表記 (SYS-...-P01) と一致する状態"
scope_in: ["architect の id 生成の正規化"]
scope_out: ["既存 node の id 変更"]
acceptance: ["registration receipt の id が graph の id と完全一致する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/architect-graph-node-id-lowercase-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"0a29f6cb7aed8ff81771a0920189a8b9585eb30dce155e908251349bb138229f","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "node id の表記ゆれによる突合失敗を防ぐ"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/architect-graph-node-id-lowercase-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ewhw","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

architect の graph_node_registration.graph_node_id が小文字で出力される

## 背景と問題

node id の表記ゆれによる突合失敗を防ぐ

## 現在の挙動

### 内容

`graph_node_registration.graph_node_id` が小文字 (`sys-...-p01`) で出力される一方、graph 側の canonical は大文字 (`SYS-...-P01`)。突合が文字列一致で行われる箇所で失敗する。

## 期待する挙動

architect の出力する graph_node_id が canonical な大文字表記 (SYS-...-P01) と一致する状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - architect の id 生成の正規化
- Out:
  - 既存 node の id 変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] registration receipt の id が graph の id と完全一致する

## 検証証跡

- 対象 path:
- `plugins/system-dev-planner/`
- 証跡 path: eval-log/dev-graph/
