---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-user-org-admin/sys-user-org-admin-p04.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: 承認済み設計を根拠に P05 実装前の salary 非露出・監査記録・axe a11y の test-first 受入契約を定義する P04 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T11:22:15Z
depends_on: ["SYS-USER-ORG-ADMIN-P03"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-user-org-admin
file_path: tasks/feat-user-org-admin/sys-user-org-admin-p04.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-USER-ORG-ADMIN-P04
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-user-org-admin
phase_ref: P04
priority: null
project_id: feature-package-feat-user-org-admin
pull_request_linkages: []
related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-user-org-admin/test-design.md", "apps/hub/src/features/user-org-admin/__tests__/"]
source_lineage: {"imported_at": "2026-07-17T11:22:15Z", "origin_kind": "system-dev-planner", "source_digest": "66c53d61ff2b756728000d0e1328ba69931a158e19787d0b1059be702f7675b2", "source_path": ".dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-04-test-design.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-user-org-admin", "studio-extension", "security", "test-design"]
target_date: null
template_id: task
template_version: 1.0.0
title: テスト設計 — salary非露出分離テスト・監査記録テスト・axe a11yテストの設計
tracker_binding: beads
updated_at: 2026-07-17T11:22:15Z
purpose: feat-user-org-admin の P04 を実行する: テスト設計 — salary非露出分離テスト・監査記録テスト・axe a11yテストの設計
goal: P03 で承認された設計を根拠に、P05 実装前の test-first 受入契約 (salary 非露出分離テスト・係数変更監査記録テスト・S17/S18 axe a11y ゼロ違反テスト) を定義する。
scope_in: ["docs/features/feat-user-org-admin/test-design.md", "apps/hub/src/features/user-org-admin/__tests__/"]
scope_out: ["テストの実行 (P06 で実施)", "実装コードの作成 (P05 で実施)", "共有 CI パイプライン設定 (.github/workflows/ci.yml) の変更 (feat-hub-foundation の write_scope。本 feature は既存パイプライン上でテストを実行するのみで同ファイルを書き換えない)"]
acceptance: ["docs/features/feat-user-org-admin/test-design.md に goal-spec acceptance 3件それぞれのtest種別と合否基準が明記されている"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# テスト設計 — salary非露出分離テスト・監査記録テスト・axe a11yテストの設計

> task projection (P04 / parent: feat-user-org-admin)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-user-org-admin/task-specs/phase-04-test-design.md`

## 依存

- SYS-USER-ORG-ADMIN-P03

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-USER-ORG-ADMIN-P04)
