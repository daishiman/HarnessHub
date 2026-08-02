---
graph_node_id: "feat-notification-001"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "webapp-minimal"
domain: "web-application"
tags: ["notifications","email"]
priority: null
start_date: null
target_date: null
iteration: null
title: "通知メール"
owners: []
created_at: "2026-07-30T11:00:00Z"
updated_at: "2026-07-30T11:00:00Z"
status: "draft"
depends_on: ["feat-user-auth-001"]
related_nodes: []
resource_scope: ["src/backend/services/email","src/backend/templates/emails"]
purpose: "ユーザーが重要なイベントを確認できるようにメール通知で情報を届ける"
goal: "ユーザー登録完了時と重要な変更時に自動でメール通知が送信される状態"
scope_in: ["登録完了時メール送信","重要変更イベント検出","メールテンプレート実装","SMTP統合"]
scope_out: ["メール配信SLA管理","SPF/DKIM設定","SMS通知"]
acceptance: ["登録直後に確認メールが送信される","重要な設定変更時に通知メールが送信される","送信失敗時に再試行を実施"]
architecture_refs: ["arch-webapp-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-notification-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-30T11:00:00Z","origin_kind":"generated","source_digest":"7c08c499e176f8c3f6f0349a5d22bead19b24bc9a5605911b68afc1003a14577","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "Email notification feature for user lifecycle events"
classification_candidates: []
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

# 目的

ユーザーが重要なイベントを確認できるようにメール通知で情報を届ける。

## 到達状態

ユーザー登録完了時と重要な変更時に自動でメール通知が送信される状態。

## スコープ

- スコープ内: 登録完了時メール送信、重要変更イベント検出、メールテンプレート実装、SMTP統合
- スコープ外: メール配信SLA管理、SPF/DKIM設定、SMS通知

## 受入

- [ ] 登録直後に確認メールが送信される
- [ ] 重要な設定変更時に通知メールが送信される
- [ ] 送信失敗時に再試行を実施

## アーキテクチャ参照

- `architecture_refs`: arch-webapp-001

## 機能間依存

- `depends_on`: feat-user-auth-001
- 依存理由: 通知メールの送信先はユーザー登録情報に依存するため、認証基盤が先に必要

## Handoff

- per-feature planning: ready 時に system-dev-planner を自動起動
- 生成物: P01..P13 exact 13 executable task specs + 13-node intra-feature DAG
- 登録先: 全taskを同一parent_feature/feature_package_idでC02経由atomic登録
- 完了rollup: exact 13全done + P07/P10/P11 evidenceがfeature acceptanceを満たす場合だけdone
