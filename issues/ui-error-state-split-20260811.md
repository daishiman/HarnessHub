---
graph_node_id: "issue-ui-error-state-split-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-consistency","error-state","list-state"]
priority: "high"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "取得の失敗と操作の失敗を分けて出す (残り 4 画面)"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-11T10:45:30Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/app/(dashboard)/settings/coefficients","apps/hub/src/app/(dashboard)/settings/auth","apps/hub/src/app/(dashboard)/settings/account","apps/hub/src/app/(dashboard)/users","packages/ui/src/components/ListState.tsx"]
purpose: "操作の失敗で画面の中身まで消える書き方を、残り 4 画面から取り除く。"
goal: "読み込みの失敗と操作の失敗を別の受け皿で扱い、操作失敗時に一覧が消えないようにする。"
scope_in: ["見積係数設定","認証の接続設定","アカウント設定","利用者詳細"]
scope_out: ["API の挙動変更","エラーメッセージ文言の全面刷新"]
acceptance: ["4 画面とも保存失敗時に一覧・入力内容が消えない","読み込み失敗は ListState の error で出る","操作失敗は操作ボタンの近傍に出る","0 件と取得失敗が同じ文言にならない"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-error-state-split-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"2a7f5e121b8b6a9d9c1e2b843ee5e4c7ddb235479ed94c4a358a47cfb6beba52","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-error-state-split-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-oanz","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 取得の失敗と操作の失敗を分けて出す (残り 4 画面)

## 概要

残り 4 画面が「読み込みの失敗」と「操作の失敗」を同じ場所で扱っており、保存に失敗すると画面の中身まで消える。

## 背景と問題

画面ごとに上に Alert・下に空メッセージを書き写す構造だったため、0 件と取得失敗が取り違えられていた。7 画面は ListState (4 状態が排他) へ寄せて解消済みだが、この 4 画面が残っている。

## 現在の挙動

操作の失敗でも一覧描画そのものを早期 return で止めるため、失敗理由だけが残り内容が消える。

## 期待する挙動

利用者一覧で採った分け方 (操作の失敗はボタンの隣、一覧は消さない) を 4 画面へ広げる。

## 再現手順またはユースケース

見積係数設定で保存を失敗させると、設定値の一覧ごと画面から消える。

## 影響と優先度

入力内容の消失に直結するため high。

## スコープ

上記 4 画面の状態表示の整理のみ。

## 関連グラフ

docs/frontend-ui-foundation-spec.md §5-6 の観点 6・7・8。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度高 #2。
