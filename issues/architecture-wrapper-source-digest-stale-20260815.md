---
graph_node_id: "issue-architecture-wrapper-source-digest-stale-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["source-digest","architecture","stale"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "architecture wrapper の source_digest が自動追従しない"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:19.183206Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["architecture/","plugins/dev-graph/scripts/validate-source-digest.py"]
purpose: "上流 artifact の更新で wrapper の digest が stale になる状態を解消する"
goal: "wrapper の source_digest が上流更新に追従し、validate-source-digest が stale を出さない状態"
scope_in: ["digest 追従の自動化または明示的な再計算導線"]
scope_out: ["digest 検査規則の緩和"]
acceptance: ["上流更新後に validate-source-digest.py が exit 0"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/architecture-wrapper-source-digest-stale-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1e8dadb76d22f5a3b078e08f8debb9a3a45da03ed918418c4966a810992dd5a2","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "上流 artifact の更新で wrapper の digest が stale になる状態を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/architecture-wrapper-source-digest-stale-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-g3kv","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

architecture wrapper の source_digest が自動追従しない

## 背景と問題

上流 artifact の更新で wrapper の digest が stale になる状態を解消する

## 現在の挙動

### 内容

architecture wrapper node の `source_digest` が上流 artifact の更新に追従せず、手で再計算しない限り stale のまま残る。記憶の教訓どおり、digest だけを現在値へ書き換える修正は stale 検出を無効化するため禁止であり、追従経路そのものを作る必要がある。

## 期待する挙動

wrapper の source_digest が上流更新に追従し、validate-source-digest が stale を出さない状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: documentation
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - digest 追従の自動化または明示的な再計算導線
- Out:
  - digest 検査規則の緩和

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 上流更新後に validate-source-digest.py が exit 0

## 検証証跡

- 対象 path:
- `architecture/`
- `plugins/dev-graph/scripts/validate-source-digest.py`
- 証跡 path: eval-log/dev-graph/
