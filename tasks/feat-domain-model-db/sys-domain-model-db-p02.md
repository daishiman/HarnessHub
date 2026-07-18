---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p02.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: コアドメイン 18 テーブルの Drizzle スキーマ設計・libSQL/D1 接続層隔離設計・R2 content-addressed registry 設計に加え、User 基底テーブルの owner feature 未確定 (features/feat-domain-model-db.md 上流未解決節) を解消する P02 architecture decision タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P01"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P02
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P02
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/architecture-decision-record.md"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "architecture-decision"]
target_date: null
template_id: task
template_version: 1.0.0
title: アーキテクチャ設計 — コアドメイン 18 テーブル Drizzle スキーマ・接続層隔離・User 基底テーブル owner 確定・R2 registry 設計
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P02 を実行する: アーキテクチャ設計 — コアドメイン 18 テーブル Drizzle スキーマ・接続層隔離・User 基底テーブル owner 確定・R2 registry 設計
goal: P01 で確定した要件ベースラインを実装可能なアーキテクチャへ具体化する。具体的には (1) コアドメイン 18 テーブルの Drizzle スキーマ (列定義・型・制約) を backend-spec.md §2.2 に一致させて確定し、(2) libSQL (Turso) を primary、Cloudflare D1 を hedge とする接続層隔離の設計を確定し、(3) R2 content-addressed PackageRegistry のキー設計・不変性保証を確定し、(4) releases immutable 制約・target_channels.stable_release_id atomic pointer の強制方式を確定し、(5) audit_events hash chain と encryption_keys 封筒暗号化の repository 層責務を確定し
scope_in: ["docs/features/feat-domain-model-db/architecture-decision-record.md"]
scope_out: ["department/salary 列に対する PII ガード適用・利用 API・監査 UI・tenant_coefficients (係数管理 UI/API) の設計 (owner=feat-user-org-admin。本 feature は users テーブルの列定義自体 [department/salary 含む] のみを確定し、業務ロジック・認可・UI は対象外とする)", "Studio 拡張テーブル (packages/db/schema/{studio-feature}/ 配下) の列定義", "tenant_data_objects テーブル (qa-045) の設計 (本 digest スコープ外。follow-up feature candidate として記録)", "実装コード自体の作成 (packages/db への実コード投入は P05)", "認可ミドルウェア・認証フロー (owner=feat-auth-tenancy)"]
acceptance: ["architecture-decision-record.md に User 基底テーブル owner 確定の判断基準・証跡・影響範囲が明記され、18 テーブルの列定義表・接続層隔離設計・R2 registry 設計・qa-045 follow-up 記録が記載されている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# アーキテクチャ設計 — コアドメイン 18 テーブル Drizzle スキーマ・接続層隔離・User 基底テーブル owner 確定・R2 registry 設計

> task projection (P02 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P02)
