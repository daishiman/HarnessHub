---
acceptance: ["acceptance-record.md に「2 経路以上の実機検証記録が存在する」「採用経路が decision record として登録される (登録依頼は P13 で確定)」「Windows E2E が成功する」の 3 件の確認結果 (pass) と証跡へのリンクが記載されていること"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p07.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: P06 で得られた実機検証結果を基に goal-spec acceptance 3 件 (2 経路以上の実機検証記録・decision record 登録・Windows E2E 成功) の充足を確認する P07 受入タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P06"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p07.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: P06 の test-run-results.md に記録された実機検証結果を基に、goal-spec の acceptance 3 件 (2 経路以上の実機検証記録が存在する・採用経路が decision record として登録される・Windows E2E が成功する) の充足状況を確認し、acceptance-record.md として確定する。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P07
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P07
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P07 を実行する: 受入 — 2 経路以上の実機検証記録と Windows E2E 成功の確認
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/acceptance-record.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/acceptance-record.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "decision record の system-spec/spec-state.json decisions[] への実書込 (owner=C01 writer コンポーネント。登録依頼の確定は P13 で扱う)", "実機での検証実行そのもの (本 task は判定のみ。実行は P06 で完了済み)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-07-acceptance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "acceptance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 受入 — 2 経路以上の実機検証記録と Windows E2E 成功の確認
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# 受入 — 2 経路以上の実機検証記録と Windows E2E 成功の確認

> task projection (P07 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-07-acceptance.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P06

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P07)
