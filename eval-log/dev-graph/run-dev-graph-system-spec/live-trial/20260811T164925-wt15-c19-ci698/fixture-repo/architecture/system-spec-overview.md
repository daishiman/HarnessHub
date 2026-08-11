---
graph_node_id: "arch-system-spec-overview"
artifact_kind: "architecture"
artifact_subtypes: ["backend","data","security"]
project_id: "system-spec-import"
domain: "system-spec"
tags: ["system-spec","source-lineage","imported"]
priority: null
start_date: null
target_date: null
iteration: null
title: "system-spec architecture overview"
owners: ["system-spec-harness"]
created_at: "2026-08-11T07:51:07Z"
updated_at: "2026-08-11T07:51:07Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/00-requirements-definition.md","system-spec/completeness-report.json"]
purpose: "確定済み system-spec の architecture context を参照可能にする。"
goal: "仕様由来の architecture context を feature から参照できる状態。"
scope_in: ["confirmed system-spec requirements artifact"]
scope_out: ["confirmed artifacts are not rewritten by this adapter"]
acceptance: ["source lineage と evaluator evidence を保持する","C02 でのみ登録する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/system-spec-overview.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"6d26ebde136373d5956a3ddd866d3ff41d7ff51465d8d8b6f4db815fdc53c4a0","evaluator":"system-spec-harness/assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-11T07:51:07Z","origin_kind":"system-spec-harness","source_digest":"f2f24d652c2a92c9ee11396bcc40d3ed35ea383626ce05c8672b3fc5ce42405d","source_path":"system-spec/00-requirements-definition.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "system-spec-harness が確定した architecture context の import。"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/system-spec-overview.md","confidence":1.0}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-11T07:51:07Z","evidence_refs":["system-spec/completeness-report.json"],"policy":"manual","reconciled_at":"2026-08-11T07:51:07Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-11T07:51:07Z","missing_sections":[],"status":"complete"}
---

# 要件定義書 (上位概念)

## U1 本質的目的 (essential_purpose)
ローカルの TODO を外部へ送らず管理する。

## U2 背景 (background)
外部 SaaS と通信せず再現可能な受入 fixture が必要である。

## U3 ゴール (goals)
認証済み利用者が永続化された TODO を操作できる。

## U4 目標 (objectives)
単一プロセスと単一 SQLite ファイルで動作する。

## U5 成功基準 (success_criteria)
未認証は 401、再起動後も作成済み TODO が取得できる。

## U6 ステークホルダー (stakeholders)
利用者兼運用者 1 名。

## U7 スコープ (scope)
TODO CRUD、token 認証、SQLite 永続化を対象とする。

## U8 制約 (constraints)
localhost のみで外向き通信を行わない。

## U9 具体的にやりたいこと (concrete_intents)
curl から TODO の作成・取得・更新・削除を行う。
