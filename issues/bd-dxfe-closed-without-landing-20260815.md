---
graph_node_id: "issue-bd-dxfe-closed-without-landing-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["beads","close-gate","landing"]
priority: "critical"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "bd HarnessHub-dxfe が未 landed の修正でクローズされている"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:17.070817Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/scripts/bd-bridge.py"]
purpose: "未着地の修正でクローズされた課題を正し、close gate の穴を塞ぐ"
goal: "HarnessHub-dxfe の状態が実際の着地状況と一致し、同種の誤クローズが gate で防がれる状態"
scope_in: ["当該課題の状態是正","close 時の landing 検証"]
scope_out: ["他課題の遡及監査"]
acceptance: ["当該課題が実状態と一致する","未 landed の close が gate で拒否される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/bd-dxfe-closed-without-landing-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f4c4d36992e66314934bdd6300712a376eada0d97ac4f278178aa2ea5deb7aff","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "未着地の修正でクローズされた課題を正し、close gate の穴を塞ぐ"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/bd-dxfe-closed-without-landing-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-m1d8","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

bd HarnessHub-dxfe が未 landed の修正でクローズされている

## 背景と問題

未着地の修正でクローズされた課題を正し、close gate の穴を塞ぐ

## 現在の挙動

### 内容

bd 課題 `HarnessHub-dxfe` が、修正が default branch へ着地していない状態でクローズされている。close の判断根拠が landing 検証に係留されていない。

### 関連

記憶「[[dev-graph-pr-linkage-post-merge]]」の PR 追跡は merge 後という原則と同系。

## 期待する挙動

HarnessHub-dxfe の状態が実際の着地状況と一致し、同種の誤クローズが gate で防がれる状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: dev-workflow
- 深刻度: critical
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 当該課題の状態是正
  - close 時の landing 検証
- Out:
  - 他課題の遡及監査

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 当該課題が実状態と一致する
- [ ] 未 landed の close が gate で拒否される

## 検証証跡

- 対象 path:
- `plugins/dev-graph/scripts/bd-bridge.py`
- 証跡 path: eval-log/dev-graph/
