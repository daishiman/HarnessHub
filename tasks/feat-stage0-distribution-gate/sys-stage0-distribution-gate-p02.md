---
acceptance: ["architecture-decision-record.md に 5 件の architecture decision (URL 型 marketplace 検証方式・npm source の source type としての検証方式・Bootstrap Installer 試作方式・macOS/Windows 実機 E2E 手順・decision record 登録経路) が過不足なく記載されていること"]
architecture_refs: ["arch-harness-hub-infrastructure"]
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p02.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: URL 型 marketplace・npm source (URL 型 marketplace 内の source type として扱う)・Bootstrap Installer の 3 経路検証方式、最小 artifact 構成 (skill package/marketplace.json/Installer 試作)、macOS/Windows 実機 E2E 手順、採用経路の decision record 登録経路 (C01 writer 経由で spec-state.json decisions[] へ) を確定する P02 architecture decision タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T12:32:59Z
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P01"]
domain: infrastructure
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-stage0-distribution-gate
file_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
goal: P01 で確定した要件ベースラインに基づき、(1) URL 型 marketplace 検証方式 (2) npm source の URL 型 marketplace 内 source type としての検証方式 (3) Bootstrap Installer 試作方式 (4) macOS/Windows 実機 E2E 手順 (5) 採用経路の decision record 登録経路 (C01 writer 経由で system-spec/spec-state.json decisions[] へ) の 5 件の architecture decision を確定し、architecture-decision-record.md として文書化する。
graph_node_id: SYS-STAGE0-DISTRIBUTION-GATE-P02
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-stage0-distribution-gate
phase_ref: P02
priority: null
project_id: feature-package-feat-stage0-distribution-gate
pull_request_linkages: []
purpose: feat-stage0-distribution-gate の P02 を実行する: アーキテクチャ設計 — 3 経路検証方式・最小 artifact 構成・実機 E2E 手順・decision record 登録経路の確定
related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-stage0-distribution-gate/architecture-decision-record.md"]
scope_in: ["docs/features/feat-stage0-distribution-gate/architecture-decision-record.md"]
scope_out: ["Hub 本体の実装 (goal-spec scope_out)", "課金・商用配布 (goal-spec scope_out)", "検証用 artifact の実作成 (本 task は方式確定のみ。実作成は P05 で扱う)", "実機での検証実行そのもの (本 task は手順確定のみ。実行は P06 で扱う)"]
source_lineage: {"imported_at": "2026-07-18T12:32:59Z", "origin_kind": "system-dev-planner", "source_digest": "304796a9f0dd030304377732863de18d343d50c0471bab00d6757486db3cbbb9", "source_path": ".dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-stage0-distribution-gate", "macro-feature", "infrastructure", "architecture-decision"]
target_date: null
template_id: task
template_version: 1.0.0
title: アーキテクチャ設計 — 3 経路検証方式・最小 artifact 構成・実機 E2E 手順・decision record 登録経路の確定
tracker_binding: beads
updated_at: 2026-07-18T12:32:59Z
---

# アーキテクチャ設計 — 3 経路検証方式・最小 artifact 構成・実機 E2E 手順・decision record 登録経路の確定

> task projection (P02 / parent: feat-stage0-distribution-gate)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-stage0-distribution-gate/task-specs/phase-02-architecture.md`

## 依存

- SYS-STAGE0-DISTRIBUTION-GATE-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-STAGE0-DISTRIBUTION-GATE-P02)
