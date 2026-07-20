---
graph_node_id: "feat-auth-tenancy"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["macro-feature","stage-1","security"]
priority: "high"
start_date: null
target_date: null
iteration: "Stage 1"
title: "認証・マルチテナント基盤 (Auth.js OIDC + row-level scope + Device Flow)"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-07-19T14:10:09Z"
status: "active"
depends_on: ["feat-hub-foundation","feat-domain-model-db"]
related_nodes: []
resource_scope: ["features/feat-auth-tenancy.md"]
purpose: "テナント別 OIDC (Auth.js) と role 4 種、全 API への Tenant/Workspace スコープ強制 (D4 row-level-scope)、Publisher 向け OAuth Device Flow を確立する"
goal: "2 テナント同時稼働で認可の越境が分離テストにより 0 件と証明され、Device Flow で token 取得・失効が動作する状態"
scope_in: ["Auth.js マルチテナント OIDC 動的解決","role: provider-admin/workspace-admin/owner/member","認可の単一ミドルウェア集約","OAuth Device Flow + token 失効導線","テナント分離テスト"]
scope_out: ["承認キュー (Stage 2)","監査 UI (Stage 2)"]
acceptance: ["テナント越境アクセスが分離テストで 0 件","Device Flow の E2E (承認→token→失効) が成功する","Auth.js 依存が adapter 境界に隔離されている (D3 caveat)"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-auth-tenancy.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-auth-tenancy/98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"a4c26b6d4e7e8c3556d4a78089c12c6bb8dee445c20c623b151079d5747fd22d","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-auth-tenancy.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-15h","linked_at":"2026-07-18T01:41:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 認証・マルチテナント基盤 (Auth.js OIDC + row-level scope + Device Flow)

> Stage 1 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

テナント別 OIDC (Auth.js) と role 4 種、全 API への Tenant/Workspace スコープ強制 (D4 row-level-scope)、Publisher 向け OAuth Device Flow を確立する

## 到達状態

2 テナント同時稼働で認可の越境が分離テストにより 0 件と証明され、Device Flow で token 取得・失効が動作する状態

## スコープ

**対象 (in):**

- Auth.js マルチテナント OIDC 動的解決
- role: provider-admin/workspace-admin/owner/member
- 認可の単一ミドルウェア集約
- OAuth Device Flow + token 失効導線
- テナント分離テスト

**対象外 (out):**

- 承認キュー (Stage 2)
- 監査 UI (Stage 2)

## 受入

- テナント越境アクセスが分離テストで 0 件
- Device Flow の E2E (承認→token→失効) が成功する
- Auth.js 依存が adapter 境界に隔離されている (D3 caveat)

## アーキテクチャ参照

- [arch-harness-hub-security](../architecture/harness-hub-security.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
