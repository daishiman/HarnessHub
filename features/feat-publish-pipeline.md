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
updated_at: "2026-08-04T03:13:41Z"
status: "active"
depends_on: []
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
confirmation_evidence: {"evaluated_digest":"845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publish-pipeline/845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-30T13:30:00Z","origin_kind":"generated","source_digest":"7e1a6753bec43aa5e758f148039c1af71517142bb6e039dc8b1de20638018d77","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-publish-pipeline.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-krc7","linked_at":"2026-08-04T03:13:41Z","sync_state":"linked"}
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

## 実装・最終受入の反映 (2026-07-30)

- 現行 task package は contract `1.2.0`、digest
  `845b61b259b9b5864bde30caeb1843a2f79ea20ae2f006c809ee243e9edcdd4d`。
  P01〜P13 の task projection と Beads `HarnessHub-dfm.1`〜`.13` をこの世代へ再固定した。
- Hub API は公開要求の作成、ZIP 検査、submit、approve/cancel、Release 一覧、
  channel promote/rollback、Release suspend、deployment 登録を提供する。
- Green は検査後に自動公開し、Yellow/Red は修正待ちへ戻す。Release は不変、
  stable pointer は atomic に切り替え、失敗時は旧 stable を維持する。
- Package は SHA-256 による content-addressed key で R2 へ保存し、DB repository、
  単一認可入口、冪等鍵、TargetChannel 直列化、append-only 監査を共有する。
- P13 production smoke の DB fixture・証跡・cleanup は
  `createPublishSmokeDbProbe` に閉じ、Hub が schema table を直接参照しない。
- 外部 API、状態機械、DB/R2、認可、運用 smoke/rollback に仕様影響があるため、
  `appr-020` と `qa-103`〜`qa-108` で system-spec を R4 再確認した。
  反映範囲と検証結果は
  [仕様反映受領書](../docs/features/feat-publish-pipeline/spec-reflection-receipt.md) を正とする。
- durable completion（永続的な完了状態）は draft PR の merge と default branch
  reconciliation 後に行う。作業中の task を先に `done` へしない。
