---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p09.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: S17/S18と関連APIが既存の共有CI品質ゲートとTenant分離要件に適合していることを横断的に確認するP09タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P08"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p09.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P09
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P09
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/quality-assurance-report.md"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-09-quality-assurance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "quality-assurance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 品質保証 — CI品質ゲート(axe/bundle/Tenant分離/検査pipeline)適合確認
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P09 を実行する: 品質保証 — CI品質ゲート(axe/bundle/Tenant分離/検査pipeline)適合確認
goal: S17/S18 と関連 API が既存の共有 CI 品質ゲート (axe a11y ゼロ違反・bundle 予算・Tenant 分離テスト・検査 pipeline 同値テスト) に適合していることを横断的に確認する。
scope_in: ["docs/features/feat-user-org-admin/quality-assurance-report.md"]
scope_out: ["共有 CI 品質ゲート自体の是正 (feat-hub-foundation の write_scope。不適合が見つかった場合は是正依頼として dev-graph へ差し戻す)", "認可ミドルウェア・Tenant分離の基盤実装変更 (feat-auth-tenancy の scope)"]
acceptance: ["docs/features/feat-user-org-admin/quality-assurance-report.md に共有CI品質ゲート適合確認結果とPIIガード運用readinessが記録されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# 品質保証 — CI品質ゲート(axe/bundle/Tenant分離/検査pipeline)適合確認

> task projection (P09 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-09-quality-assurance.md`

## 依存

- SYS-USER-ORG-ADMIN-P08

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P09)
