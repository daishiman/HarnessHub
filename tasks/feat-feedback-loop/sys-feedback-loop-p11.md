---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p11.md", "confidence": 0.84}]
classification_confidence: 0.84
classification_reason: P06/P07/P09/P10 の検証結果を再現可能な証跡として索引化する P11 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P10"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p11.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P11
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P11
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/evidence/"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-11-evidence.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "evidence"]
target_date: null
template_id: task
template_version: 1.0.0
title: エビデンス収集 — 再現可能な検証証跡の集約
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P11 を実行する: エビデンス収集 — 再現可能な検証証跡の集約
goal: P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) の検証結果を、誰でも同一コマンドで再現できる証跡として evidence/index.md に索引化する。
scope_in: ["docs/features/feat-feedback-loop/evidence/"]
scope_out: ["新規検証の実施 (P06/P07/P09/P10 の scope。本 task は既存結果の索引化のみ)", "実装コードの修正"]
acceptance: ["evidence/index.md から P06/P07/P09/P10 の各成果物へのリンクと、それぞれの再実行コマンドが辿れる"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# エビデンス収集 — 再現可能な検証証跡の集約

> task projection (P11 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-11-evidence.md`

## 依存

- SYS-FEEDBACK-LOOP-P10

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P11)
