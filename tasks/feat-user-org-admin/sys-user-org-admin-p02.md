---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p02.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い TenantCoefficient/User 拡張のスキーマと共通層接続点を確定する P02 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P01"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P02
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P02
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/architecture-decision-record.md"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "architecture"]
target_date: null
template_id: task
template_version: 1.0.0
title: アーキテクチャ設計 — User拡張/TenantCoefficient スキーマ・PII ガード/通知ディスパッチ接続点の設計
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P02 を実行する: アーキテクチャ設計 — User拡張/TenantCoefficient スキーマ・PII ガード/通知ディスパッチ接続点の設計
goal: S17/S18 の画面構成・API 契約・User 拡張 (department/salary) と TenantCoefficient エンティティのカラム設計・PII ガード共通層と通知ディスパッチ共通層への接続点を確定し、P05 実装が迷いなく着手できる設計成果物を作る。
scope_in: ["docs/features/feat-user-org-admin/architecture-decision-record.md"]
scope_out: ["PII ガード共通層・通知ディスパッチ共通層・検査 pipeline 自体の再設計 (feat-hub-foundation が実装 owner。docs/shared-layers.md §5)", "Auth.js アダプタ・認可ミドルウェア自体の設計変更 (feat-auth-tenancy の scope)", "Tenant/Workspace/Project/TargetChannel/Release 等の既存中核エンティティのスキーマ変更 (feat-domain-model-db の scope)", "試算エンジン (annualHours・分/回・削減率を用いた実際の削減時間/削減額計算) の設計 (feat-metrics-tracking の scope。本 feature は係数の保存・管理のみを担う)"]
acceptance: ["docs/features/feat-user-org-admin/architecture-decision-record.md に TenantCoefficient/User 拡張カラム設計とPIIガード/通知ディスパッチ接続点が記載されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# アーキテクチャ設計 — User拡張/TenantCoefficient スキーマ・PII ガード/通知ディスパッチ接続点の設計

> task projection (P02 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-02-architecture.md`

## 依存

- SYS-USER-ORG-ADMIN-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P02)
