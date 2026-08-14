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
resource_scope: ["issues/dark-mode-persistence-reload-20260813.md","apps/hub/src/lib/routing/display-preferences.ts","apps/hub/src/app/layout.tsx","apps/hub/src/components/shell/hub-shell.tsx","apps/hub/tests/user-org-admin/display-theme-persistence.test.tsx"]
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
completion_evidence: {"completed_at":"2026-08-13T12:19:29Z","evidence_refs":["beads:HarnessHub-sj20","apps/hub/src/lib/routing/display-preferences.ts","apps/hub/src/app/layout.tsx","apps/hub/tests/user-org-admin/display-theme-persistence.test.tsx"],"policy":"manual","reconciled_at":"2026-08-13T12:19:29Z","source":"manual","status":"done"}
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

- コマンド/テスト: テーマ復元の Vitest は修正前に reload 後 `auto` で RED、修正後は PASS。
  2026-08-13 の設計差し替え (client 後追い取得 → サーバ解決) 後は hub 全体で 209 files / 2207 PASS + 8 todo、
  `check:client-bundle` は violations 0 (超過 route なし)、`typecheck` / `lint` とも PASS。
  2026-08-14 の遅延読込追加後も 209 files / 2207 PASS + 8 todo、`check:client-bundle` violations 0。
  main 比の増分は `/settings/auth` −696、`/docs/[id]` −853、`/users` +439、`/users/[id]` +439 bytes。
  PR #724 の CI は 7b1a6030 で全緑 (build & test / catalog 固有ゲート (client JS 予算) / 静的ゲート /
  verify / change-category-guard / dev-pipeline-lint がいずれも SUCCESS)。
- 証跡 path: `apps/hub/tests/user-org-admin/display-theme-persistence.test.tsx`、
  `apps/hub/src/lib/routing/display-preferences.ts`、`apps/hub/src/app/layout.tsx`

### 2026-08-13 追記: 実装経路の差し替え

初版の client 部品 UiPreferencesHydrator (shell 配下で後追い fetch していたもの) は削除した。
理由は client 境界を 1 つ足したことで webpack が `@harness-hub/ui` を別 chunk へ割り、
`(dashboard)` / `(workspace)` 配下の全 route の First Load JS が +3856 bytes 増えて
G13 予算ゲートが 4 route (`/settings/auth` `/docs/[id]` `/users` `/users/[id]`) で超過したため。
現行は root layout がサーバで解決し `UiProvider` の `defaultPreferences` へ渡す。
差し替え後の増分は main 比 +152〜+426 bytes / route に収まり、chunk 構成は main と同一である。

### 2026-08-14 追記: 予算の余白を戻すための遅延読込

差し替え後も `/settings/auth` と `/docs/[id]` は main 時点で予算残り 153〜189 bytes しかなく、
+373 bytes の増分を吸収できずゲートが赤になった。原因はこの変更ではなく先に積み上がった消費なので
(警告帯 HarnessHub-5vlq が想定した誤帰属そのもの)、予算そのものは動かさず消費側を削った。

- `oidc-connection-admin.tsx`: `SetupPanel` / `ConnectionCard` を `next/dynamic` で遅延化 (−1069 bytes)。
  この画面は一覧も setup 情報も mount 後の fetch で入るため、SSR 出力を失わずに初期 chunk だけを削れる。
- `/docs/[id]`: 取得解決後にしか描かれない「分類と公開設定」を、既存の遅延境界
  `document-detail-content.tsx` へ移設 (−853 bytes)。新しい chunk を増やさずに page chunk から外れる。

`next/dynamic` を **server component 側へ掛けても効かない**ことは実測で確認した
(`settings/auth/page.tsx` に適用したところ +573 bytes の悪化)。App Router では RSC が client 部品を
既に別 chunk へ分けているため chunk は route entry に載ったままで、loadable ランタイムだけが増える。
効くのは client 境界の内側だけである。

なお計測ゲート自体の過大計測も疑って検証したが、`.next/server/app/_not-found.html` が実際に要求する
`<script src>` 集合と `check-client-bundle.mjs` の計上集合を突き合わせた結果、差分は
`/_not-found` 疑似 route 固有の 1 件だけで、過大計測は無かった。ゲートは正しく測っている。

#### `ssr: false` を付けてはいけない

初版では遅延化に `ssr: false` を添えたが、CI の ERRSPLIT-03
(`apps/hub/tests/ui-foundation/error-state-split.test.tsx`) だけが接続一覧を掴めず落ち続けた。
手元では coverage 付き単体でも全 209 file でも緑で、待ちを増やしても CI の結果は
`1 failed | 208 passed` から 1 バイトも動かなかった。緑のまま動いている
`document-detail-content.tsx` の `dynamic()` との差は `ssr: false` の有無だけである。
`ssr: false` は Next の client ランタイム (mount 判定) に依存するため、jsdom では
読込が解決しないことがある。

初期 chunk から外す効果は `dynamic()` 自体が生むもので、`ssr: false` は寄与しない
(実測: `/settings/auth` は 121420 → 121414 bytes、差は 6 bytes)。この画面は SSR 出力が
元から「読み込み中です。」だけなので、外して失うものも無い。外した結果 CI は全緑になった。
