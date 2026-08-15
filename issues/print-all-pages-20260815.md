---
graph_node_id: "issue-print-all-pages-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["print","future","ui"]
priority: "low"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "全ページを印刷できるようにする (将来課題)"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00.000000Z"
updated_at: "2026-08-14T21:58:16.230914Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/app/","packages/ui/src/"]
purpose: "現時点で用途が無いため非表示にした印刷機能を、必要になった時点で全ページ対応で復活させる"
goal: "全 28 route が印刷レイアウトを持ち、印刷メニューから一括出力できる状態"
scope_in: ["全 route の print CSS","印刷対象の選択 UI","印刷エントリの再表示"]
scope_out: ["現時点での実装 (非表示のまま据え置く)"]
acceptance: ["全 route が印刷プレビューで内容欠落なく表示される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/print-all-pages-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"cde592e9730aaf1a40b269f3e246d4f71a2e8d252de7d690cdc6cf062bc9b223","evaluator":"2026-08-15 dev-graph 11 verb 一括実行の実測・既存ドラフト棚卸しで確認","evidence_ref":"eval-log/dev-graph/"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "現時点で用途が無いため非表示にした印刷機能を、必要になった時点で全ページ対応で復活させる"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/print-all-pages-20260815.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-wx4h","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

全ページを印刷できるようにする (将来課題)

## 背景と問題

現時点で用途が無いため非表示にした印刷機能を、必要になった時点で全ページ対応で復活させる

## 現在の挙動

### 背景

既存の印刷画面は一部ページしか印刷できていなかった。利用者から「今のところ印刷の用途は考えられないので一旦不要・非表示にしてほしい」との判断があり、S3 として**非表示化のみ**を実装対象とした。

### 本課題の位置づけ

全ページ印刷への対応は**将来課題**として本 issue に切り出す。現行スコープでは実装しない。

### 再開の条件

利用者から印刷用途の要求が出た時点で着手する。

## 期待する挙動

全 28 route が印刷レイアウトを持ち、印刷メニューから一括出力できる状態

## 再現手順またはユースケース

1. 上記「現在の挙動」に記した証跡・実測の手順を再実行する。

## 影響と優先度

- 影響範囲: frontend
- 深刻度: low
- 緊急度: 本 issue は 2026-08-15 の dev-graph 11 verb 一括実行で洗い出した残作業として起票した。

## スコープ

- In:
  - 全 route の print CSS
  - 印刷対象の選択 UI
  - 印刷エントリの再表示
- Out:
  - 現時点での実装 (非表示のまま据え置く)

## 関連グラフ

- 原因/親ノード: なし (独立 issue)
- 関連仕様: system-spec/
- 関連アーキテクチャ: arch-harness-hub-frontend
- 解決タスク: 未起票

## 受入条件

- [ ] 全 route が印刷プレビューで内容欠落なく表示される

## 検証証跡

- 対象 path:
- `apps/hub/src/app/`
- `packages/ui/src/`
- 証跡 path: eval-log/dev-graph/
