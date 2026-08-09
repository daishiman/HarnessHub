---
graph_node_id: "feat-deadline-notification-001"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "internal-business-portal"
domain: "internal-portal"
tags: ["notification","deadline","reminder"]
priority: null
start_date: null
target_date: null
iteration: null
title: "期限接近作業の通知配信"
owners: []
created_at: "2026-08-08T18:33:12Z"
updated_at: "2026-08-08T18:33:12Z"
status: "draft"
depends_on: ["feat-assignment-dashboard-001"]
related_nodes: []
resource_scope: ["src/portal/notification"]
purpose: "期限が近い作業を利用者が見落とさない状態を作り、期限超過を未然に減らす"
goal: "期限が近づいた割当作業について、担当利用者へ通知が届いている状態"
scope_in: ["期限接近判定","担当利用者への通知生成","通知送信履歴の記録"]
scope_out: ["通知チャネルの利用者別カスタマイズ","エスカレーション通知","既読管理"]
acceptance: ["期限接近と判定された割当作業について担当利用者へ通知が 1 通生成される","同一作業の同一判定に対して通知が重複送信されない","期限接近でない作業について通知が生成されない"]
architecture_refs: ["arch-portal-data-notify-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-deadline-notification-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T18:33:12Z","origin_kind":"generated","source_digest":"aae36bba439a0ba94b4761689cbdd4651b39cbb65900c2331091fd6c199e139a","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "自然文 want の「期限が近い作業は通知として届く」を独立価値の機能単位として切り出した"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

# 目的

期限が近い作業を利用者が見落とさない状態を作り、期限超過を未然に減らす。

## 到達状態

期限が近づいた割当作業について、担当利用者へ通知が届いている状態。

## スコープ

- スコープ内: 期限接近判定、担当利用者への通知生成、通知送信履歴の記録
- スコープ外: 通知チャネルの利用者別カスタマイズ、エスカレーション通知、既読管理

## 受入

- [ ] 期限接近と判定された割当作業について担当利用者へ通知が 1 通生成される
- [ ] 同一作業の同一判定に対して通知が重複送信されない
- [ ] 期限接近でない作業について通知が生成されない

## アーキテクチャ参照

- `architecture_refs`: `arch-portal-data-notify-001`

## 機能間依存

- `depends_on`: `feat-assignment-dashboard-001`
- 依存理由: 通知対象は「利用者に割り当てられた作業とその期限」であり、割当と期限の正本を扱う機能が先に成立している必要がある。

## Handoff

- per-feature planning: 機能間依存が満たされ confirmed / evaluation pass / readiness complete に到達した時点で system-dev-planner (run-system-dev-plan) へ引き渡す。
- 生成物: P01..P13 の exact 13 executable task specs と 13-node intra-feature DAG。
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録する。
- 完了 rollup: exact 13 が全て done かつ P07 / P10 / P11 の evidence が本 feature の受入条件を満たした場合だけ done とする。
