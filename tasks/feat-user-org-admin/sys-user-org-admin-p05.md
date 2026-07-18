---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p05.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: P02 承認設計と P04 テスト設計に基づき S17/S18・User拡張/TenantCoefficient・PIIガード・通知ディスパッチ接続を実装する P05 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P04"]
domain: frontend
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P05
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P05
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["apps/hub/src/app/(dashboard)/users/", "apps/hub/src/app/(dashboard)/account/", "apps/hub/src/features/user-org-admin/", "packages/schemas/user-org-admin/", "packages/db/schema/user-org-admin/"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "implementation"]
target_date: null
template_id: task
template_version: 1.0.0
title: 実装 — S17/S18 画面, User拡張/TenantCoefficient API, PIIガード適用, 通知ディスパッチ接続
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P05 を実行する: 実装 — S17/S18 画面, User拡張/TenantCoefficient API, PIIガード適用, 通知ディスパッチ接続
goal: P02 承認設計と P04 テスト設計に基づき、S17 (ユーザー管理+個別ダッシュボード)・S18 (アカウント設定) の画面、User拡張/TenantCoefficient の API とスキーマ、PII ガードの適用、通知ディスパッチ共通層への接続を実装する。
scope_in: ["apps/hub/src/app/(dashboard)/users/", "apps/hub/src/app/(dashboard)/account/", "apps/hub/src/features/user-org-admin/", "packages/schemas/user-org-admin/", "packages/db/schema/user-org-admin/"]
scope_out: ["PII ガード共通層・通知ディスパッチ共通層自体の実装変更 (feat-hub-foundation の write_scope。本 feature は共通層を呼び出すだけで再実装しない)", "Auth.js アダプタ・認可ミドルウェア自体の実装変更 (feat-auth-tenancy の write_scope)", "Tenant/Workspace/Project/TargetChannel/Release 等の既存中核エンティティ実装 (feat-domain-model-db の write_scope)", "試算エンジン (annualHours・分/回・削減率を用いた実際の削減時間/削減額計算) の実装 (feat-metrics-tracking の scope)", ".github/workflows/ci.yml・wrangler.jsonc・pnpm-workspace.yaml 等の共有リポジトリ設定変更 (feat-hub-foundation の write_scope)"]
acceptance: ["S17/S18 の画面とAPI, User拡張/TenantCoefficientスキーマ, PIIガード適用, 通知ディスパッチ接続が実装され P04 のテストスタブと接続されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# 実装 — S17/S18 画面, User拡張/TenantCoefficient API, PIIガード適用, 通知ディスパッチ接続

> task projection (P05 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-05-implementation.md`

## 依存

- SYS-USER-ORG-ADMIN-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P05)
