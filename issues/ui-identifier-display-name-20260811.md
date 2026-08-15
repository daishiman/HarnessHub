---
graph_node_id: "issue-ui-identifier-display-name-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-consistency","identifier","display-name"]
priority: "high"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "識別子ではなく人が読める表示名を出す"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-12T03:44:36Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/components/shell/hub-shell.tsx","packages/ui/src/shell/ShellHeader.tsx","packages/ui/src/shell/WorkspaceSwitcher.tsx","packages/ui/src/components/IdBadge.tsx"]
purpose: "ULID などの識別子しか出せていない箇所を、人が判断できる表示名に置き換える。"
goal: "対象プロジェクト・Workspace・利用者の表示を、識別子ではなく名前で読める状態にする。"
scope_in: ["表示名の解決経路の追加","ヘッダーの Workspace 表示","アカウントメニューの利用者表示","一覧の対象プロジェクト列"]
scope_out: ["識別子そのものの廃止","認可ルールの変更"]
acceptance: ["Workspace 切替 UI に表示名が出る","アカウントメニューに利用者名が出る","表示名が解決できないときだけ IdBadge へ落ちる","識別子の全文コピーは維持される"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-identifier-display-name-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"c3bb5f146d7f20c2fddcdad3601877d959ff4a751d3eb34843d0cd61583589d7","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-identifier-display-name-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-62ah","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 識別子ではなく人が読める表示名を出す

## 概要

session claims が識別子しか持たないため、Workspace 名・利用者名・対象プロジェクトが ULID のまま画面に出ている。

## 背景と問題

今回の UI 統一では「読めない文字列を名前の体裁で出さない」ところまで揃え、IdBadge (小さく薄く・クリックで全文コピー) に寄せた。ただし本来出したいのは名前であり、識別子の見せ方を整えただけでは業務判断はできない。

## 現在の挙動

ヘッダーの Workspace 欄と アカウントメニューは identifier フラグが立ち、IdBadge で識別子を表示する。

## 期待する挙動

表示名を解決して名前で表示し、解決できないときだけ識別子へフォールバックする。

## 再現手順またはユースケース

サインイン後にヘッダーの Workspace 欄とアカウントメニューを開く。

## 影響と優先度

どの案件・誰の話かが一目で分からず、業務画面の判断コストが常時かかるため high。

## スコープ

表示名の解決と表示差し替えのみ。識別子表示の廃止や認可の変更はしない。

## 関連グラフ

UI 統一作業 (2026-08-11) の残課題。arch-harness-hub-frontend の画面情報設計契約に従う。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度高 #1。
