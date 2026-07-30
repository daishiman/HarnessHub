---
graph_node_id: "arch-todo-api-system"
artifact_kind: "architecture"
artifact_subtypes: ["backend","infrastructure","security"]
project_id: "todo-api"
domain: "architecture"
tags: ["system-spec","architecture","todo-api"]
priority: null
start_date: null
target_date: null
iteration: null
title: "TODO REST API システムアーキテクチャ"
owners: []
created_at: "2026-07-29T08:30:59Z"
updated_at: "2026-07-29T08:30:59Z"
status: "draft"
depends_on: ["spec-todo-api-requirements"]
related_nodes: []
resource_scope: ["architecture/arch-todo-api-system.md"]
purpose: "TODO REST API のバックエンド・インフラ・セキュリティアーキテクチャ定義"
goal: "FastAPI + SQLite + ローカル bearer token による 3 層 REST API アーキテクチャ"
scope_in: ["router/service/repository 3層","SQLite永続化","bearer token認証","localhost固定"]
scope_out: ["フロントエンド","外部通信","複数ユーザー"]
acceptance: ["3層分離が実装に反映","認証がミドルウェアとして全エンドポイントに適用"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/arch-todo-api-system.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"14cc8f85e4b9984abe58140abd346181f57c864e414fee504fef6f13bcc52f1b","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-07-29T08:30:59Z","origin_kind":"system-spec-harness","source_digest":"14cc8f85e4b9984abe58140abd346181f57c864e414fee504fef6f13bcc52f1b","source_path":"system-spec/backend.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "system-spec-harness confirmed backend/infrastructure/security architecture import"
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

# TODO REST API システムアーキテクチャ

## 概要

FastAPI + SQLite + ローカル bearer token による 3 層 REST API アーキテクチャ。

## 上位概念トレース

- **source**: `system-spec/backend.md` (system-spec-harness confirmed)
- **goals**: G2 (認証), G3 (永続化)

## アーキテクチャ構成

- **API 層**: FastAPI (ASGI) + uvicorn, `/todos` CRUD + `/health`
- **認証層**: bearer token 認証 (ミドルウェア), localhost (127.0.0.1) 固定
- **永続化層**: SQLite `todo.db`, `todos` + `api_tokens` テーブル
- **層構造**: router / service / repository の 3 層分離
