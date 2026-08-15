---
graph_node_id: "issue-audit-fork-idle-pending-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["audit-fork","ledger","idle"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "idle 状態の監査 fork が pending のまま残留する"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:17.907779Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["eval-log/system-spec-harness/prototypes/resolve-audit-fork.py"]
purpose: "idle 通知だけで終わった fork の台帳行を終端させる"
goal: "idle で終わった fork が pending と区別できる状態になり、resolution_attempted_reason で原因が読める状態"
scope_in: ["台帳への resolution_attempted_reason 追加","transcript 未発見と marker 未検出の区別"]
scope_out: ["fork 起動方式の変更"]
acceptance: ["台帳から「transcript 未発見」と「marker 未検出」が区別できる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/audit-fork-idle-pending-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"e7ba639cf25e2c6d23e3c2c40ab2200fb15d5e3fdc5603be67ad16d67ac7d3ee","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "idle 通知だけで終わった fork の台帳行を終端させる"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/audit-fork-idle-pending-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-o6ge","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

idle 状態の監査 fork が pending のまま残留する

## 背景と問題

idle 通知だけで終わった fork の台帳行を終端させる

## 現在の挙動

### 内容

idle 通知だけで終わった監査 fork が台帳に pending で残る。現状は「marker を書かなかった fork」と区別できない。

`resolution_attempted_reason` を台帳へ残し、原因を分別できるようにする。

### 関連

[[#1 監査 fork 台帳の pending 解決]] の follow-up として同 issue に記載されていたもの。

## 期待する挙動

idle で終わった fork が pending と区別できる状態になり、resolution_attempted_reason で原因が読める状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: high
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 台帳への resolution_attempted_reason 追加
  - transcript 未発見と marker 未検出の区別
- Out:
  - fork 起動方式の変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 台帳から「transcript 未発見」と「marker 未検出」が区別できる

## 検証証跡

- 対象 path:
- `eval-log/system-spec-harness/prototypes/resolve-audit-fork.py`
- 証跡 path: eval-log/dev-graph/
