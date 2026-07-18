---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p08.md", "confidence": 0.83}]
classification_confidence: 0.83
classification_reason: P05 で実装したコアドメイン 18 テーブルのスキーマに対する初回ベースライン migration 生成と、単一 migration 系統の確立を行う P08 リファクタリング/マイグレーションタスク (required-node)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P07"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P08
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P08
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data"]
resource_scope: ["packages/db/migrations/", "packages/db/drizzle.config.ts", "docs/features/feat-domain-model-db/refactoring-migration-note.md"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "refactoring-migration"]
target_date: null
template_id: task
template_version: 1.0.0
title: リファクタリング/マイグレーション — 初回ベースライン migration 生成と単一系統確立
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P08 を実行する: リファクタリング/マイグレーション — 初回ベースライン migration 生成と単一系統確立
goal: P05 で実装したコアドメイン 18 テーブルのスキーマ定義から drizzle-kit を用いて初回ベースライン migration を生成し、`packages/db/migrations/` を単一系統として確立する。本 feature が control-plane DB の最初のスキーマであるため、本 task は既存データへの破壊的変更を伴わない新規作成の migration である。
scope_in: ["packages/db/migrations/", "packages/db/drizzle.config.ts", "docs/features/feat-domain-model-db/refactoring-migration-note.md"]
scope_out: ["migration の本番適用 (P13 で実施。本 task は生成とローカル/ステージング環境での検証のみ)", "Studio 拡張 feature 自身のテーブル追加 migration (各 feature 自身の P08 が担当)", "tenant_data_objects (qa-045) の migration (本 digest スコープ外)", "department/salary 列に対する PII ガード適用・利用 API・監査 UI・tenant_coefficients の migration (owner=feat-user-org-admin。department/salary 列自体は本 task のベースライン migration に含まれるためスキーマ変更は発生しない)"]
acceptance: ["refactoring-migration-note.md に初回ベースライン migration の生成内容と、Studio 拡張 feature 向け積み増しルールが記載されている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# リファクタリング/マイグレーション — 初回ベースライン migration 生成と単一系統確立

> task projection (P08 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P08)
