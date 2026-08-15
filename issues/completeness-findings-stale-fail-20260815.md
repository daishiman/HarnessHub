---
graph_node_id: "issue-completeness-findings-stale-fail-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["completeness","stale","findings"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "completeness-findings.json に解消済みの旧 FAIL が残置している"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:18.753860Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/completeness-findings.json","system-spec/completeness-report.json"]
purpose: "解消済み finding が残り、現状の判定と食い違う状態を解消する"
goal: "findings が現行 completeness-report と一致し、解消済み FAIL が残らない状態"
scope_in: ["旧 FAIL の棚卸し","report との整合検査"]
scope_out: ["新規 finding の追加"]
acceptance: ["findings と completeness-report.json の verdict が矛盾しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/completeness-findings-stale-fail-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"075897f4259f3bb312654106d4291de32144821b2bc4db193441635ec956198c","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "解消済み finding が残り、現状の判定と食い違う状態を解消する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/completeness-findings-stale-fail-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-tuk2","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

completeness-findings.json に解消済みの旧 FAIL が残置している

## 背景と問題

解消済み finding が残り、現状の判定と食い違う状態を解消する

## 現在の挙動

### 内容

`completeness-findings.json` に、既に解消された旧 FAIL が残っている。現行の `completeness-report.json` は verdict=PASS (findings 8 件 / info 4・low 4) であり、両者が食い違う。

## 期待する挙動

findings が現行 completeness-report と一致し、解消済み FAIL が残らない状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: documentation
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 旧 FAIL の棚卸し
  - report との整合検査
- Out:
  - 新規 finding の追加

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] findings と completeness-report.json の verdict が矛盾しない

## 検証証跡

- 対象 path:
- `system-spec/completeness-findings.json`
- `system-spec/completeness-report.json`
- 証跡 path: eval-log/dev-graph/
