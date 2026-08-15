---
graph_node_id: "issue-staging-manifest-canonical-digest-null-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-dev-planner","manifest","digest"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "architect が出す staging-manifest.json の canonical_digest が null"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:19.608014Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-dev-planner/"]
purpose: "promotion の同一性検証に使う canonical digest が欠落する状態を解消する"
goal: "staging-manifest.json が非 null の canonical_digest を持ち、C12/evaluator が同一 digest で PASS できる状態"
scope_in: ["architect の manifest 生成での digest 計算"]
scope_out: ["digest アルゴリズムの変更"]
acceptance: ["生成直後の staging-manifest.json の canonical_digest が非 null"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/staging-manifest-canonical-digest-null-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ccca4d5945741919a33bcbed7812dedcad95430ffac7732d4723b98842c9de63","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "promotion の同一性検証に使う canonical digest が欠落する状態を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/staging-manifest-canonical-digest-null-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-nqa7","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

architect が出す staging-manifest.json の canonical_digest が null

## 背景と問題

promotion の同一性検証に使う canonical digest が欠落する状態を解消する

## 現在の挙動

### 内容

system-dev-plan architect が出力する `staging-manifest.json` の `canonical_digest` が null のまま。C12 deterministic validation と fork evaluator C1..C4 が「同一 canonical digest で PASS」する完了条件を機械的に検証できない。

## 期待する挙動

staging-manifest.json が非 null の canonical_digest を持ち、C12/evaluator が同一 digest で PASS できる状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - architect の manifest 生成での digest 計算
- Out:
  - digest アルゴリズムの変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 生成直後の staging-manifest.json の canonical_digest が非 null

## 検証証跡

- 対象 path:
- `plugins/system-dev-planner/`
- 証跡 path: eval-log/dev-graph/
