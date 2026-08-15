---
graph_node_id: "feat-docs-live-authoring"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["macro-feature","ui-ux","docs","editor","taxonomy","S7"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "ドキュメント作成の Notion 型化 (ライブ Markdown・カテゴリ/タグ・全画面幅)"
owners: ["daishiman"]
created_at: "2026-08-14T00:00:00Z"
updated_at: "2026-08-15T13:37:01Z"
status: "draft"
depends_on: ["feat-docs-cms"]
related_nodes: ["feat-user-org-admin","feat-workspace-governance","feat-classification-vocabulary-parity"]
resource_scope: ["apps/hub/src/app","apps/hub/src/components","apps/hub/src/db","packages/ui/src"]
purpose: "ドキュメント作成が、編集とプレビューの往復・分類語彙の後付け・Card 枠に閉じた狭い執筆領域という3 つの摩擦を抱えており、書く行為そのものが妨げられている。書いた内容がその場で結果として見え、分類が最初から用意され、画面幅を使って書ける状態にして、執筆を中断させない。"
goal: "ドキュメント作成画面が、Markdown 記述をその場で変換表示する単一の編集領域を持ち、初期装備のカテゴリ・タグから選択でき (管理者は追加でき)、Card 枠に閉じない全画面幅で編集できる状態。"
scope_in: ["編集とプレビューを分けない単一領域でのライブ Markdown 変換","対応する Markdown 記法の範囲の決定","カテゴリ・タグの初期語彙の定義と初期投入","一般利用者は既存のカテゴリ・タグから選択のみ可能とする権限","管理者によるカテゴリ・タグの追加","カテゴリ・タグとドキュメントの関連付けと、それによる絞り込み","Card 枠に閉じない全画面幅の編集レイアウト","全画面幅レイアウトが自動検査 (feat-ui-integrity-audit-harness) の横溢れ判定を満たすこと","長文ドキュメントのスクロール時の編集領域の挙動"]
scope_out: ["複数人の同時編集 (リアルタイム共同編集)","ブロック単位のドラッグ&ドロップ並べ替え","データベースビュー・ボード等の Notion 固有の高機能","ドキュメントの保存・版管理・公開そのもの (feat-docs-cms の担当)","カテゴリ・タグの語彙統制ポリシー (feat-classification-vocabulary-parity の担当)","画像・ファイルの本文への埋め込み","既存ドキュメントの記法一括移行"]
acceptance: ["編集領域に Markdown を入力すると、別画面へ切り替えることなくその場で変換結果が表示される","対応記法の一覧が定義され、対応外記法の扱いが決まっている","初期状態でカテゴリとタグが選択可能な語彙として存在する","一般利用者がカテゴリ・タグを新規追加できず、選択のみ可能である","管理者がカテゴリ・タグを追加でき、追加後に一般利用者が選択できる","ドキュメント作成画面が Card 枠に閉じず全画面幅を使う","全画面幅レイアウトが 360/768/1280 の 3 幅で横溢れ 0 件である","カテゴリ・タグでドキュメントを絞り込める"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-design-system","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-docs-live-authoring.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-15T13:37:01Z","origin_kind":"generated","source_digest":"df3a55215acaabb543e3dd5288f893470f928e2fb44622fef177ac540880e39f","source_path":"system-spec/ui-ux.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec と 2026-08-14 の利用者要望 S1-S8 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-docs-live-authoring.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-14T00:00:00Z","missing_sections":[],"status":"incomplete"}
---

# ドキュメント作成の Notion 型化 (ライブ Markdown・カテゴリ/タグ・全画面幅)

## 0. なぜこの feature があるのか

利用者の要望は 3 つの独立した論点を含んでいた。

1. カテゴリ・タグを**最初から**設けておく。一般利用者は選ぶだけ、管理者は追加できる。
2. 編集画面とプレビュー画面を**分けない**。Markdown を書くとその場で変換される。
3. 「画面は今四角の中でしか表現できない」— つまり **Card 枠に閉じ込めず全画面幅で書ける**ようにする。

3 つとも「Notion のように」という同じ一言に含まれていたが、実装上は編集体験・分類・レイアウトという別々の軸なので、受入基準も別々に立てる。

## 1. 目的

ドキュメント作成が、編集とプレビューの往復・分類語彙の後付け・Card 枠に閉じた狭い執筆領域という3 つの摩擦を抱えており、書く行為そのものが妨げられている。書いた内容がその場で結果として見え、分類が最初から用意され、画面幅を使って書ける状態にして、執筆を中断させない。

## 2. ゴール

ドキュメント作成画面が、Markdown 記述をその場で変換表示する単一の編集領域を持ち、初期装備のカテゴリ・タグから選択でき (管理者は追加でき)、Card 枠に閉じない全画面幅で編集できる状態。

## 3. 含むもの

- 編集とプレビューを分けない単一領域でのライブ Markdown 変換
- 対応する Markdown 記法の範囲の決定
- カテゴリ・タグの初期語彙の定義と初期投入
- 一般利用者は既存のカテゴリ・タグから選択のみ可能とする権限
- 管理者によるカテゴリ・タグの追加
- カテゴリ・タグとドキュメントの関連付けと、それによる絞り込み
- Card 枠に閉じない全画面幅の編集レイアウト
- 全画面幅レイアウトが自動検査 (feat-ui-integrity-audit-harness) の横溢れ判定を満たすこと
- 長文ドキュメントのスクロール時の編集領域の挙動

## 4. 含まないもの

- 複数人の同時編集 (リアルタイム共同編集)
- ブロック単位のドラッグ&ドロップ並べ替え
- データベースビュー・ボード等の Notion 固有の高機能
- ドキュメントの保存・版管理・公開そのもの (feat-docs-cms の担当)
- カテゴリ・タグの語彙統制ポリシー (feat-classification-vocabulary-parity の担当)
- 画像・ファイルの本文への埋め込み
- 既存ドキュメントの記法一括移行

## 5. 受入基準

- 編集領域に Markdown を入力すると、別画面へ切り替えることなくその場で変換結果が表示される
- 対応記法の一覧が定義され、対応外記法の扱いが決まっている
- 初期状態でカテゴリとタグが選択可能な語彙として存在する
- 一般利用者がカテゴリ・タグを新規追加できず、選択のみ可能である
- 管理者がカテゴリ・タグを追加でき、追加後に一般利用者が選択できる
- ドキュメント作成画面が Card 枠に閉じず全画面幅を使う
- 全画面幅レイアウトが 360/768/1280 の 3 幅で横溢れ 0 件である
- カテゴリ・タグでドキュメントを絞り込める

## 6. 前提となる feature

- `feat-docs-cms`

## 7. 参照するアーキテクチャ

- `arch-harness-hub-frontend`
- `arch-harness-hub-design-system`
- `arch-harness-hub-backend`

## 8. 出所

確定仕様 `spec-harness-hub-requirements` および `system-spec/ui-ux.md` を macro 分解したもの。
正本は `system-spec/spec-state.json` (完成度 evaluator 総合 PASS / `system-spec/resume-receipt.json`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
P01..P13 の phase task は本 feature からは生成せず、`run-system-dev-plan` (ミクロ層) が所有する。
