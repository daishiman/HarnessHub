---
graph_node_id: "spec-todo-api-requirements"
artifact_kind: "specification"
artifact_subtypes: ["api","backend","data"]
project_id: "todo-api"
domain: "requirements"
tags: ["system-spec","requirements","todo-api"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ローカル専用 TODO REST API 仕様"
owners: []
created_at: "2026-07-29T08:30:59Z"
updated_at: "2026-07-29T08:30:59Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["specs/spec-todo-api-requirements.md"]
purpose: "ローカル専用 TODO REST API の要件定義 (U1-U9 上位概念 + 8 カテゴリ確定仕様)"
goal: "自分の TODO を外部サービスに依存せず手元の 1 プロセスで管理・自動化する"
scope_in: ["認証","TODO CRUD","SQLite永続化","localhost HTTP提供"]
scope_out: ["GUI実装","複数ユーザー共有","外部同期","クラウド配備"]
acceptance: ["未認証要求で全 TODO エンドポイント 401","作成→再起動→一覧取得で TODO が戻る","外部送信 0 件"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/spec-todo-api-requirements.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7e3732f5b155cd85fd21b6a6119411a8f9f14be96f254ec4ac9a794e2ef95551","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-07-29T08:30:59Z","origin_kind":"system-spec-harness","source_digest":"7e3732f5b155cd85fd21b6a6119411a8f9f14be96f254ec4ac9a794e2ef95551","source_path":"system-spec/00-requirements-definition.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "system-spec-harness confirmed requirements definition import"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-29T08:30:59Z","missing_sections":[],"status":"complete"}
---

# ローカル専用 TODO REST API 仕様

## 概要

ローカル専用の TODO REST API。認証、TODO の CRUD、SQLite への永続化を持ち、外部 network への通信は一切行わない。

## 上位概念トレース

- **source**: `system-spec/00-requirements-definition.md` (system-spec-harness confirmed)
- **goals**: G1 (外部通信0), G2 (認証必須), G3 (永続化), G4 (1コマンド起動)

## 技術選定

- 永続化: SQLite (D1)
- API framework: FastAPI (D2)
- 認証: ローカル bearer token (D3)
