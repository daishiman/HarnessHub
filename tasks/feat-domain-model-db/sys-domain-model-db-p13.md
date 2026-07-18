---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-domain-model-db/sys-domain-model-db-p13.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P12 の runbook を前提に、初回ベースライン migration を本番 Turso/D1 へ反映し R2 registry を有効化してスモークテストで疎通確認する P13 リリース/デプロイタスク (required-node)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-domain-model-db/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-18T00:00:35Z
depends_on: ["SYS-DOMAIN-MODEL-DB-P12"]
domain: operations
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-domain-model-db
file_path: tasks/feat-domain-model-db/sys-domain-model-db-p13.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-DOMAIN-MODEL-DB-P13
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-domain-model-db
phase_ref: P13
priority: null
project_id: feature-package-feat-domain-model-db
pull_request_linkages: []
related_nodes: ["feat-domain-model-db", "arch-harness-hub-data", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/release-record.md"]
source_lineage: {"imported_at": "2026-07-18T00:00:35Z", "origin_kind": "system-dev-planner", "source_digest": "4b6c2e59e5501c72192f4f4b6572f520dd9ed49cfcaaf532e3a83f0d84358199", "source_path": ".dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-13-release-deploy.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-domain-model-db", "macro-feature", "data", "release"]
target_date: null
template_id: task
template_version: 1.0.0
title: リリース/デプロイ — 本番 Turso/D1・R2 registry 反映とスモークテスト
tracker_binding: beads
updated_at: 2026-07-18T00:00:35Z
purpose: feat-domain-model-db の P13 を実行する: リリース/デプロイ — 本番 Turso/D1・R2 registry 反映とスモークテスト
goal: P08 で生成した初回ベースライン migration を本番 Turso インスタンス (および D1 hedge 環境) に適用し、R2 content-addressed registry のバケット/prefix 設定を有効化したうえで、DB 接続・R2 registry・audit_events append・日次 export cron の初回起動を含むスモークテストを実施し release-record.md として記録する。
scope_in: ["docs/features/feat-domain-model-db/release-record.md"]
scope_out: ["四半期 restore drill の本実施 (本番運用開始後の四半期サイクルで実施。本 task は実行可能性確認のみ)", "Studio 拡張 feature 自身のリリース (各 feature 自身の P13 が担当。本 feature のリリースは Studio 拡張 feature の migration 積み増しの前提条件となる)", "tenant_data_objects (qa-045) のリリース (本 digest スコープ外)"]
acceptance: ["release-record.md に本番反映内容とスモークテスト結果 (DB 接続・ULID PK 発行・releases immutable・R2 put/get・audit hash chain・export cron dry-run) が pass として記載されている"]
architecture_refs: ["arch-harness-hub-data", "arch-harness-hub-backend"]
---

# リリース/デプロイ — 本番 Turso/D1・R2 registry 反映とスモークテスト

> task projection (P13 / parent: feat-domain-model-db)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-13-release-deploy.md`

## 依存

- SYS-DOMAIN-MODEL-DB-P12

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-DOMAIN-MODEL-DB-P13)
