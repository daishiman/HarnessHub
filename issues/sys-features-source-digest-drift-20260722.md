---
graph_node_id: "issue-features-source-digest-drift-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["dev-graph","source-lineage","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "features 14 件の source_digest が現行 source 実体と不一致 (既存 drift) の追随"
owners: ["daishiman"]
created_at: "2026-07-22T23:04:59Z"
updated_at: "2026-07-23T10:24:33.032661Z"
status: "draft"
depends_on: []
related_nodes: ["spec-harness-hub-requirements"]
resource_scope: ["features/","plugins/dev-graph/scripts/upsert-node.py","plugins/dev-graph/scripts/validate-source-digest.py"]
purpose: "features/feat-*.md 14 件の source_lineage.source_digest (a4c26b6d…) が import 時点の specs/harness-hub-system-specification.md の姿のまま残り、現行実体 digest (56c60159…) と不一致の既存 drift になっている。validate-source-digest.py は registered_this_run のみ検査するため既存 node の drift は検出されず、lineage の追跡性が劣化している。"
goal: "features 14 件の source_lineage が現行 source 実体へ追随済みで、source 変更が feature の意味に影響する場合は再 import 経路へ差し戻されている"
scope_in: ["source (specs/harness-hub-system-specification.md) の変更内容が各 feature の意味に影響するかの判定","影響なしの feature の lineage refresh (source_digest 実測更新) を正規 writer upsert-node.py patch で実施","影響ありの feature の再 import 経路への差し戻し"]
scope_out: ["sha 手書換での digest 合わせ (偽装として禁止)","validate-source-digest.py の検査範囲拡張 (別課題)","t9q の R3 再 import 対象 (spec-harness-hub-requirements / arch-harness-hub-infrastructure)"]
acceptance: ["features 14 件の source_digest が実測値と一致するか、再 import 差し戻しの記録がある","digest 更新は upsert-node.py patch 経由のみで行われている","意味影響の判定根拠が本 issue に記録されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-features-source-digest-drift-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T23:04:59Z","origin_kind":"manual","source_digest":null,"source_path":"specs/harness-hub-system-specification.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-t9q の lineage 調査 (2026-07-22、全 215 artifact 突合) で観測した features 14 件の source_digest 既存 drift を追跡する follow-up issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-features-source-digest-drift-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5kh","linked_at":"2026-07-23T10:11:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-22T23:04:59Z","missing_sections":[],"status":"complete"}
---

# 概要

<問題または要望を一文で記載>

## 背景と問題

<誰が、どの状況で、何に困っているか>

## 現在の挙動

<観測事実。再現不能の場合はその旨と理由>

## 期待する挙動

<解決後に観測できる状態>

## 再現手順またはユースケース

1. <step>

## 影響と優先度

- 影響範囲: <users/data/system>
- 深刻度: <critical|high|medium|low>
- 緊急度: <理由>

## スコープ

- In: <対象>
- Out: <非対象>

## 関連グラフ

- 原因/親ノード: <graph_node_id>
- 関連仕様: <graph_node_id>
- 関連アーキテクチャ: <graph_node_id>
- 解決タスク: <graph_node_id>

## 受入条件

- [ ] <観測可能な結果>

## 検証証跡

- コマンド/テスト: <how-to-verify>
- 証跡 path: <path-or-url>
