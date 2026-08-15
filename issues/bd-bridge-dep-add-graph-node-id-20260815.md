---
graph_node_id: "issue-bd-bridge-dep-add-graph-node-id-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["c28","beads","dx"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "bd-bridge --op dep-add が graph node id を受け付けずエラーが不親切"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:22.154051Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/scripts/bd-bridge.py"]
purpose: "依存辺の投影で毎回 id 変換を強いられる手間とエラーの読みづらさを解消する"
goal: "dep-add が graph node id を受け付けるか、エラーが必要な id 種別を明示する状態"
scope_in: ["graph node id の受理 (external_ref 経由の解決)","エラーメッセージの改善"]
scope_out: ["依存辺の parity 判定の変更"]
acceptance: ["graph node id を渡して dep-add が成功する、または要求 id 種別が明示される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/bd-bridge-dep-add-graph-node-id-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"4eb1ae3d08edec96667f62ecdffe565307fd570f0981e1477444615aab90f1f5","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "依存辺の投影で毎回 id 変換を強いられる手間とエラーの読みづらさを解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/bd-bridge-dep-add-graph-node-id-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-2red","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

bd-bridge --op dep-add が graph node id を受け付けずエラーが不親切

## 背景と問題

依存辺の投影で毎回 id 変換を強いられる手間とエラーの読みづらさを解消する

## 現在の挙動

### 実測

`--op dep-add` は bd 課題 ID (`HarnessHub-xxxx`) を要求し、graph node id (`SYS-...-P02`) を渡すと失敗する。エラーは `dep-add requires issue and depends-on` のみで、id の種別が違うことが読み取れない。

本セッションでは `bd list --json` の `external_ref` から対応表を作って渡し、12/12 rc=0 で通した。bridge 側が同じ解決を内部で行えるはず。

## 期待する挙動

dep-add が graph node id を受け付けるか、エラーが必要な id 種別を明示する状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - graph node id の受理 (external_ref 経由の解決)
  - エラーメッセージの改善
- Out:
  - 依存辺の parity 判定の変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] graph node id を渡して dep-add が成功する、または要求 id 種別が明示される

## 検証証跡

- 対象 path:
- `plugins/dev-graph/scripts/bd-bridge.py`
- 証跡 path: eval-log/dev-graph/
