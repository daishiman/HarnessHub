---
graph_node_id: "feat-assignment-dashboard-001"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "internal-business-portal"
domain: "internal-portal"
tags: ["dashboard","assignment","deadline"]
priority: null
start_date: null
target_date: null
iteration: null
title: "割当作業と期限のダッシュボード"
owners: []
created_at: "2026-08-08T18:33:12Z"
updated_at: "2026-08-08T18:33:12Z"
status: "draft"
depends_on: ["feat-account-login-001"]
related_nodes: []
resource_scope: ["src/portal/web/dashboard","src/portal/data/assignment"]
purpose: "ログインした利用者が自分に割り当てられた作業と期限を 1 画面で把握できる状態を作る"
goal: "ログイン後のダッシュボードで、自分に割り当てられた作業と各作業の期限が一覧表示されている状態"
scope_in: ["ダッシュボード画面","利用者単位の割当作業取得","期限の表示と並び替え"]
scope_out: ["作業の新規作成と編集","他人の割当の閲覧","全社横断の集計表示"]
acceptance: ["ログイン利用者のダッシュボードに自分の割当作業だけが表示される","各作業行に期限が表示される","割当が 0 件の利用者には空状態が表示されエラーにならない"]
architecture_refs: ["arch-portal-platform-001","arch-portal-data-notify-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-assignment-dashboard-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T18:33:12Z","origin_kind":"generated","source_digest":"aae36bba439a0ba94b4761689cbdd4651b39cbb65900c2331091fd6c199e139a","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "自然文 want の「ログイン後のダッシュボードで割当作業と期限を一覧」を独立価値の機能単位として切り出した"
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

ログインした利用者が自分に割り当てられた作業と期限を 1 画面で把握できる状態を作る。

## 到達状態

ログイン後のダッシュボードで、自分に割り当てられた作業と各作業の期限が一覧表示されている状態。

## スコープ

- スコープ内: ダッシュボード画面、利用者単位の割当作業取得、期限の表示と並び替え
- スコープ外: 作業の新規作成と編集、他人の割当の閲覧、全社横断の集計表示

## 受入

- [ ] ログイン利用者のダッシュボードに自分の割当作業だけが表示される
- [ ] 各作業行に期限が表示される
- [ ] 割当が 0 件の利用者には空状態が表示されエラーにならない

## アーキテクチャ参照

- `architecture_refs`: `arch-portal-platform-001`、`arch-portal-data-notify-001`

## 機能間依存

- `depends_on`: `feat-account-login-001`
- 依存理由: 表示対象を「自分の割当」に絞るには認証済み利用者の識別が先に成立している必要がある。

## Handoff

- per-feature planning: 機能間依存が満たされ confirmed / evaluation pass / readiness complete に到達した時点で system-dev-planner (run-system-dev-plan) へ引き渡す。
- 生成物: P01..P13 の exact 13 executable task specs と 13-node intra-feature DAG。
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録する。
- 完了 rollup: exact 13 が全て done かつ P07 / P10 / P11 の evidence が本 feature の受入条件を満たした場合だけ done とする。
