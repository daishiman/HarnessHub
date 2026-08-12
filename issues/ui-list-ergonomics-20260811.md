---
graph_node_id: "issue-ui-list-ergonomics-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-consistency","data-table","filter"]
priority: "high"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "一覧の使い勝手 (列構成・並べ替え・条件記憶・名前列固定)"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-11T10:45:30Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/app/(dashboard)/users","packages/ui/src/components/DataTable.tsx","packages/ui/src/components/FilterBar.tsx"]
purpose: "件数が増えたときに目的の行へたどり着けるよう、一覧の操作性をまとめて上げる。"
goal: "利用者一覧の列構成を見直し、並べ替え・絞り込み条件の記憶・名前列の横固定を入れる。"
scope_in: ["利用者一覧の列の並びと幅","列見出しクリックでの並べ替え","絞り込み条件の保持","横スクロール時の左端列固定"]
scope_out: ["一覧以外の画面構成の変更","API のページング仕様変更"]
acceptance: ["利用者一覧の列が実際の使われ方に沿って並ぶ","主要一覧で列見出しから並べ替えできる","画面を離れて戻っても絞り込み条件が残る","横に広い表で左端の名前列が固定される"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-list-ergonomics-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"df717c4203bade90cb642568695d6ca4b2575eff6f8d5992569b7f6b16ef073e","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-list-ergonomics-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-2mu6","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 一覧の使い勝手 (列構成・並べ替え・条件記憶・名前列固定)

## 概要

一覧の使い勝手に関する 4 件 (列構成・並べ替え・条件記憶・名前列固定) をまとめて扱う。

## 背景と問題

今回は縦スクロール時の見出し固定と絞り込み UI の共通化までを入れた。件数が増える運用では、並べ替えと条件の記憶が無いと目的の行に届かない。

## 現在の挙動

並べ替えは一部の列のみ、絞り込み条件は画面遷移で失われ、横スクロール時に名前列が流れる。

## 期待する挙動

4 点が共通部品側で満たされ、各画面は指定するだけで揃う。

## 再現手順またはユースケース

利用者一覧で絞り込んだ後に詳細へ移動し、戻ると条件が消えている。

## 影響と優先度

列構成の見直しは受入条件に紐づくため high。残り 3 件は運用規模の拡大に伴って効いてくる。

## スコープ

一覧の操作性のみ。データ取得の仕様は変えない。

## 関連グラフ

docs/frontend-ui-foundation-spec.md §5-6 の観点 9・10。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度高 #3、中 #5・#6・#7。
