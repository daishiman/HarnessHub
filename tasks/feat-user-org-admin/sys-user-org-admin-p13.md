---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p13.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: P12のrunbookに従いS17/S18を既存Workerへ本番反映しロールアウト後スモークチェックを行うP13タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P12"]
domain: operations
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p13.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P13
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P13
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/release-notes.md"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-13-release-deploy.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "release-deploy"]
target_date: null
template_id: task
template_version: 1.0.0
title: リリース/デプロイ — S17/S18のCloudflare Workers本番反映とロールアウト確認
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P13 を実行する: リリース/デプロイ — S17/S18のCloudflare Workers本番反映とロールアウト確認
goal: P12 の runbook に従い、feat-hub-foundation が確立した既存 Worker (apps/hub) へ S17/S18 とその API・スキーマを本番反映し、salary 非露出のロールアウト後スモークチェックを実施する。
scope_in: ["docs/features/feat-user-org-admin/release-notes.md"]
scope_out: ["共有デプロイパイプライン設定 (.github/workflows/ci.yml, wrangler.jsonc) の変更 (feat-hub-foundation の write_scope)", "新規 Worker・新規デプロイ単位の作成 (既存 apps/hub Worker への機能追加のみ)"]
acceptance: ["docs/features/feat-user-org-admin/release-notes.md にデプロイ日時・S17/S18本番URL・salary非露出スモークチェック結果が記録されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# リリース/デプロイ — S17/S18のCloudflare Workers本番反映とロールアウト確認

> task projection (P13 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-13-release-deploy.md`

## 依存

- SYS-USER-ORG-ADMIN-P12

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P13)
