---
graph_node_id: "issue-bd-bridge-create-no-graph-linkage-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["c28","beads","linkage","sync"]
priority: "critical"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "bd-bridge --op create が graph の beads_linkage を書かず sync が永久に未収束になる"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:21.714579Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/scripts/bd-bridge.py","plugins/dev-graph/scripts/sync-graph.py"]
purpose: "起票しても sync が収束しない二段構えの罠を解消する"
goal: "create が graph 側 linkage まで責任を持つか、少なくとも未記録を機械的に検出できる状態"
scope_in: ["create 時の linkage 記録経路の設計","未記録の検出"]
scope_out: ["C02 単一 writer 原則の緩和"]
acceptance: ["create 直後の sync dry-run で external_linkage_missing が 0 件になる (検査件数併記)"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/bd-bridge-create-no-graph-linkage-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"4e7682ccd1b4c4543171b8c768b89c86f75e74d435115fef1fac7414f4ff2ffe","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "起票しても sync が収束しない二段構えの罠を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/bd-bridge-create-no-graph-linkage-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-paib","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

bd-bridge --op create が graph の beads_linkage を書かず sync が永久に未収束になる

## 背景と問題

起票しても sync が収束しない二段構えの罠を解消する

## 現在の挙動

### 実測

本セッションで 14 node を `bd-bridge.py --op create` で起票した直後、sync dry-run は 14 件すべてを `{binding: beads, reason: external_linkage_missing}` として報告し続けた。`sync-graph.py` は graph 側の `beads_linkage` だけを見るため、bd 側に課題ができても graph に記録が無ければ差分は消えない。

C02 `upsert-node.py` の patch で `beads_linkage = {bd_issue_id, linked_at, sync_state: "linked"}` を後追い記録して初めて scope entries が 0 件になった (pending_retry 41 → 27)。

### 問題

この二段構えは `graph-node.schema.json` の記述にしか書かれておらず、`--op create` の receipt にも警告が出ない。起票だけして「同期したつもり」になる典型的な fail-open。

### 関連

[[#29 sync-graph.py に --scope が無い]]。

## 期待する挙動

create が graph 側 linkage まで責任を持つか、少なくとも未記録を機械的に検出できる状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: critical
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - create 時の linkage 記録経路の設計
  - 未記録の検出
- Out:
  - C02 単一 writer 原則の緩和

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] create 直後の sync dry-run で external_linkage_missing が 0 件になる (検査件数併記)

## 検証証跡

- 対象 path:
- `plugins/dev-graph/scripts/bd-bridge.py`
- `plugins/dev-graph/scripts/sync-graph.py`
- 証跡 path: eval-log/dev-graph/
