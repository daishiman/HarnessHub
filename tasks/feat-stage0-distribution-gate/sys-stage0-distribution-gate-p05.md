---
acceptance: ["docs/features/feat-stage0-distribution-gate/verification-artifacts/ 配下に最小 skill package・marketplace.json・Bootstrap Installer 試作が作成され、implementation-notes.md に P04 の test-design.md に列挙された全検証ケースに対応する検証対象一式が揃っていることが記載されていること"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p05.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P02/P04 で確定した設計・検証ケースに基づき、最小 skill package・URL 型 marketplace 用 marketplace.json・Bootstrap Installer 試作を C2 (無料枠内) で作成する P05 実装タスク。本 feature は scope_out に Hub 本体実装を含むため apps/hub・packages 配下は変更しない
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P04"]
domain: infrastructure
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: P04 の test-design.md に列挙された実機検証ケースを実行可能にするため、最小 skill package・URL 型 marketplace 用 marketplace.json・Bootstrap Installer 試作を C2 (無料枠内) で作成する。本 task の成果物は本番配布物ではなく、H7 検証のためだけに存在する使い捨て可能な最小構成の artifact である。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P05
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P05
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P05 を実行する: 実装 — 最小 skill package・marketplace.json・Bootstrap Installer 試作の作成
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/verification-artifacts/minimal-skill-package/", "docs/features/feat-stage0-distribution-gate/verification-artifacts/marketplace.json", "docs/features/feat-stage0-distribution-gate/verification-artifacts/bootstrap-installer-prototype/", "docs/features/feat-stage0-distribution-gate/implementation-notes.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/verification-artifacts/minimal-skill-package/", "docs/features/feat-stage0-distribution-gate/verification-artifacts/marketplace.json", "docs/features/feat-stage0-distribution-gate/verification-artifacts/bootstrap-installer-prototype/", "docs/features/feat-stage0-distribution-gate/implementation-notes.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "既存 installers/ ディレクトリ (harness-creator kit 配布用) の変更 (別スコープのため対象外)", "実機での検証実行そのもの (本 task は artifact 作成のみ。実行は P06 で扱う)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "infrastructure", "implementation"]
target_date: null
template_id: task
template_version: 1.0.0
title: 実装 — 最小 skill package・marketplace.json・Bootstrap Installer 試作の作成
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# 実装 — 最小 skill package・marketplace.json・Bootstrap Installer 試作の作成

> task projection (P05 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-05-implementation.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P05)
