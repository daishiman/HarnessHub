---
graph_node_id: "feat-account-login-001"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "internal-business-portal"
domain: "internal-portal"
tags: ["authentication","login","session"]
priority: null
start_date: null
target_date: null
iteration: null
title: "アカウントログインと認証セッション"
owners: []
created_at: "2026-08-08T18:33:12Z"
updated_at: "2026-08-08T18:40:00Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["src/portal/auth"]
purpose: "利用者が自分のアカウントで業務ポータルへ入れる状態を作り、以降の全機能の利用者識別を成立させる"
goal: "利用者が自分のアカウント資格情報でログインでき、ログイン状態が後続画面へ引き継がれている状態"
scope_in: ["ログイン画面","資格情報の検証","認証セッションの発行と維持","ログアウト"]
scope_out: ["パスワードリセット","二要素認証","社外 IdP 連携"]
acceptance: ["有効な資格情報でログインすると認証セッションが発行される","無効な資格情報のログイン試行は拒否されセッションが発行されない","ログイン済み利用者は再認証なしで後続画面へ遷移できる"]
architecture_refs: ["arch-portal-platform-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-account-login-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"3e1ae972c6361f393dbba86e23a6f37413704340f24be14813f38b605b1ff195","evaluator":"run-dev-graph-decompose/live-trial C14-OUT1-positive-macro-decomposition-r9","evidence_ref":"eval-log/c14-promotion-evaluation.json"}
source_lineage: {"imported_at":"2026-08-08T18:33:12Z","origin_kind":"generated","source_digest":"aae36bba439a0ba94b4761689cbdd4651b39cbb65900c2331091fd6c199e139a","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "自然文 want の「自分のアカウントでログインできる」を独立価値の機能単位として切り出した"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-08T18:40:00Z","missing_sections":[],"status":"complete"}
---

# 目的

利用者が自分のアカウントで業務ポータルへ入れる状態を作り、以降の全機能の利用者識別を成立させる。

## 到達状態

利用者が自分のアカウント資格情報でログインでき、ログイン状態が後続画面へ引き継がれている状態。

## スコープ

- スコープ内: ログイン画面、資格情報の検証、認証セッションの発行と維持、ログアウト
- スコープ外: パスワードリセット、二要素認証、社外 IdP 連携

## 受入

- [ ] 有効な資格情報でログインすると認証セッションが発行される
- [ ] 無効な資格情報のログイン試行は拒否されセッションが発行されない
- [ ] ログイン済み利用者は再認証なしで後続画面へ遷移できる

## アーキテクチャ参照

- `architecture_refs`: `arch-portal-platform-001`

## 機能間依存

- `depends_on`: なし (先行機能を持たない)
- 依存理由: 先行する機能間依存は無い。認証は他 3 機能の前提であり自身は他機能に依存しない。

## Handoff

- per-feature planning: 機能間依存が満たされ confirmed / evaluation pass / readiness complete に到達した時点で system-dev-planner (run-system-dev-plan) へ引き渡す。
- 生成物: P01..P13 の exact 13 executable task specs と 13-node intra-feature DAG。
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録する。
- 完了 rollup: exact 13 が全て done かつ P07 / P10 / P11 の evidence が本 feature の受入条件を満たした場合だけ done とする。
