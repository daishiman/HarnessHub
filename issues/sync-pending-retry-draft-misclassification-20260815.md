---
graph_node_id: "issue-sync-pending-retry-draft-misclassification-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["c03","sync","classification","completion-condition"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "pending_retry に draft node が積まれ続け pending_retry=0 が構造的に到達不能"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:23.008206Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/scripts/sync-graph.py"]
purpose: "完了条件が原理的に満たせない分類漏れを解消する"
goal: "tracker へ投影してはいけない node が pending_retry と別分類になり、pending_retry=0 が到達可能な状態"
scope_in: ["skipped_by_contract 相当の分類の追加","完了条件の再定義"]
scope_out: ["decompose の投影契約そのものの変更"]
acceptance: ["draft node が pending_retry に現れない","契約上 skip した件数が別途報告される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sync-pending-retry-draft-misclassification-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a6b548309a16fef1513f0ed0ea8bcc5a77250bc2680de8b664bca9891153cac9","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "完了条件が原理的に満たせない分類漏れを解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sync-pending-retry-draft-misclassification-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-x2oz","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

pending_retry に draft node が積まれ続け pending_retry=0 が構造的に到達不能

## 背景と問題

完了条件が原理的に満たせない分類漏れを解消する

## 現在の挙動

### 実測

repo 全体の `pending_retry` 27 件の内訳は confirmed 17 / draft 10。kind は task 13 (parent=feat-metrics-tracking) / feature 9 / issue 5。

draft 10 件は decompose 契約が「draft/unconfirmed/readiness incomplete を tracker へ投影しない」と定める対象、すなわち**起票してはいけない node** である。それが「再試行待ち」に積まれ続けるのは分類漏れで、`skipped_by_contract` 相当の別分類が要る。

### 影響

この分類漏れがある限り、run-dev-graph-sync skill の完了条件 `pending_retry=[]` は構造的に到達不能。skill の完了条件そのものが原理的に満たせない状態になっている。

## 期待する挙動

tracker へ投影してはいけない node が pending_retry と別分類になり、pending_retry=0 が到達可能な状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - skipped_by_contract 相当の分類の追加
  - 完了条件の再定義
- Out:
  - decompose の投影契約そのものの変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] draft node が pending_retry に現れない
- [ ] 契約上 skip した件数が別途報告される

## 検証証跡

- 対象 path:
- `plugins/dev-graph/scripts/sync-graph.py`
- 証跡 path: eval-log/dev-graph/
