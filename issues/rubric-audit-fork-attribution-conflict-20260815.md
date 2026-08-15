---
graph_node_id: "issue-rubric-audit-fork-attribution-conflict-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["rubric","audit-fork","contract-drift"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "rubric の記述と audit_fork_attribution.py の要求がずれている"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:12.508025Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/scripts/audit_fork_attribution.py"]
purpose: "同一事項について rubric と実装 script が異なる要求を出す状態を解消する"
goal: "rubric の記述と audit_fork_attribution.py:431-437 の要求が一致し、どちらを満たしても他方が FAIL しない状態"
scope_in: ["両者の差分の特定","正本をどちらに置くかの決定と片方の追従"]
scope_out: ["fork 帰属検証の設計変更"]
acceptance: ["rubric どおりに満たした成果物が audit_fork_attribution.py で PASS する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/rubric-audit-fork-attribution-conflict-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"df9cb6e8e2f5f0c940bc4641b10a710d8fc606526637d58ca3c979c13b99ae57","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "同一事項について rubric と実装 script が異なる要求を出す状態を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/rubric-audit-fork-attribution-conflict-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-97bh","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

rubric の記述と audit_fork_attribution.py の要求がずれている

## 背景と問題

同一事項について rubric と実装 script が異なる要求を出す状態を解消する

## 現在の挙動

### 内容

rubric の記述と `audit_fork_attribution.py:431-437` の要求がずれている。契約の正本がどちらか不明なため、片方を満たすともう片方が FAIL しうる。

## 期待する挙動

rubric の記述と audit_fork_attribution.py:431-437 の要求が一致し、どちらを満たしても他方が FAIL しない状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 両者の差分の特定
  - 正本をどちらに置くかの決定と片方の追従
- Out:
  - fork 帰属検証の設計変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] rubric どおりに満たした成果物が audit_fork_attribution.py で PASS する

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/scripts/audit_fork_attribution.py`
- 証跡 path: eval-log/dev-graph/
