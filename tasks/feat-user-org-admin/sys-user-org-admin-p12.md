---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p12.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: P13の本番反映に先立ちS17/S18のPIIガード運用・通知ディスパッチ運用のrunbookを整備するP12タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P11"]
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p12.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P12
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P12
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/runbook.md"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-12-documentation-operations.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "documentation-operations"]
target_date: null
template_id: task
template_version: 1.0.0
title: ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P12 を実行する: ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化
goal: P13 の本番反映に先立ち、S17/S18 の運用 runbook (salary PII ガード運用手順・監査ログ確認手順・通知ディスパッチ障害時対応・ロールバック手順) を整備する。
scope_in: ["docs/features/feat-user-org-admin/runbook.md"]
scope_out: ["共通層 (PIIガード/通知ディスパッチ) 自体の運用手順文書化 (feat-hub-foundation の write_scope。本 task は本 feature 固有の利用手順のみを扱う)", "実際の本番デプロイ実施 (P13 で実施)"]
acceptance: ["docs/features/feat-user-org-admin/runbook.md にPIIガード運用・監査ログ確認・通知ディスパッチ監視・障害対応・ロールバックの5手順が記載されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化

> task projection (P12 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-12-documentation-operations.md`

## 依存

- SYS-USER-ORG-ADMIN-P11

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P12)
