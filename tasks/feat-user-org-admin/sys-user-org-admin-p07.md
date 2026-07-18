---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p07.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P06 のテスト実行結果を goal-spec acceptance と突合し feature 受入可否を判定する P07 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P06"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p07.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P07
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P07
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/acceptance-report.md"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-07-acceptance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "acceptance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 受入 — goal-spec acceptance 3項目の確認
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P07 を実行する: 受入 — goal-spec acceptance 3項目の確認
goal: P06 のテスト実行結果を goal-spec acceptance 3 件と突合し、feature 受入可否を判定する。
scope_in: ["docs/features/feat-user-org-admin/acceptance-report.md"]
scope_out: ["不合格項目の実装修正そのもの (該当 task を再実行対象として差し戻す)", "認証方式・role 体系の再判定 (goal-spec scope_out として本 feature の対象外に確定済み)"]
acceptance: ["docs/features/feat-user-org-admin/acceptance-report.md に goal-spec acceptance 3件それぞれの合否と根拠が明記されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# 受入 — goal-spec acceptance 3項目の確認

> task projection (P07 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-07-acceptance.md`

## 依存

- SYS-USER-ORG-ADMIN-P06

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P07)
