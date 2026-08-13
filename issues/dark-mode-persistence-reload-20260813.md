---
graph_node_id: "issue-dark-mode-persistence-reload-20260813"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["bug","theme","dark-mode","user-settings","reload"]
priority: "high"
start_date: "2026-08-13"
target_date: null
iteration: null
title: "保存したダークモードが再読み込み後も維持されるようにする"
owners: ["daishiman"]
created_at: "2026-08-13T11:59:50Z"
updated_at: "2026-08-13T12:19:29Z"
status: "done"
depends_on: []
related_nodes: ["feat-hub-foundation"]
resource_scope: ["issues/dark-mode-persistence-reload-20260813.md","apps/hub/src/components/shell/ui-preferences-hydrator.tsx","apps/hub/src/components/shell/hub-shell.tsx","apps/hub/tests/user-org-admin/display-theme-persistence.test.tsx"]
purpose: "ログイン済み利用者が表示設定で選んだダークモードを、画面再読み込み後もサーバ保存値から復元できるようにする。"
goal: "ダークモードを選んで保存した利用者が再読み込みしてもダーク表示のままで、表示密度と言語の保存契約も壊れない状態にする。"
scope_in: ["保存済み user_settings の表示設定をログイン済み画面へ復元する経路","ダークテーマの保存から再読み込みまでを固定する回帰テスト","既存の light / system、表示密度、言語設定との整合"]
scope_out: ["配色トークンや画面デザインの変更","認証方式・認可ルール・DBスキーマの変更","本番デプロイとリモートへの push"]
acceptance: ["ログイン済み利用者がテーマを dark に変更すると display-settings API へ保存される","保存後にページを再読み込みしても data-theme と実効テーマが dark になる","light と system の選択、表示密度、言語の既存挙動を維持する","設定取得に失敗しても公開画面やアプリ全体を操作不能にしない","原因を再現するテストが修正前に失敗し、修正後に関連テストが通る"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/dark-mode-persistence-reload-20260813.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"107d8a1564587c3605ec952c85d0dd6b65c892f7abe22b3c55a2daf6ae0f89fa","evaluator":"利用者の本番再現報告と RootLayout / AccountSettings のコード確認","evidence_ref":"apps/hub/src/app/layout.tsx"}
source_lineage: {"imported_at":"2026-08-13T11:59:50Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "ログイン済み利用者の保存済み表示設定が再読み込みで失われる、再現可能なフロントエンド状態復元の不具合。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/dark-mode-persistence-reload-20260813.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-sj20","linked_at":"2026-08-13T12:03:41Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-13T12:19:29Z","evidence_refs":["beads:HarnessHub-sj20","apps/hub/src/components/shell/ui-preferences-hydrator.tsx","apps/hub/tests/user-org-admin/display-theme-persistence.test.tsx"],"policy":"manual","reconciled_at":"2026-08-13T12:19:29Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-13T11:59:50Z","missing_sections":[],"status":"complete"}
---

# 概要

ログイン済み利用者がダークモードを選んで保存しても、ページを再読み込みすると既定の表示へ戻る不具合を解消する。

## 背景と問題

利用者はアカウント設定からテーマを `dark` に変更でき、保存 API も成功する。しかしアプリ最上位の表示設定は再読み込みのたびに `auto` で初期化され、サーバに保存済みの `user_settings` を読み戻していないため、選択が維持されない。

## 現在の挙動

1. ログイン済みでアカウント設定を開く。
2. テーマを「ダーク」に変更し、保存成功の表示を確認する。
3. ページを再読み込みする。
4. `UiProvider` が `auto` で再生成され、保存したダーク表示が解除される。

## 期待する挙動

保存済みの表示設定をログイン済み画面の初期化時に復元し、ダークモードを選んだ利用者は再読み込み後もダーク表示のまま利用できる。ライト・OS設定追従、表示密度、言語の保存契約も維持する。

## 再現手順またはユースケース

1. ログイン済みでアカウント設定を開く。
2. テーマを「ダーク」に変更する。
3. 保存成功後にページを再読み込みする。
4. 画面の `data-theme` と実効テーマがどちらも `dark` のままであることを確認する。

## 影響と優先度

- 影響範囲: 表示設定を変更するログイン済み利用者
- 深刻度: high
- 緊急度: 毎回の再読み込みで利用者の明示設定が失われ、設定保存への信頼を損なうため早期修正が必要

## スコープ

- In: 保存済み `user_settings` の復元経路、テーマ永続化の回帰テスト、密度・言語との整合
- Out: 配色デザイン変更、認証方式変更、DBスキーマ変更、本番デプロイ

## 関連グラフ

- 原因/親ノード: `feat-hub-foundation`
- 関連仕様: `system-spec/frontend.md`
- 関連アーキテクチャ: `arch-harness-hub-frontend`
- 解決タスク: `issue-dark-mode-persistence-reload-20260813`

## 受入条件

- [x] `dark` への変更が display-settings API へ保存される。
- [x] 保存後の再読み込みでも `data-theme` と実効テーマが `dark` になる。
- [x] `light` / `system`、表示密度、言語の既存挙動を維持する。
- [x] 設定取得失敗時も公開画面やアプリ全体を操作不能にしない。
- [x] 修正前に失敗する再現テストと、修正後に通る回帰テストを残す。

## 検証証跡

- コマンド/テスト: テーマ復元の Vitest は修正前に reload 後 `auto` で RED、修正後は 2/2 PASS。共通シェル・アカウント設定・アクセシビリティの関連 Vitest は 40 PASS / 1 todo、client bundle budget は 12 PASS。Hub typecheck と対象 3 ファイルの Biome も PASS。
- 証跡 path: `apps/hub/tests/user-org-admin/display-theme-persistence.test.tsx`、`apps/hub/src/components/shell/ui-preferences-hydrator.tsx`
