---
graph_node_id: "issue-mvp-first-scheduling-completion-projection-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["close-loop","open-residue","follow-up","qa-069","mvp-first"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "MVP-first feature 13 node の completion projection 未実施 (lint-open-residue OR-003 13件)"
owners: ["daishiman"]
created_at: "2026-07-24T07:45:00Z"
updated_at: "2026-07-24T07:55:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-mvp-first-scheduling"]
resource_scope: ["issues/sys-live-trial-closure-stale-mvp-first-20260723.md"]
purpose: "PR #47 (merge commit 8d802c2) で feat-mvp-first-scheduling が main へ統合され beads HarnessHub-6gl.1..13 は closed だが、graph の SYS-MVP-FIRST-SCHEDULING-P01..P13 は completion_evidence=in_progress のまま残置され lint-open-residue OR-003 が 13 件検出される。policy は全 node linked_pr_merged_all のため、正規の解消は C26 reconcile-github-lifecycle の実走のみ (手動 ce 書換は completion authority の偽装で禁止)。gh:pr gate (HarnessHub-6gl.N <-> PR #47) は 2026-07-24 作成済み。C26 は起動時に clean main worktree を要求するため、P13 projection commit 後に 1 node ずつ reconcile し projection commit を挟んで直列実行する"
goal: "SYS-MVP-FIRST-SCHEDULING-P01..P13 が C26 reconcile で durable done になり、lint-open-residue.py --repo-root . が exit 0 に収束している"
scope_in: ["dev-graph 9 skill (init/node/sync/requirements/render/decompose/schedule/status/system-spec) の live-trial 再実行","scenario-verdict.json / live-trial verdict.json の再生成","test_skill_criteria_evidence.py 全件 PASS の確認"]
scope_out: ["鮮度ゲート (test_skill_criteria_evidence.py) 自体の緩和・skip 追加","証跡 receipt の手書き修正 (受け入れ不可: 証跡改ざん)","P05 実装コードの変更"]
acceptance: ["test_skill_criteria_evidence.py の stale behavior closure digest 起因の FAIL が 0 件になる","各 verdict の skill_dir_tree_sha が現行 closure と一致する","live-trial は tier=live で取得され downgrade_reason が null である"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-mvp-first-scheduling-completion-projection-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-23T13:51:02Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "PR #47 merge 後の close-loop 未投影 (OR-003) を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-mvp-first-scheduling-completion-projection-20260724.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xjv","linked_at":"2026-07-24T07:55:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-23T13:51:02Z","missing_sections":[],"status":"incomplete"}
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
