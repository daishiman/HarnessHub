---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p11.md", "confidence": 0.84}]
classification_confidence: 0.84
classification_reason: P01〜P10 の全成果物を証跡として一元集約し、リリース判断とドキュメント化 (P12/P13) に必要な evidence bundle を作成する P11 エビデンス収集タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P10"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p11.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P11
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P11
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/evidence-summary.md"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-11-evidence.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "evidence"]
target_date: null
template_id: task
template_version: 1.0.0
title: エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P11 を実行する: エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約
goal: P06 (test-run-results.md)、P07 (acceptance-record.md)、P09 (quality-assurance-report.md)、P10 (final-review-record.md) に分散する証跡を単一の evidence-summary.md へ集約し、P12 (runbook 作成) と P13 (リリース) が参照できる状態にする。
scope_in: ["docs/features/feat-domain-model-db/evidence-summary.md"]
scope_out: ["新規検証の実施 (本 task は既存証跡の集約のみで新たなテスト・レビューは行わない)", "Studio 拡張 feature のエビデンス集約 (各 feature 自身の P11 が担当)"]
acceptance: ["evidence-summary.md に P06/P07/P09/P10 の 4 成果物への参照リンクと、User 基底テーブル owner 決定・qa-045 follow-up 記録への参照が記載されている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約

> task projection (P11 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-11-evidence.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P10

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P11)
