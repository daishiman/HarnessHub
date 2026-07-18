---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p12.md", "confidence": 0.83}]
classification_confidence: 0.83
classification_reason: P11 の evidence bundle を踏まえ、日次 export・四半期 restore drill・migration 積み増し・KEK/DEK ローテーション・audit chain 検証の運用 runbook を作成する P12 ドキュメント/運用タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P11"]
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p12.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P12
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P12
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/runbook.md", "packages/db/cron/"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-12-documentation-operations.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "documentation", "operations"]
target_date: null
template_id: task
template_version: 1.0.0
title: ドキュメント/運用 — 日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーション運用手順の runbook 作成
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P12 を実行する: ドキュメント/運用 — 日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーション運用手順の runbook 作成
goal: 本 feature が owner の運用手順 (日次 export cron、四半期 restore drill、Studio 拡張 feature 向け migration 積み増し手順、encryption_keys の年次 DEK ローテーション/KEK ローテーション手順、audit_events hash chain の日次検証 cron) を runbook.md として整備し、P13 (リリース/デプロイ) での実運用開始に備える。
scope_in: ["docs/features/feat-domain-model-db/runbook.md", "packages/db/cron/"]
scope_out: ["cron 基盤自体の新設 (feat-hub-foundation が既に確立済みの Scheduled Handler 基盤を利用する)", "Studio 拡張 feature 独自の運用手順 (各 feature 自身の P12 が担当)", "tenant_data_objects (qa-045) の restore drill 拡張項目 (本 digest スコープ外)"]
acceptance: ["runbook.md に日次 export・四半期 restore drill・migration 積み増し・KEK/DEK ローテーション・audit chain 検証の 5 手順が過不足なく記載されている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# ドキュメント/運用 — 日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーション運用手順の runbook 作成

> task projection (P12 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-12-documentation-operations.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P11

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P12)
