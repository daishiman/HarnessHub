---
graph_node_id: "feat-progress-report-001"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "internal-business-portal"
domain: "internal-portal"
tags: ["reporting","aggregation","admin"]
priority: null
start_date: null
target_date: null
iteration: null
title: "管理者向け全社進捗レポート"
owners: []
created_at: "2026-08-08T18:33:12Z"
updated_at: "2026-08-08T18:33:12Z"
status: "draft"
depends_on: ["feat-account-login-001","feat-assignment-dashboard-001"]
related_nodes: []
resource_scope: ["src/portal/web/report","src/portal/data/aggregate"]
purpose: "管理者が全社の作業進捗を集計された形で把握できる状態を作り、遅延の偏りを判断可能にする"
goal: "管理者が全社の進捗を集計したレポートを閲覧できる状態"
scope_in: ["全社進捗の集計","レポート閲覧画面","管理者権限による閲覧制御"]
scope_out: ["レポートの外部エクスポート","任意条件のアドホック分析","個人評価指標の算出"]
acceptance: ["管理者は全社の進捗を集計したレポートを閲覧できる","管理者でない利用者のレポート閲覧要求は拒否される","レポートの集計値がダッシュボードと同一の割当データから導出される"]
architecture_refs: ["arch-portal-platform-001","arch-portal-data-notify-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-progress-report-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T18:33:12Z","origin_kind":"generated","source_digest":"aae36bba439a0ba94b4761689cbdd4651b39cbb65900c2331091fd6c199e139a","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "自然文 want の「管理者は全社の進捗を集計したレポートを閲覧できる」を独立価値の機能単位として切り出した"
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

管理者が全社の作業進捗を集計された形で把握できる状態を作り、遅延の偏りを判断可能にする。

## 到達状態

管理者が全社の進捗を集計したレポートを閲覧できる状態。

## スコープ

- スコープ内: 全社進捗の集計、レポート閲覧画面、管理者権限による閲覧制御
- スコープ外: レポートの外部エクスポート、任意条件のアドホック分析、個人評価指標の算出

## 受入

- [ ] 管理者は全社の進捗を集計したレポートを閲覧できる
- [ ] 管理者でない利用者のレポート閲覧要求は拒否される
- [ ] レポートの集計値がダッシュボードと同一の割当データから導出される

## アーキテクチャ参照

- `architecture_refs`: `arch-portal-platform-001`、`arch-portal-data-notify-001`

## 機能間依存

- `depends_on`: `feat-account-login-001`、`feat-assignment-dashboard-001`
- 依存理由: 管理者判定には認証済み利用者の識別が必要で、集計対象は割当作業と期限の正本である。

## Handoff

- per-feature planning: 機能間依存が満たされ confirmed / evaluation pass / readiness complete に到達した時点で system-dev-planner (run-system-dev-plan) へ引き渡す。
- 生成物: P01..P13 の exact 13 executable task specs と 13-node intra-feature DAG。
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録する。
- 完了 rollup: exact 13 が全て done かつ P07 / P10 / P11 の evidence が本 feature の受入条件を満たした場合だけ done とする。
