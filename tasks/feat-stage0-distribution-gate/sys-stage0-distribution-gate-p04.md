---
acceptance: ["test-design.md に quality_constraints 8 件と acceptance 3 件全てに対応する実機検証ケース (macOS/Windows 別チェックリストを含む) が記載されていること"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p04.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: quality_constraints 8 件 (stage0-two-path-distribution-technical-gate-h7-qa003・stage0-technical-gate-h3-h6-h7-stage1-entry-condition-i9・author-environment-macos-windows-linux-out-of-scope-qa001・npm-source-official-support-changelog-recheck-claude-code-plugins・cost-zero-verification-within-free-tier-c2・solo-operator-ai-assisted-verification-c1・h7-unresolved-blocks-stage1-fail-closed-gate・adopted-path-decision-record-registration-spec-state-decisions) と acceptance 3 件を実機検証ケースへ写像する P04 テストファースト設計タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P03"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p04.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: P03 のレビューを経た architecture decision に基づき、goal-spec の quality_constraints 8 件と acceptance 3 件のそれぞれに対応する実機検証ケース (macOS/Windows 別チェックリストを含む) を test-design.md として設計する。この設計が P06 のテスト実行における唯一の検証基準となる。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P04
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P04
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P04 を実行する: テストファースト設計 — quality_constraints 8 件・acceptance 3 件に対応する実機検証ケースの設計
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/test-design.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/test-design.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "検証用 artifact の実作成 (本 task はケース設計のみ。実作成は P05 で扱う)", "実機での検証実行そのもの (本 task はケース設計のみ。実行は P06 で扱う)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-04-test-design.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "test-design"]
target_date: null
template_id: task
template_version: 1.0.0
title: テストファースト設計 — quality_constraints 8 件・acceptance 3 件に対応する実機検証ケースの設計
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# テストファースト設計 — quality_constraints 8 件・acceptance 3 件に対応する実機検証ケースの設計

> task projection (P04 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-04-test-design.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P03

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P04)
