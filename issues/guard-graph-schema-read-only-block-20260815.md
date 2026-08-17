---
graph_node_id: "issue-guard-graph-schema-read-only-block-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["hook","false-positive","guard","c10"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "guard-graph-schema.py が graph.json を read するだけの inline python を遮断する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:20.874478Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/hooks/guard-graph-schema.py"]
purpose: "graph の読み取り調査が保護 hook に遮断される状態を解消する"
goal: "graph.json の read-only inline python が通り、書込だけが遮断される状態"
scope_in: ["C10 guard の書込判定の精緻化"]
scope_out: ["C10 の書込遮断そのものの緩和"]
acceptance: ["read-only fixture が通り、書込 fixture が遮断される回帰テストが green"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/guard-graph-schema-read-only-block-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"dbf444aa8db59ddb99af0eed7397e678239c9c1dc892c51c3a1182ffe9c2646d","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "graph の読み取り調査が保護 hook に遮断される状態を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/guard-graph-schema-read-only-block-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6m5e","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

guard-graph-schema.py が graph.json を read するだけの inline python を遮断する

## 背景と問題

graph の読み取り調査が保護 hook に遮断される状態を解消する

## 現在の挙動

### 内容

`.dev-graph/state/graph.json` を `json.load` で読むだけの inline python が C10 guard に遮断される。実際の状態調査で毎回迂回 (script ファイル化) を強いられる。

記憶「[[guard-graph-schema-write-paths]]」のとおり Write/Edit は無条件 BLOCK・Bash 枝は timeout で fail-open という非対称があり、判定そのものの見直しが要る。

## 期待する挙動

graph.json の read-only inline python が通り、書込だけが遮断される状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - C10 guard の書込判定の精緻化
- Out:
  - C10 の書込遮断そのものの緩和

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] read-only fixture が通り、書込 fixture が遮断される回帰テストが green

## 検証証跡

- 対象 path:
- `plugins/dev-graph/hooks/guard-graph-schema.py`
- 証跡 path: eval-log/dev-graph/
