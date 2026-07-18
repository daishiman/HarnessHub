---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p01.md", "confidence": 0.92}]
classification_confidence: 0.92
classification_reason: goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-domain-model-db.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: []
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p01.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P01
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P01
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/requirements-baseline.md"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-01-requirements.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "requirements-baseline"]
target_date: null
template_id: task
template_version: 1.0.0
title: ドメインモデル & control-plane DB (Turso + Drizzle + R2 registry) 要件ベースライン確定
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P01 を実行する: ドメインモデル & control-plane DB (Turso + Drizzle + R2 registry) 要件ベースライン確定
goal: feat-domain-model-db の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (コアドメイン 18 テーブルの Drizzle スキーマ、libSQL/D1 両対応の接続層隔離、R2 content-addressed PackageRegistry、日次 export + 四半期 restore drill、単一 migration 系統) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 9 件が machine-verifiable な baseline 文書として固定される。
scope_in: ["docs/features/feat-domain-model-db/requirements-baseline.md"]
scope_out: ["検査 pipeline のビジネスロジック (owner=feat-publish-pipeline、goal-spec scope_out)", "UI (goal-spec scope_out)", "Studio 拡張テーブル (hearing_sheets/builds/feedbacks/documents/metrics_events/metrics_rollups/ai_jobs/tenant_coefficients/display_code_counters 等) のスキーマ実装 (各 Studio feature が自身の write_scope で実装)", "認可ミドルウェア (owner=feat-auth-tenancy)", "User 基底テーブル owner の最終確定 (本 task は未解決事項の記録のみ。確定判断は P02 で行う)", "tenant_data_objects テーブル (qa-045) の設計・実装 (本 digest スコープ外。本 task は記録のみ)"]
acceptance: ["docs/features/feat-domain-model-db/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 9 件が過不足なく転記されている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# ドメインモデル & control-plane DB (Turso + Drizzle + R2 registry) 要件ベースライン確定

> task projection (P01 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-01-requirements.md`

## 依存

- なし (feature 内の先頭 phase)

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P01)
