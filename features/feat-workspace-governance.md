---
graph_node_id: feat-workspace-governance
artifact_kind: feature
artifact_subtypes: []
title: Stage 2: Workspace ガバナンス (approval queue / RBAC / audit log)
project_id: harness-hub
domain: security
status: draft
priority: medium
start_date: null
target_date: null
iteration: Stage 2
owners: ["daishiman"]
tags: ["macro-feature", "stage-2", "security"]
file_path: features/feat-workspace-governance.md
template_id: feature
template_version: 1.0.0
confirmation_status: draft
evaluation_status: pending
confirmation_evidence: {"evaluator": null, "evidence_ref": null, "evaluated_digest": null}
source_lineage: {"origin_kind": "generated", "source_plugin": "dev-graph", "source_path": "specs/harness-hub-system-specification.md", "source_version": null, "source_digest": null, "imported_at": "2026-07-17T00:38:30Z"}
created_at: 2026-07-17T00:38:30Z
updated_at: 2026-07-17T00:38:30Z
depends_on: ["feat-dual-catalog-web", "feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-workspace-governance.md"]
purpose: 顧客管理者が統制と安全性 (G2) を自律運用できるよう、承認キュー・RBAC 拡張・監査ログ閲覧を提供する
goal: workspace-admin が承認/差し戻し/監査を Hub Web で完結でき、統制作業の提供者依存が解消された状態
scope_in: ["approval queue (Approval Pending 状態の有効化)", "RBAC の細分化と管理 UI", "監査 event の閲覧・検索 UI", "統制ポリシー設定"]
scope_out: ["課金", "Stage 3 以降の拡張"]
acceptance: ["承認フローを経ない publish が policy で遮断される", "監査ログが Tenant スコープで検索できる", "RBAC 変更が監査 event に記録される"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-workspace-governance.md"}]
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
