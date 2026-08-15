---
graph_node_id: "issue-audit-verdict-marker-ssot-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["audit-fork","verdict","ssot"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "監査 agent の AUDIT_VERDICT marker を SSOT prompt で必須化する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:15.816571Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/agents/"]
purpose: "marker を書かずに終わる監査 fork を構造的になくす"
goal: "全監査 agent の SSOT prompt が最終応答の marker 出力を必須と定め、台帳が pending で滞留しない状態"
scope_in: ["各監査 agent 定義への marker 必須化","marker 形式の統一"]
scope_out: ["監査内容そのものの変更"]
acceptance: ["監査 fork の verdict_state=pending 残留が 0 件 (検査件数併記)"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/audit-verdict-marker-ssot-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7f7faab0d2f17d1e0bb9ff0c3f15fe514d2a086c68783332efca0bd529c58374","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "marker を書かずに終わる監査 fork を構造的になくす"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/audit-verdict-marker-ssot-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-l0yk","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

監査 agent の AUDIT_VERDICT marker を SSOT prompt で必須化する

## 背景と問題

marker を書かずに終わる監査 fork を構造的になくす

## 現在の挙動

### 内容

`c07-matrix-r5` / `r6` / doc-freshness fork のように、監査を終えても最終応答に `AUDIT_VERDICT:` marker を書かない fork がある。台帳は marker でしか verdict を回収できないため、これらは永久に pending で残る。

各監査 agent の定義 (SSOT prompt) 側で marker 出力を必須にする。

### 関連

[[#1 監査 fork 台帳の pending 解決]] / [[#2 doc-freshness fork が idle 通知のみ]]。

## 期待する挙動

全監査 agent の SSOT prompt が最終応答の marker 出力を必須と定め、台帳が pending で滞留しない状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 各監査 agent 定義への marker 必須化
  - marker 形式の統一
- Out:
  - 監査内容そのものの変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 監査 fork の verdict_state=pending 残留が 0 件 (検査件数併記)

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/agents/`
- 証跡 path: eval-log/dev-graph/
