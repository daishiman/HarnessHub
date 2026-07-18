---
acceptance: ["evidence-summary.md に quality_constraints 8 件それぞれの再現手順 (実機検証手順・確認コマンド) と対応する結果が記載されていること"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p11.md", "confidence": 0.84}]
classification_confidence: 0.84
classification_reason: P06/P07/P09/P10 で得られた実機検証証跡を集約し、第三者 (将来の Stage 1 着手判断者) が再現可能な形で保存する P11 証跡タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P10"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p11.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) で得られた実機検証証跡を集約し、第三者 (将来の Stage 1 着手判断者) が再現可能な形で evidence-summary.md に保存する。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P11
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P11
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P11 を実行する: 再現可能な証跡 — P06/P07/P09/P10 の証跡集約と再現手順の確立
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/evidence-summary.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/evidence-summary.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "証跡の再取得・再検証そのもの (欠落や矛盾があれば該当 phase へ差し戻す。本 task は集約のみ)", "runbook としての onboarding/更新導線/障害時対応手順の具体化 (本 task は再現手順としての証跡集約のみ。運用手順化は P12 で扱う)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-11-evidence.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "quality", "evidence"]
target_date: null
template_id: task
template_version: 1.0.0
title: 再現可能な証跡 — P06/P07/P09/P10 の証跡集約と再現手順の確立
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# 再現可能な証跡 — P06/P07/P09/P10 の証跡集約と再現手順の確立

> task projection (P11 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-11-evidence.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P10

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P11)
