---
graph_node_id: "feat-user-auth-001"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "webapp-minimal"
domain: "web-application"
tags: ["user-authentication","registration","login"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ユーザー登録とログイン"
owners: []
created_at: "2026-07-30T11:00:00Z"
updated_at: "2026-07-30T11:01:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["src/auth","src/backend/models/user"]
purpose: "ユーザーがメールアドレスとパスワードで登録・ログイン可能にし、アプリケーションへのアクセス制御を実現する"
goal: "登録したユーザーがメールアドレスとパスワードでログインでき、セッションを通じて認証状態が維持される状態"
scope_in: ["ユーザー登録画面","ログイン画面","パスワードハッシング・セッション管理","エラーハンドリング"]
scope_out: ["パスワードリセット","ソーシャルログイン","二要素認証"]
acceptance: ["新規ユーザーが有効なメールとパスワードで登録後ログイン可能","不正ログイン試行は拒否される","ログイン後セッション維持"]
architecture_refs: ["arch-webapp-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-user-auth-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"5096dd605e519272437d1efea0bf8d5b33d8ef23a40171ae103ec7125b9b8aff","evaluator":"run-dev-graph-decompose","evidence_ref":"eval-log/macro-preview.json"}
source_lineage: {"imported_at":"2026-07-30T11:00:00Z","origin_kind":"generated","source_digest":"7c08c499e176f8c3f6f0349a5d22bead19b24bc9a5605911b68afc1003a14577","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "Core feature for user registration and login"
classification_candidates: []
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-30T11:01:00Z","missing_sections":[],"status":"complete"}
---

# 目的

ユーザーがメールアドレスとパスワードで登録・ログイン可能にし、アプリケーションへのアクセス制御を実現する。

## 到達状態

登録したユーザーがメールアドレスとパスワードでログインでき、セッションを通じて認証状態が維持される状態。

## スコープ

- スコープ内: ユーザー登録画面、ログイン画面、パスワードハッシング・セッション管理、エラーハンドリング
- スコープ外: パスワードリセット、ソーシャルログイン、二要素認証

## 受入

- [ ] 新規ユーザーが有効なメールとパスワードで登録後ログイン可能
- [ ] 不正ログイン試行は拒否される
- [ ] ログイン後セッション維持

## アーキテクチャ参照

- `architecture_refs`: arch-webapp-001

## 機能間依存

- `depends_on`: なし
- 依存理由: 基盤機能であり他機能への依存なし

## Handoff

- per-feature planning: ready 時に system-dev-planner を自動起動
- 生成物: P01..P13 exact 13 executable task specs + 13-node intra-feature DAG
- 登録先: 全taskを同一parent_feature/feature_package_idでC02経由atomic登録
- 完了rollup: exact 13全done + P07/P10/P11 evidenceがfeature acceptanceを満たす場合だけdone
