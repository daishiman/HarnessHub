---
graph_node_id: feat-user-org-admin
artifact_kind: feature
artifact_subtypes: []
title: Studio: ユーザー管理・アカウント設定 (role 統合・係数設定・PII ガード)
project_id: harness-hub
domain: security
status: draft
priority: medium
start_date: null
target_date: null
iteration: Studio 拡張
owners: ["daishiman"]
tags: ["macro-feature", "studio-extension", "security"]
file_path: features/feat-user-org-admin.md
template_id: feature
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: pending
confirmation_evidence: {"evaluator": "user-design-review (claude session 9ce54d7a)", "evidence_ref": "eval-log/run-dev-graph-node-confirm-feat-user-org-admin.json", "evaluated_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6"}
source_lineage: {"origin_kind": "generated", "source_plugin": "dev-graph", "source_path": "specs/harness-hub-system-specification.md", "source_version": null, "source_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6", "imported_at": "2026-07-17T10:44:09Z"}
created_at: 2026-07-17T10:44:09Z
updated_at: 2026-07-17T10:49:56Z
depends_on: ["feat-hub-foundation", "feat-domain-model-db", "feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-user-org-admin.md"]
purpose: ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend) を確立する (I14)
goal: workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続された状態
scope_in: ["S17 ユーザー管理 + 個別ダッシュボード", "S18 アカウント設定 (プロフィール/通知/表示)", "User 拡張 (department/salary) + TenantCoefficient エンティティ", "PII ガード共通層 (salary の admin 限定・監査・export マスク)", "通知設定と D6 (Resend) 通知ディスパッチの接続"]
scope_out: ["認証方式の変更 (D3 の IdP 委譲を維持。パスワード/2FA 自前実装は不採用)", "role 体系の再設計 (qa-005 の 4 role を維持)"]
acceptance: ["salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)", "係数変更が監査 event に記録される (SEC6)", "S17/S18 が axe 違反 0 で動作する"]
architecture_refs: ["arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-user-org-admin.md"}]
tracker_binding: beads
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "open", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "incomplete", "missing_sections": ["13-task package 未生成 (system-dev-planner 待ち)"], "checked_at": "2026-07-17T10:44:09Z"}
---

# Studio: ユーザー管理・アカウント設定 (role 統合・係数設定・PII ガード)

> Studio 拡張 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。
> 由来: Harness Studio mockup 反映 (qa-021〜030・U7 改訂 appr-004/005・D5/D6)。正本分析: docs/mockups/harness-studio-v2-analysis.md

## 目的

ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend) を確立する (I14)

## 到達状態

workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続された状態

## スコープ

**対象 (in):**

- S17 ユーザー管理 + 個別ダッシュボード
- S18 アカウント設定 (プロフィール/通知/表示)
- User 拡張 (department/salary) + TenantCoefficient エンティティ
- PII ガード共通層 (salary の admin 限定・監査・export マスク)
- 通知設定と D6 (Resend) 通知ディスパッチの接続

**対象外 (out):**

- 認証方式の変更 (D3 の IdP 委譲を維持。パスワード/2FA 自前実装は不採用)
- role 体系の再設計 (qa-005 の 4 role を維持)

## 受入

- salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)
- 係数変更が監査 event に記録される (SEC6)
- S17/S18 が axe 違反 0 で動作する

## アーキテクチャ参照

- [arch-harness-hub-security](../architecture/harness-hub-security.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
