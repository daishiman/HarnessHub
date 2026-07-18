---
acceptance: ["runbook.md に採用経路の作者向け onboarding 手順・更新導線 (手動 update)・障害時対応手順の 3 項目全てが記載されていること"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p12.md", "confidence": 0.84}]
classification_confidence: 0.84
classification_reason: 採用経路 (P07 の acceptance 結果に基づく) の作者向け onboarding 手順・更新導線 (marketplace / Bootstrap Installer の「更新あり」表示 + 手動 update)・障害時対応手順を runbook として確立する P12 文書化・運用タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P11"]
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p12.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: P07 の受入結果に基づき確定した採用経路について、作者向けの onboarding 手順・marketplace/Bootstrap Installer の更新導線・障害時対応手順を runbook.md として確立する。この runbook は Stage 1 以降で Publisher が実際に Skill を配布する際の一次参照文書となる。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P12
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P12
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P12 を実行する: 文書化・runbook・引き継ぎ — 採用経路の onboarding/更新導線/障害時対応手順の確立
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/runbook.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/runbook.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "採用経路の decision record 登録依頼そのもの (本 task は運用手順の確立のみ。登録依頼は P13 で扱う)", "Stage 1 系 feature の Publisher UI・承認キュー等の実装 (別 feature の責務)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-12-documentation-operations.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "documentation", "operations"]
target_date: null
template_id: task
template_version: 1.0.0
title: 文書化・runbook・引き継ぎ — 採用経路の onboarding/更新導線/障害時対応手順の確立
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# 文書化・runbook・引き継ぎ — 採用経路の onboarding/更新導線/障害時対応手順の確立

> task projection (P12 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-12-documentation-operations.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P11

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P12)
