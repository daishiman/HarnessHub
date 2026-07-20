---
graph_node_id: "feat-publish-pipeline"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["macro-feature","stage-1","backend"]
priority: "high"
start_date: null
target_date: null
iteration: "Stage 1"
title: "PublishRequest パイプライン (状態機械・検査・promote/rollback)"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-07-19T14:17:23Z"
status: "active"
depends_on: ["feat-domain-model-db","feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-publish-pipeline.md"]
purpose: "作者の自己完結 publish (G1) の中核として、PublishRequest 状態機械 (§7.2)・検査 pipeline (static validation/secret scan/policy)・stable pointer promote/rollback を実装する"
goal: "publish → 検査 → Ready → Publishing → Published が atomic に完走し、失敗時は旧 stable が無傷で残る状態"
scope_in: ["REST API (zod 単一ソース → OpenAPI)","状態機械 + TargetChannel 直列化","検査 pipeline (共有パッケージ化)","R2 保存 + Catalog pointer の atomic 更新","promote/rollback + 監査 event"]
scope_out: ["Publisher クライアント側","カタログ UI"]
acceptance: ["状態遷移が §7.2 準拠で property test を通る","検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される","全操作が append-only 監査 event に記録される"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-publish-pipeline.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/fd3d49521dee4c5aaf2a76aed0ca06341b7e11bbb17c483c8cfc34fbec114d3b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"a4c26b6d4e7e8c3556d4a78089c12c6bb8dee445c20c623b151079d5747fd22d","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-publish-pipeline.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dfm","linked_at":"2026-07-18T16:04:15Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
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
