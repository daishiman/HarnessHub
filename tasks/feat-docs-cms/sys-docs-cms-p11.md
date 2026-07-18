---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-docs-cms/sys-docs-cms-p11.md", "confidence": 0.84}]
classification_confidence: 0.84
classification_reason: P06/P07/P09/P10 の検証結果を再現可能な証跡として索引化する P11 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-docs-cms/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:13:50Z
depends_on: ["SYS-DOCS-CMS-P10"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-docs-cms
file_path: tasks/feat-docs-cms/sys-docs-cms-p11.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOCS-CMS-P11
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-docs-cms
phase_ref: P11
priority: null
project_id: feature-package-feat-docs-cms
pull_request_linkages: []
related_nodes: ["feat-docs-cms", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-docs-cms/evidence/"]
source_lineage: {"imported_at": "2026-07-17T13:13:50Z", "origin_kind": "system-dev-planner", "source_digest": "e393b328fe1122ffb1616cbb39d17d15602908a597263868bd566f8a2af8da3f", "source_path": ".dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-11-evidence.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-docs-cms", "studio-extension", "docs-cms", "evidence"]
target_date: null
template_id: task
template_version: 1.0.0
title: エビデンス収集 — 再現可能な検証証跡の集約
tracker_binding: beads
updated_at: 2026-07-17T13:13:50Z
purpose: feat-docs-cms の P11 を実行する: エビデンス収集 — 再現可能な検証証跡の集約
goal: P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) の検証結果を、第三者が再実行して同一結果を得られる再現可能な証跡として docs/features/feat-docs-cms/evidence/ に索引化する。
scope_in: ["docs/features/feat-docs-cms/evidence/"]
scope_out: ["新規テストの追加実行 (P06/P09 で既に確定した結果の索引化のみ)", "実装コードの修正"]
acceptance: ["evidence/index.md から P06/P07/P09/P10 の各成果物へのリンクと、それぞれの再実行コマンドが辿れる"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# エビデンス収集 — 再現可能な検証証跡の集約

> task projection (P11 / parent: feat-docs-cms)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-docs-cms/task-specs/phase-11-evidence.md`

## 依存

- SYS-DOCS-CMS-P10

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOCS-CMS-P11)
