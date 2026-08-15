---
graph_node_id: "issue-uiux-desktop-qa-ref-thin-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["spec-state","qa-ref","c07-finding"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "ui-ux の desktop 2 セルの qa_ref を UI-UX 固有の質疑へ結び直す"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:12.086237Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/spec-state.json","system-spec/ui-ux.md"]
purpose: "UI-UX の意思決定根拠が技術選定の質疑に代替されている状態を正す"
goal: "ui-ux/desktop-windows・desktop-macos が UI-UX 固有の質疑を qa_ref として持つ状態"
scope_in: ["R4-reopen → confirm → set-approval の 3 op","UI-UX 固有の新規 qa の起票"]
scope_out: ["他 platform セルの再確定"]
acceptance: ["両セルの qa_ref が UI-UX 固有の質疑を指す","validate-coverage-matrix.py --require-complete が exit 0"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/uiux-desktop-qa-ref-thin-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"69aa1a62355f57d7d8d6706a9b00bff7aadfaa04a23bf3d3ce5ac2ef05ff7b24","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "UI-UX の意思決定根拠が技術選定の質疑に代替されている状態を正す"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/uiux-desktop-qa-ref-thin-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-zhcy","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

ui-ux の desktop 2 セルの qa_ref を UI-UX 固有の質疑へ結び直す

## 背景と問題

UI-UX の意思決定根拠が技術選定の質疑に代替されている状態を正す

## 現在の挙動

### 指摘元

C07 マトリクス網羅性監査 (2026-08-14)。

### 内容

両セルが参照する `qa-007` は「フロントエンド構成 (Next.js + TypeScript / pnpm)」の技術選定を主題とする質疑で、UI-UX (画面設計・崩れ対応) を直接裏付けていない。同一技術スタックゆえの派生的正当化と読めるが、UI-UX 固有の意思決定根拠としては薄い。

### 是正手順

R4-reopen → confirm → set-approval の 3 op。UI-UX 固有の質疑 (28 route × 3 幅 × 2 テーマの実ブラウザ検査・折返し位置の意図設計) を新規 qa として起こして参照させる。

## 期待する挙動

ui-ux/desktop-windows・desktop-macos が UI-UX 固有の質疑を qa_ref として持つ状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: ui-ux
- 深刻度: medium
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - R4-reopen → confirm → set-approval の 3 op
  - UI-UX 固有の新規 qa の起票
- Out:
  - 他 platform セルの再確定

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 両セルの qa_ref が UI-UX 固有の質疑を指す
- [ ] validate-coverage-matrix.py --require-complete が exit 0

## 検証証跡

- 対象 path:
- `system-spec/spec-state.json`
- `system-spec/ui-ux.md`
- 証跡 path: eval-log/dev-graph/
