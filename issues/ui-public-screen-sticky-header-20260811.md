---
graph_node_id: "issue-ui-public-screen-sticky-header-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-consistency","layout"]
priority: "low"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "公開画面のヘッダー固定を見直す"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-12T03:37:42Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/app/legal/page.tsx","apps/hub/src/app/device/page.tsx","packages/ui/src/shell"]
purpose: "サインイン・端末承認・規約の 3 画面で、ヘッダー固定の要否を将来再判断する。"
goal: "内容量が増えた時点で、業務画面と同じ固定表示へ揃える。"
scope_in: ["/signin","/device","/legal"]
scope_out: ["業務画面の固定表示の変更"]
acceptance: ["3 画面の縦の長さを実測し、固定の要否を判断できる","固定する場合は共通レイアウト部品 1 箇所で行う"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-public-screen-sticky-header-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"803e693360ee2bcdf401b2fb26b261490e95fa89753a364c028343008dd3ad4a","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-public-screen-sticky-header-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-vaov","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 公開画面のヘッダー固定を見直す

## 概要

公開画面 3 種はヘッダーを固定していない。

## 背景と問題

業務画面と違い縦に短く、固定すると可視領域を削るだけになるため今回は固定していない。判断の根拠を残しておき、内容が増えたら見直す。

## 現在の挙動

公開画面ではヘッダーがスクロールで流れる。

## 期待する挙動

内容量が増えた時点で業務画面と同じ扱いに揃える。

## 再現手順またはユースケース

/legal を縦にスクロールする。

## 影響と優先度

現状の内容量では実害が無いため low。

## スコープ

公開画面 3 種のみ。

## 関連グラフ

docs/frontend-ui-foundation-spec.md §5-6 の観点 2。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度低/記録 #11。
