---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p09.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P08 の migration 確立後、CI 品質ゲート (テナント分離 CI 必須・接続層隔離検査・secret scan・単一 migration 系統維持) を確認する P09 品質保証タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P08"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p09.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P09
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P09
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/quality-assurance-report.md", "packages/db/scripts/"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-09-quality-assurance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "quality-assurance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 品質保証 — CI 品質ゲート (tenant 分離・接続層隔離・secret scan・schema-driven 分離テスト網羅) の確認
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P09 を実行する: 品質保証 — CI 品質ゲート (tenant 分離・接続層隔離・secret scan・schema-driven 分離テスト網羅) の確認
goal: docs/security-spec.md §8 が定める CI 品質ゲートのうち本 feature に該当する項目 (テナント分離テストの CI 必須化、リポジトリ層以外からの DB 直接アクセス禁止の静的検査、secret scan、schema 追加時の分離テスト網羅性チェック) を実装・確認し、quality-assurance-report.md として記録する。
scope_in: ["docs/features/feat-domain-model-db/quality-assurance-report.md", "packages/db/scripts/"]
scope_out: ["Studio 拡張 feature 独自の CI ゲート追加 (各 feature 自身の P09 が担当)", "認可ミドルウェアの CI ゲート (owner=feat-auth-tenancy)", "tenant_data_objects (qa-045) 関連の品質ゲート (本 digest スコープ外)"]
acceptance: ["quality-assurance-report.md に CI 品質ゲート (テナント分離・接続層隔離・secret scan・単一 migration 系統維持) の全項目 pass が記載されている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# 品質保証 — CI 品質ゲート (tenant 分離・接続層隔離・secret scan・schema-driven 分離テスト網羅) の確認

> task projection (P09 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-09-quality-assurance.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P08

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P09)
