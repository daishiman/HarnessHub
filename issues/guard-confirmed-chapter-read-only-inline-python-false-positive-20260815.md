---
graph_node_id: "issue-guard-confirmed-chapter-read-only-inline-python-false-positive-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["hook","false-positive","guard"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "guard-confirmed-chapter-overwrite.py が read-only の inline python を誤爆する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:20.451670Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/hooks/guard-confirmed-chapter-overwrite.py"]
purpose: "読み取りだけの操作が確定章保護 hook に遮断される状態を解消する"
goal: "read-only の inline python が遮断されず、書込経路だけが遮断される状態"
scope_in: ["hook の書込判定の精緻化"]
scope_out: ["確定章保護そのものの緩和"]
acceptance: ["read-only fixture が通り、書込 fixture が遮断される回帰テストが green"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/guard-confirmed-chapter-read-only-inline-python-false-positive-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"aeb6f9e66834ea970c44a8524f40b3d204e2229b9713c63a1572d7e671c17609","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "読み取りだけの操作が確定章保護 hook に遮断される状態を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/guard-confirmed-chapter-read-only-inline-python-false-positive-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-qmb5","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

guard-confirmed-chapter-overwrite.py が read-only の inline python を誤爆する

## 背景と問題

読み取りだけの操作が確定章保護 hook に遮断される状態を解消する

## 現在の挙動

### 内容

確定章を読むだけの inline python (`python3 - <<PY` で `json.load` するだけ) が、確定章の上書きとして遮断される。fail-closed 方向の誤爆なので危険ではないが、調査作業を止める。

### 関連

[[#25 guard-graph-schema.py が graph.json read のみの inline python を遮断]] と同型。

## 期待する挙動

read-only の inline python が遮断されず、書込経路だけが遮断される状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - hook の書込判定の精緻化
- Out:
  - 確定章保護そのものの緩和

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] read-only fixture が通り、書込 fixture が遮断される回帰テストが green

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/hooks/guard-confirmed-chapter-overwrite.py`
- 証跡 path: eval-log/dev-graph/
