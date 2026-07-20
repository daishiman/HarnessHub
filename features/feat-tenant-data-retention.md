---
graph_node_id: "feat-tenant-data-retention"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["macro-feature","c4-revision","backend"]
priority: "high"
start_date: null
target_date: null
iteration: "C4 改訂 (qa-045-048)"
title: "テナント業務データ保管 (C4 改訂: R2 封筒暗号化・即時完全削除)"
owners: ["daishiman"]
created_at: "2026-07-18T16:20:35Z"
updated_at: "2026-07-19T14:19:56Z"
status: "active"
depends_on: ["feat-hub-foundation","feat-domain-model-db","feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-tenant-data-retention.md"]
purpose: "C4 改訂 (qa-045-048, appr-007) で保持可能となった顧客業務ナレッジ・harness 実行入出力データを、R2 + テナント別封筒暗号化で保管し、即時完全削除を保証する独立した価値提供単位"
goal: "テナント業務データの upload / 取得 / 即時完全削除 API と R2 使用量監視を提供し、C4 の非保持境界 (顧客業務システム接続 credential と WebApp runtime) を維持したまま業務データのみを安全に扱える状態"
scope_in: ["tenant_data_objects テーブルの CRUD API 設計・実装","R2 への content-addressed 業務データ保管 (テナント別 DEK 封筒暗号化)","即時完全削除 (R2 blob・DB row・backup 断面の同時削除)","R2 使用量監視・上限アラート","S15 添付 / S12 実行入出力閲覧向けの任意統合 API 契約・extension point (host UI は各 feature が所有)"]
scope_out: ["顧客業務システム接続 credential と WebApp runtime の保管 (C4 により恒久的に非保持)","業務データを入力とする AI ジョブ実行ロジック (feat-hearing-intake / feat-build-pipeline-board 側)","既存 users.salary / idp_connections.client_secret_enc の封筒暗号化 (feat-auth-tenancy / feat-domain-model-db 既管理)"]
acceptance: ["テナント A の業務データがテナント B のいかなる authz role からも取得不可であること (テナント分離テストが PASS)","削除 API 実行後、R2 blob・DB row・backup 断面のいずれにも当該データの平文/暗号文が残存しないこと (削除完全性テストが PASS)","保管された業務データが R2 上で平文として存在せず、テナント別 DEK で封筒暗号化されていること (暗号化検証テストが PASS)"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-tenant-data-retention.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T16:20:35Z","origin_kind":"generated","source_digest":"5b591475b2b95dc3cbdc76b1c9ab3bc585b1c70baad75311f2420884cf013214","source_path":"docs/features/feat-domain-model-db/requirements-baseline.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (docs/ 全体再分解 2026-07-18。feat-domain-model-db requirements-baseline §6.2 が qa-045 を follow-up feature candidate として dev-graph へ返すと明示)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-tenant-data-retention.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-47b","linked_at":"2026-07-19T14:20:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# テナント業務データ保管 (C4 改訂: R2 封筒暗号化・即時完全削除)

> C4 改訂 (qa-045-048) 由来 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

C4 改訂 (qa-045-048, appr-007) で保持可能となった顧客業務ナレッジ・harness 実行入出力データを、R2 + テナント別封筒暗号化で保管し、即時完全削除を保証する独立した価値提供単位。

## 到達状態

テナント業務データの upload / 取得 / 即時完全削除 API と R2 使用量監視を提供し、C4 の非保持境界 (顧客業務システム接続 credential と WebApp runtime) を維持したまま業務データのみを安全に扱える状態。

## スコープ

**対象 (in):**

- tenant_data_objects テーブルの CRUD API 設計・実装
- R2 への content-addressed 業務データ保管 (テナント別 DEK 封筒暗号化)
- 即時完全削除 (R2 blob・DB row・backup 断面の同時削除)
- R2 使用量監視・上限アラート
- S15 添付 / S12 実行入出力閲覧向けの任意統合 API 契約・extension point (host UI は各 feature が所有)

**対象外 (out):**

- 顧客業務システム接続 credential と WebApp runtime の保管 (C4 により恒久的に非保持)
- 業務データを入力とする AI ジョブ実行ロジック (feat-hearing-intake / feat-build-pipeline-board 側)
- 既存 users.salary / idp_connections.client_secret_enc の封筒暗号化 (feat-auth-tenancy / feat-domain-model-db 既管理)

## 受入

- テナント A の業務データがテナント B のいかなる authz role からも取得不可であること (テナント分離テストが PASS)
- 削除 API 実行後、R2 blob・DB row・backup 断面のいずれにも当該データの平文/暗号文が残存しないこと (削除完全性テストが PASS)
- 保管された業務データが R2 上で平文として存在せず、テナント別 DEK で封筒暗号化されていること (暗号化検証テストが PASS)

## アーキテクチャ参照

- [arch-harness-hub-data](../architecture/harness-hub-data.md)
- [arch-harness-hub-security](../architecture/harness-hub-security.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-infrastructure](../architecture/harness-hub-infrastructure.md)

- 要件根拠: [feat-domain-model-db requirements-baseline §6.2](../docs/features/feat-domain-model-db/requirements-baseline.md) / docs/backend-spec.md §1・§9 row8 / docs/frontend-spec.md §3.5

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## 上流未解決 (P02 設計時に解消)

- ~~docs/security-spec.md §1.4 N2 の旧 C4 前提矛盾~~ → **解消済み (2026-07-18)**: qa-050 確定内容の転記により §1.2 保護資産 2 種・§1.3 T14/T15 追加・§1.4 N2 撤回を反映。業務データ delta の DDL・検証手順の全面展開は qa-046 の据置どおり本 feature P02 前の security 深掘りで実施する
- feat-docs-cms / feat-hearing-intake の feature 定義には C4 改訂が未反映。業務データ保管を本 feature に切り出す方針が confirmation (2026-07-18) で確定したため、両者の scope 変更と必須依存 edge は不要。P02 では本 feature が任意統合 API / extension point を供給し、host UI を各 feature が所有する契約境界だけを確定する
- builds.feedback_id 経由の Build 自動生成ロジックの所有 feature (feat-feedback-loop か feat-build-pipeline-board か) が P02 未確定
