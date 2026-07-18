---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p06.md", "confidence": 0.86}]
classification_confidence: 0.86
classification_reason: P05 の実装に対して P04 のテストスタブを実行し quality_constraints 9 件の充足状況を機械的に確認する P06 テスト実行タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P05"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p06.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P06
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P06
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/test-run-results.md", "packages/db/__tests__/"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-06-test-run.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "test-run"]
target_date: null
template_id: task
template_version: 1.0.0
title: テスト実行 — D1 互換性・release immutable・tenant 分離・R2 registry・backup/restore テストの実行と結果記録
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P06 を実行する: テスト実行 — D1 互換性・release immutable・tenant 分離・R2 registry・backup/restore テストの実行と結果記録
goal: P04 の test-design.md に列挙された全テストケースを P05 の実装に対して実行し、結果 (pass/fail・カバレッジ・失敗時の是正記録) を test-run-results.md に記録する。
scope_in: ["docs/features/feat-domain-model-db/test-run-results.md", "packages/db/__tests__/"]
scope_out: ["テスト失敗の恒久修正 (再実装が必要な場合は P05 へ差し戻し、本 task は結果記録と差し戻し判断のみ)", "Studio 拡張 feature 独自のテスト実行 (各 feature 自身の P06 が担当)", "tenant_data_objects (qa-045) 関連テストの実行 (本 digest スコープ外)"]
acceptance: ["test-run-results.md に quality_constraints 9 件全ての pass 結果が記録されている (fail が残る場合は差し戻し理由が明記されている)"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# テスト実行 — D1 互換性・release immutable・tenant 分離・R2 registry・backup/restore テストの実行と結果記録

> task projection (P06 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-06-test-run.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P05

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P06)
