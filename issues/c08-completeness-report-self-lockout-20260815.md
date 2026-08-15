---
graph_node_id: "issue-c08-completeness-report-self-lockout-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["c08","readiness","lockout"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "C08 の既定 --completeness-report 経路で self-lockout が起きる"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:18.322940Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-dev-planner/scripts/","plugins/system-spec-harness/scripts/"]
purpose: "readiness 判定が自分自身の出力を待って進めなくなる循環を解消する"
goal: "C08 の既定経路で self-lockout が起きず、readiness 判定が単独で完了する状態"
scope_in: ["既定 --completeness-report の解決順序の見直し"]
scope_out: ["completeness evaluator の判定内容の変更"]
acceptance: ["既定引数のみの実行で readiness 判定が完了する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/c08-completeness-report-self-lockout-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"42a7f05617fd1dcfc7a5463164224221053fd195f3493f317bb9ed734d20f437","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "readiness 判定が自分自身の出力を待って進めなくなる循環を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/c08-completeness-report-self-lockout-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ig7z","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

C08 の既定 --completeness-report 経路で self-lockout が起きる

## 背景と問題

readiness 判定が自分自身の出力を待って進めなくなる循環を解消する

## 現在の挙動

### 内容

C08 の readiness 判定が既定で `--completeness-report` を要求するが、その report を作る側が readiness の PASS を前提にしており、既定引数だけでは進めない循環になっている。

## 期待する挙動

C08 の既定経路で self-lockout が起きず、readiness 判定が単独で完了する状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 既定 --completeness-report の解決順序の見直し
- Out:
  - completeness evaluator の判定内容の変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 既定引数のみの実行で readiness 判定が完了する

## 検証証跡

- 対象 path:
- `plugins/system-dev-planner/scripts/`
- `plugins/system-spec-harness/scripts/`
- 証跡 path: eval-log/dev-graph/
