---
graph_node_id: "issue-auth-tenancy-plan-goalseek-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["follow-up","plan-drift","auth-tenancy","validator"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "feature-package/feat-auth-tenancy の 13 task-spec が validate-system-plan.py で fail (inner goal-seek 節の欠落 27 件)"
owners: ["daishiman"]
created_at: "2026-07-25T00:37:03Z"
updated_at: "2026-07-25T00:40:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-auth-tenancy"]
resource_scope: ["feature-package/feat-auth-tenancy/task-specs/"]
purpose: "P01-P13 実装完了後に validate-system-plan.py を走らせたところ status=fail / violations 27 件 (task-spec-section-missing 13 + inner-goal-seek-contract 13 + p13-spec-architecture-writeback 1) が出た。違反はすべて feature-package/feat-auth-tenancy/task-specs/*.md 側の記述欠落であり、実装成果物 (apps/hub 配下) の欠陥ではない。package digest sha256:98fd3cc3... は一致しており、13 task-spec は本作業で一切変更していない (git status clean) ため、plan 生成時点の planner 版と現行 validator 版の drift と判断する。fail のまま放置すると、実装側に本物の違反が出たときに 27 件のノイズへ埋もれる"
goal: "feat-auth-tenancy の plan package が現行 validator で status=pass に収束している"
scope_in: ["13 task-spec への Inner goal-seek execution loop 節の追記","phase-13 への spec write-back 節の追記","追記後の package digest 再計算と inventory 更新"]
scope_out: ["validator 側の検査緩和・skip 追加 (ゲートを弱める操作)","実装成果物 (apps/hub / packages) の変更"]
acceptance: ["validate-system-plan.py --feature-package feature-package/feat-auth-tenancy が status=pass を返す","13 task-spec すべてに Inner goal-seek execution loop 節が存在する","phase-13 に spec write-back の節が存在する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-tenancy-plan-goalseek-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T00:37:03Z","origin_kind":"manual","source_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","source_path":"feature-package/feat-auth-tenancy","source_plugin":"system-dev-planner","source_version":null}
classification_confidence: 0.9
classification_reason: "plan package 側の schema drift を追跡する issue (実装側の欠陥ではない)"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-tenancy-plan-goalseek-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mvdc","linked_at":"2026-07-25T00:40:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T00:37:03Z","missing_sections":[],"status":"incomplete"}
---

# 概要

<問題または要望を一文で記載>

## 背景と問題

<誰が、どの状況で、何に困っているか>

## 現在の挙動

<観測事実。再現不能の場合はその旨と理由>

## 期待する挙動

<解決後に観測できる状態>

## 再現手順またはユースケース

1. <step>

## 影響と優先度

- 影響範囲: <users/data/system>
- 深刻度: <critical|high|medium|low>
- 緊急度: <理由>

## スコープ

- In: <対象>
- Out: <非対象>

## 関連グラフ

- 原因/親ノード: <graph_node_id>
- 関連仕様: <graph_node_id>
- 関連アーキテクチャ: <graph_node_id>
- 解決タスク: <graph_node_id>

## 受入条件

- [ ] <観測可能な結果>

## 検証証跡

- コマンド/テスト: <how-to-verify>
- 証跡 path: <path-or-url>
