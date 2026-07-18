---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p11.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: feature-execution-package-contract.md §7 が定める reproducible evidence 要件に従い P06/P07/P09/P10 の成果物を証跡として集約する P11 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P10"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p11.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P11
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P11
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/evidence/"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-11-evidence.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "evidence"]
target_date: null
template_id: task
template_version: 1.0.0
title: エビデンス収集 — acceptance 根拠・テスト結果・品質保証の証跡集約
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P11 を実行する: エビデンス収集 — acceptance 根拠・テスト結果・品質保証の証跡集約
goal: feature-execution-package-contract.md §7 が定める reproducible evidence 要件に従い、P06 のテスト結果・P07 の受入判定・P09 の品質保証結果・P10 の最終レビュー判定を再現可能な形で証跡として一箇所に集約する。
scope_in: ["docs/features/feat-hearing-intake/evidence/"]
scope_out: ["証跡不足時の再テスト実施 (該当 task を再実行対象として差し戻す)", "confirmation 判定そのもの (system-dev-plan-evaluator の scope)"]
acceptance: ["evidence/index.md が P06/P07/P09/P10 の全成果物への参照を漏れなく含んでいる"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# エビデンス収集 — acceptance 根拠・テスト結果・品質保証の証跡集約

> task projection (P11 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-11-evidence.md`

## 依存

- SYS-HEARING-INTAKE-P10

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P11)
