---
graph_node_id: "feat-workspace-governance"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["macro-feature","stage-2","security"]
priority: "low"
start_date: null
target_date: null
iteration: "Stage 2"
title: "Stage 2: Workspace ガバナンス (approval queue / RBAC / audit log)"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-07-19T14:21:39Z"
status: "active"
depends_on: ["feat-dual-catalog-web","feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-workspace-governance.md"]
purpose: "顧客管理者が統制と安全性 (G2) を自律運用できるよう、承認キュー・RBAC 拡張・監査ログ閲覧を提供する"
goal: "workspace-admin が承認/差し戻し/監査を Hub Web で完結でき、統制作業の提供者依存が解消された状態"
scope_in: ["approval queue (Approval Pending 状態の有効化)","RBAC の細分化と管理 UI","監査 event の閲覧・検索 UI","統制ポリシー設定"]
scope_out: ["課金","Stage 3 以降の拡張"]
acceptance: ["承認フローを経ない publish が policy で遮断される","監査ログが Tenant スコープで検索できる","RBAC 変更が監査 event に記録される"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-workspace-governance.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"a4c26b6d4e7e8c3556d4a78089c12c6bb8dee445c20c623b151079d5747fd22d","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-workspace-governance.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5l3","linked_at":"2026-07-19T14:21:43Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Stage 2: Workspace ガバナンス (approval queue / RBAC / audit log)

> Stage 2 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

顧客管理者が統制と安全性 (G2) を自律運用できるよう、承認キュー・RBAC 拡張・監査ログ閲覧を提供する

## 到達状態

workspace-admin が承認/差し戻し/監査を Hub Web で完結でき、統制作業の提供者依存が解消された状態

## スコープ

**対象 (in):**

- approval queue (Approval Pending 状態の有効化)
- RBAC の細分化と管理 UI
- 監査 event の閲覧・検索 UI
- 統制ポリシー設定

**対象外 (out):**

- 課金
- Stage 3 以降の拡張

## 受入

- 承認フローを経ない publish が policy で遮断される
- 監査ログが Tenant スコープで検索できる
- RBAC 変更が監査 event に記録される

## アーキテクチャ参照

- [arch-harness-hub-security](../architecture/harness-hub-security.md)
- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-dual-catalog-web
- feat-auth-tenancy

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
