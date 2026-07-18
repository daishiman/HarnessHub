---
acceptance: ["test-run-results.md に macOS/Windows 実機での URL 型 marketplace・npm source・Bootstrap Installer 各経路の検証結果と Windows E2E の pass/fail 結果が記録されていること (fail が残る場合は差し戻し理由が明記されていること)"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p06.md", "confidence": 0.86}]
classification_confidence: 0.86
classification_reason: P05 で作成した artifact に対して P04 の実機検証ケースを macOS/Windows (qa-001 により desktop Linux は対象外) で実行し、quality_constraints 8 件の充足状況を記録する P06 テスト実行タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P05"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p06.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: P05 で作成した最小 skill package・marketplace.json・Bootstrap Installer 試作を対象に、P04 の test-design.md に定義された実機検証ケースを macOS/Windows 実機で実行し、URL 型 marketplace・npm source・Bootstrap Installer の 3 経路それぞれの成立/不成立と Windows E2E の pass/fail を test-run-results.md に記録する。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P06
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P06
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P06 を実行する: テスト実行 — macOS/Windows 実機での URL 型 marketplace・npm source・Bootstrap Installer 検証実行
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/test-run-results.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/test-run-results.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "desktop Linux 環境での検証 (qa-001 により対象外)", "検証結果の受入判定そのもの (本 task は実行と記録のみ。判定は P07 で扱う)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-06-test-run.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "test-run"]
target_date: null
template_id: task
template_version: 1.0.0
title: テスト実行 — macOS/Windows 実機での URL 型 marketplace・npm source・Bootstrap Installer 検証実行
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# テスト実行 — macOS/Windows 実機での URL 型 marketplace・npm source・Bootstrap Installer 検証実行

> task projection (P06 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-06-test-run.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P05

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P06)
