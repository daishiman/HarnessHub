---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p03.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P02 の architecture decision (User 基底テーブル owner 確定・18 テーブル定義・接続層隔離) を P02 実行者から独立した視点で検証する P03 レビュータスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P02"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p03.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P03
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P03
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/design-review-notes.md"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-03-design-review.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "design-review"]
target_date: null
template_id: task
template_version: 1.0.0
title: 独立設計レビュー — スキーマ・接続層隔離・User 基底テーブル owner 判断の妥当性確認
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P03 を実行する: 独立設計レビュー — スキーマ・接続層隔離・User 基底テーブル owner 判断の妥当性確認
goal: P02 の architecture-decision-record.md を P02 実行と独立した視点でレビューし、(1) User 基底テーブル owner の architecture decision が feat-user-org-admin の実際の write_scope と衝突しないこと、(2) 18 テーブル定義が docs/backend-spec.md §2.2 と過不足なく一致すること、(3) 接続層隔離設計が qa-020 (DB アクセスはリポジトリ層限定) を満たすこと、(4) qa-045 の scope-out 判断が exact-13 パッケージ契約に照らして妥当であること、を確認し design-review-notes.md として記録する。
scope_in: ["docs/features/feat-domain-model-db/design-review-notes.md"]
scope_out: ["architecture-decision-record.md 自体の書き換え (是正が必要な場合は P02 への差し戻しを記録するのみで、本 task では編集しない)", "実装コードのレビュー (実装は未着手のため対象外。実装レビューは P07/P10 で行う)", "Studio 拡張 feature の設計レビュー (各 feature 自身の P03 が担当)"]
acceptance: ["design-review-notes.md に User 基底テーブル owner 判断根拠の検証結果と qa-045 scope-out 判断の妥当性確認が記載されている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# 独立設計レビュー — スキーマ・接続層隔離・User 基底テーブル owner 判断の妥当性確認

> task projection (P03 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-03-design-review.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P02

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P03)
