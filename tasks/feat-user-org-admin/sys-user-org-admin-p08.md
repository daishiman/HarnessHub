---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p08.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: User テーブルへの department/salary 列追加と TenantCoefficient 新規テーブルの migration 適用・後方互換性確認を行う P08 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P07"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P08
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P08
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["packages/db/schema/user-org-admin/", "docs/features/feat-user-org-admin/refactoring-migration-note.md"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "refactoring-migration"]
target_date: null
template_id: task
template_version: 1.0.0
title: リファクタリング/マイグレーション — 新規列・新規テーブルのmigration適用と後方互換性確認
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P08 を実行する: リファクタリング/マイグレーション — 新規列・新規テーブルのmigration適用と後方互換性確認
goal: User テーブルへの department/salary 列追加と TenantCoefficient 新規テーブルの migration を本番相当の接続層に適用し、既存 User 行に対する後方互換性を確認する。
scope_in: ["packages/db/schema/user-org-admin/", "docs/features/feat-user-org-admin/refactoring-migration-note.md"]
scope_out: ["Tenant/Workspace/Project/TargetChannel/Release 等の既存中核エンティティの migration (feat-domain-model-db の scope)", "User テーブルの基底スキーマ (department/salary 以外の既存列) の変更", "R2 export・restore drill 手順自体の変更 (feat-hub-foundation/feat-domain-model-db の scope)"]
acceptance: ["docs/features/feat-user-org-admin/refactoring-migration-note.md にmigration適用結果と既存User行への後方互換性確認結果が記録されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# リファクタリング/マイグレーション — 新規列・新規テーブルのmigration適用と後方互換性確認

> task projection (P08 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-USER-ORG-ADMIN-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P08)
