---
graph_node_id: "issue-fetched-references-version-summary-consistency-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["doc-freshness","validation","consistency"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "fetched-references の version フィールドと summary 本文の食い違いを機械検査する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:14.154833Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/fetched-references.json","plugins/system-spec-harness/scripts/validate-source-citation.py"]
purpose: "記録の構造化フィールドと散文が乖離する状態を機械層で検出する"
goal: "version フィールドと summary 本文の食い違いが決定論ゲートで検出される状態"
scope_in: ["version 値と summary 中のバージョン表記の突合検査を validator へ追加"]
scope_out: ["summary の文体規約の制定"]
acceptance: ["食い違う fixture で exit != 0 になる回帰テストが green"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/fetched-references-version-summary-consistency-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"383a7e7b046e1bce0aa7eb0e8b42d26714a7e88c50e8889cbf1ab9f7c8bd16a8","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "記録の構造化フィールドと散文が乖離する状態を機械層で検出する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/fetched-references-version-summary-consistency-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-y10t","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

fetched-references の version フィールドと summary 本文の食い違いを機械検査する

## 背景と問題

記録の構造化フィールドと散文が乖離する状態を機械層で検出する

## 現在の挙動

### 理由

本 run の finding #4 は、記録の version 値そのものは正しいのに summary の散文が古い判定を引きずっていた。両者の整合は現状どのゲートも見ていない。

## 期待する挙動

version フィールドと summary 本文の食い違いが決定論ゲートで検出される状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - version 値と summary 中のバージョン表記の突合検査を validator へ追加
- Out:
  - summary の文体規約の制定

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 食い違う fixture で exit != 0 になる回帰テストが green

## 検証証跡

- 対象 path:
- `system-spec/fetched-references.json`
- `plugins/system-spec-harness/scripts/validate-source-citation.py`
- 証跡 path: eval-log/dev-graph/
