---
graph_node_id: "issue-legacy-backfill-provenance-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["spec-state","provenance","schema"]
priority: "low"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "design_application_provenance.mode=legacy_backfill に backfill 根拠を持たせる"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:13.746339Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py","system-spec/spec-state.json"]
purpose: "backfill された設計解釈の根拠を追跡できるようにする"
goal: "legacy_backfill の provenance が backfill 根拠を保持し、C05 の再照合が根拠付きで行える状態"
scope_in: ["provenance schema への根拠フィールド追加","set-qa-design-applications の対応"]
scope_out: ["既存 backfill 済みデータの遡及補完"]
acceptance: ["新規 backfill で根拠が記録される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/legacy-backfill-provenance-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d51b98b187fad79306420409a5d05a7e4cec3be553cf440197e042359f599483","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "backfill された設計解釈の根拠を追跡できるようにする"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/legacy-backfill-provenance-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-r1mh","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

design_application_provenance.mode=legacy_backfill に backfill 根拠を持たせる

## 背景と問題

backfill された設計解釈の根拠を追跡できるようにする

## 現在の挙動

### 内容

`design_application_provenance.mode=legacy_backfill` は backfill であることを示すだけで、なぜその解釈を当てたかの根拠を持たない。C05 が backfill の回答適合を再照合する際の入力が不足している。

## 期待する挙動

legacy_backfill の provenance が backfill 根拠を保持し、C05 の再照合が根拠付きで行える状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: documentation
- 深刻度: low
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - provenance schema への根拠フィールド追加
  - set-qa-design-applications の対応
- Out:
  - 既存 backfill 済みデータの遡及補完

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 新規 backfill で根拠が記録される

## 検証証跡

- 対象 path:
- `plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py`
- `system-spec/spec-state.json`
- 証跡 path: eval-log/dev-graph/
