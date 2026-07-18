---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p06.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P04 test-design.md の受入契約に従って P05 実装物を実行検証する P06 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P05"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p06.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P06
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P06
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["apps/hub/src/features/user-org-admin/__tests__/"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-06-test-run.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "test-run"]
target_date: null
template_id: task
template_version: 1.0.0
title: テスト実行 — 単体/結合/分離/a11yテストの実行と結果記録
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P06 を実行する: テスト実行 — 単体/結合/分離/a11yテストの実行と結果記録
goal: P04 test-design.md の受入契約に従って P05 実装物を実行検証し、salary 非露出分離テスト・係数変更監査記録テスト・S17/S18 axe a11y ゼロ違反テストの結果を記録する。
scope_in: ["apps/hub/src/features/user-org-admin/__tests__/"]
scope_out: ["共有 CI パイプライン設定 (.github/workflows/ci.yml) の変更 (feat-hub-foundation の write_scope。本 feature は既存パイプライン上でテストを実行するのみ)", "テスト失敗時の実装修正 (原因箇所を記録し P05 へ差し戻す)"]
acceptance: ["CI run が green で完走し、salary非露出分離テスト・監査記録テスト・axe a11yテストの結果が記録されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# テスト実行 — 単体/結合/分離/a11yテストの実行と結果記録

> task projection (P06 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-06-test-run.md`

## 依存

- SYS-USER-ORG-ADMIN-P05

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P06)
