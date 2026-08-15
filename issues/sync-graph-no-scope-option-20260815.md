---
graph_node_id: "issue-sync-graph-no-scope-option-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["c03","sync","scope","blast-radius"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "sync-graph.py に --scope が無く repo 全体一括でしか動かない"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:22.579015Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/scripts/sync-graph.py"]
purpose: "対象 feature だけを同期できず、巻き添え書換のリスクと長い実行時間を強いられる状態を解消する"
goal: "sync-graph.py が --scope を受け、指定 subtree だけを 3-way 突合・apply できる状態"
scope_in: ["--scope の実装 (subtree 限定)","scope 外 entry の明示的な skip 報告"]
scope_out: ["3-way 判定規則の変更"]
acceptance: ["--scope 指定時に scope 外の imports/exports が 0 件になる (検査件数併記)"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sync-graph-no-scope-option-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a75ec68518b8722d5a1098fc921a7764866b1661d744b2c71c3285d7a913403f","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "対象 feature だけを同期できず、巻き添え書換のリスクと長い実行時間を強いられる状態を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sync-graph-no-scope-option-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-m6xr","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

sync-graph.py に --scope が無く repo 全体一括でしか動かない

## 背景と問題

対象 feature だけを同期できず、巻き添え書換のリスクと長い実行時間を強いられる状態を解消する

## 現在の挙動

### 実測

`--scope` が無いため、対象 feature 14 node だけを収束させたい場面でも repo 全体 127 差分 (imports 126 / exports 1) を一括 apply するしかない。

imports 126 件は全て対象外の他 feature (task 62 / issue 57 / feature 7) に対する status closed 化 110 件・title の `[SUPERSEDED→...]` 付与 10 件・depends_on 変更 6 件だった。同一 branch で並行セッションが動いている状況では巻き添えのリスクが高い。

さらに node ごとに `bd-bridge --op show` を逐次 subprocess 起動する設計のため 1 回あたり約 11 分かかる。

### 関連

[[#27 bd-bridge --op create が graph の beads_linkage を書かない]]。

## 期待する挙動

sync-graph.py が --scope を受け、指定 subtree だけを 3-way 突合・apply できる状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - --scope の実装 (subtree 限定)
  - scope 外 entry の明示的な skip 報告
- Out:
  - 3-way 判定規則の変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] --scope 指定時に scope 外の imports/exports が 0 件になる (検査件数併記)

## 検証証跡

- 対象 path:
- `plugins/dev-graph/scripts/sync-graph.py`
- 証跡 path: eval-log/dev-graph/
