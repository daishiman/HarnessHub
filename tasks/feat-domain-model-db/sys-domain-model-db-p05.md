---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p05.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P02/P04 で確定した設計とテストスタブに基づき packages/db のスキーマ・接続層・リポジトリ層・R2 registry を実装する P05 実装タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P04"]
domain: backend
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p05.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P05
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P05
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["packages/db/schema/core/", "packages/db/schema/index.ts", "packages/db/connection/", "packages/db/repository/", "packages/db/registry/"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-05-implementation.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "implementation"]
target_date: null
template_id: task
template_version: 1.0.0
title: 実装 — コアドメイン Drizzle スキーマ・接続層 (libSQL/D1)・リポジトリ層・R2 content-addressed registry の実装
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P05 を実行する: 実装 — コアドメイン Drizzle スキーマ・接続層 (libSQL/D1)・リポジトリ層・R2 content-addressed registry の実装
goal: P02 の architecture-decision-record.md と P04 の test-design.md に基づき、packages/db にコアドメイン 18 テーブルの Drizzle スキーマ、libSQL/D1 接続層、リポジトリ層 (tenant scope 強制・release immutable 強制・audit hash chain・封筒暗号化プリミティブ)、R2 content-addressed registry を実装する。migration ファイル自体の生成は P08 で行うため、本 task はスキーマ定義コードとリポジトリ層コードの実装に限定する。
scope_in: ["packages/db/schema/core/", "packages/db/schema/index.ts", "packages/db/connection/", "packages/db/repository/", "packages/db/registry/"]
scope_out: ["migration ファイルの生成・適用 (P08 で実施)", "packages/db/schema/{studio-feature}/ 配下の実装 (各 Studio feature の write_scope)", "検査 pipeline のビジネスロジック実装 (owner=feat-publish-pipeline)", "認可ミドルウェアの実装 (owner=feat-auth-tenancy)", "tenant_data_objects (qa-045) の実装 (本 digest スコープ外)", "department/salary 列に対する PII ガード適用・利用 API・監査 UI・tenant_coefficients の実装 (owner=feat-user-org-admin。本 task は users テーブルの列実装 [department/salary 含む] のみを行う)"]
acceptance: ["P04 で作成したテストスタブが実装コードに対して解決可能な状態 (import 解決・型整合) になっている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# 実装 — コアドメイン Drizzle スキーマ・接続層 (libSQL/D1)・リポジトリ層・R2 content-addressed registry の実装

> task projection (P05 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-05-implementation.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P04

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P05)
