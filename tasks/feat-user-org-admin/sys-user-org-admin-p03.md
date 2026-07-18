---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p03.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P02 で確定した TenantCoefficient/User 拡張スキーマと PII ガード/通知ディスパッチ接続点を、設計担当から独立した視点でレビューする P03 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P02"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p03.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P03
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P03
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/design-review-notes.md"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-03-design-review.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "design-review"]
target_date: null
template_id: task
template_version: 1.0.0
title: 独立設計レビュー — role統合・PIIガード・監査拡張の設計妥当性確認
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P03 を実行する: 独立設計レビュー — role統合・PIIガード・監査拡張の設計妥当性確認
goal: P02 で確定した設計 (TenantCoefficient/User 拡張スキーマ、PII ガード適用範囲、通知ディスパッチ接続点、role 認可設計) を P02 の設計担当から独立した視点でレビューし、SEC2/SEC4/SEC6/SEC9 と qa-005/qa-024 への適合を確認する。
scope_in: ["docs/features/feat-user-org-admin/design-review-notes.md"]
scope_out: ["設計そのものの修正実施 (却下時は P02 を再実行対象として差し戻す)", "実装コードの作成", "feat-auth-tenancy/feat-domain-model-db が所有する既存設計のレビュー (本 feature の設計差分のみが対象)"]
acceptance: ["docs/features/feat-user-org-admin/design-review-notes.md に承認可否と SEC2/SEC4/SEC6/SEC9 適合確認結果が明記されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# 独立設計レビュー — role統合・PIIガード・監査拡張の設計妥当性確認

> task projection (P03 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-03-design-review.md`

## 依存

- SYS-USER-ORG-ADMIN-P02

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P03)
