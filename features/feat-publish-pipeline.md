---
graph_node_id: feat-publish-pipeline
artifact_kind: feature
artifact_subtypes: []
title: PublishRequest パイプライン (状態機械・検査・promote/rollback)
project_id: harness-hub
domain: backend
status: draft
priority: high
start_date: null
target_date: null
iteration: Stage 1
owners: ["daishiman"]
tags: ["macro-feature", "stage-1", "backend"]
file_path: features/feat-publish-pipeline.md
template_id: feature
template_version: 1.0.0
confirmation_status: draft
evaluation_status: pending
confirmation_evidence: {"evaluator": null, "evidence_ref": null, "evaluated_digest": null}
source_lineage: {"origin_kind": "generated", "source_plugin": "dev-graph", "source_path": "specs/harness-hub-system-specification.md", "source_version": null, "source_digest": null, "imported_at": "2026-07-17T00:38:30Z"}
created_at: 2026-07-17T00:38:30Z
updated_at: 2026-07-17T00:38:30Z
depends_on: ["feat-domain-model-db", "feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-publish-pipeline.md"]
purpose: 作者の自己完結 publish (G1) の中核として、PublishRequest 状態機械 (§7.2)・検査 pipeline (static validation/secret scan/policy)・stable pointer promote/rollback を実装する
goal: publish → 検査 → Ready → Publishing → Published が atomic に完走し、失敗時は旧 stable が無傷で残る状態
scope_in: ["REST API (zod 単一ソース → OpenAPI)", "状態機械 + TargetChannel 直列化", "検査 pipeline (共有パッケージ化)", "R2 保存 + Catalog pointer の atomic 更新", "promote/rollback + 監査 event"]
scope_out: ["Publisher クライアント側", "カタログ UI"]
acceptance: ["状態遷移が §7.2 準拠で property test を通る", "検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される", "全操作が append-only 監査 event に記録される"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-publish-pipeline.md"}]
tracker_binding: beads
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "open", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "incomplete", "missing_sections": ["13-task package 未生成 (system-dev-planner 待ち)"], "checked_at": "2026-07-17T00:38:30Z"}
---

# PublishRequest パイプライン (状態機械・検査・promote/rollback)

> Stage 1 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

作者の自己完結 publish (G1) の中核として、PublishRequest 状態機械 (§7.2)・検査 pipeline (static validation/secret scan/policy)・stable pointer promote/rollback を実装する

## 到達状態

publish → 検査 → Ready → Publishing → Published が atomic に完走し、失敗時は旧 stable が無傷で残る状態

## スコープ

**対象 (in):**

- REST API (zod 単一ソース → OpenAPI)
- 状態機械 + TargetChannel 直列化
- 検査 pipeline (共有パッケージ化)
- R2 保存 + Catalog pointer の atomic 更新
- promote/rollback + 監査 event

**対象外 (out):**

- Publisher クライアント側
- カタログ UI

## 受入

- 状態遷移が §7.2 準拠で property test を通る
- 検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される
- 全操作が append-only 監査 event に記録される

## アーキテクチャ参照

- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-data](../architecture/harness-hub-data.md)
- [arch-harness-hub-security](../architecture/harness-hub-security.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-domain-model-db
- feat-auth-tenancy

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
