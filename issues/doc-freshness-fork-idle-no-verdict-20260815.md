---
graph_node_id: "issue-doc-freshness-fork-idle-no-verdict-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["audit-fork","doc-freshness","verdict"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "system-spec-doc-freshness-auditor の fork が verdict を返さず idle 通知で終わる"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:10.755979Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/agents/system-spec-doc-freshness-auditor.md","eval-log/system-spec-harness/audit-fork-ledger.jsonl"]
purpose: "verdict を返さず終わる監査 fork の経路を塞ぎ、dispatch を receipt に使える状態にする"
goal: "doc-freshness fork が必ず正規 marker を最終応答に残し、台帳が resolved へ着地する状態"
scope_in: ["fork 終了経路の調査","SSOT prompt への marker 必須化 (#13 と併せて対応)"]
scope_out: ["doc-freshness の判定ロジックそのものの変更"]
acceptance: ["当該 dispatch と同条件の再実行で verdict_state=resolved になる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/doc-freshness-fork-idle-no-verdict-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f1cdc668ca1d226269de50b497ed74d3e3a966ae9cea66d01ab87aa8f0122941","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "verdict を返さず終わる監査 fork の経路を塞ぎ、dispatch を receipt に使える状態にする"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/doc-freshness-fork-idle-no-verdict-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-rvqq","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

system-spec-doc-freshness-auditor の fork が verdict を返さず idle 通知で終わる

## 背景と問題

verdict を返さず終わる監査 fork の経路を塞ぎ、dispatch を receipt に使える状態にする

## 現在の挙動

### 証跡

台帳 `tool_use_id=toolu_01APHB9r8hbjWZ836PiaKrEU` (2026-08-14T03:11:32Z) は resolver でも解決できない。fork transcript の最終 assistant text に正規 marker が無い。

### 影響

この 1 件は `pending` のまま残り、当該 dispatch を receipt に使えない。

### 関連

[[#13 監査 agent の verdict 返却経路]] と同一の根本原因の可能性がある。

## 期待する挙動

doc-freshness fork が必ず正規 marker を最終応答に残し、台帳が resolved へ着地する状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: quality
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - fork 終了経路の調査
  - SSOT prompt への marker 必須化 (#13 と併せて対応)
- Out:
  - doc-freshness の判定ロジックそのものの変更

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 当該 dispatch と同条件の再実行で verdict_state=resolved になる

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/agents/system-spec-doc-freshness-auditor.md`
- `eval-log/system-spec-harness/audit-fork-ledger.jsonl`
- 証跡 path: eval-log/dev-graph/
