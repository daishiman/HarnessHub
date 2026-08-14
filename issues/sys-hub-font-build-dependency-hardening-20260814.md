---
graph_node_id: "issue-hub-font-build-dependency-hardening-20260814"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "infrastructure"
tags: ["hub","fonts","build-reliability","ci"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Hub フォントのビルド時外部依存対策の保証範囲と検査経路を整合する"
owners: ["daishiman"]
created_at: "2026-08-14T03:43:46Z"
updated_at: "2026-08-14T04:31:38Z"
status: "closed"
depends_on: []
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-infrastructure"]
resource_scope: ["apps/hub/src/app/fonts.ts","apps/hub/src/assets/fonts","apps/hub/scripts/check-build-network-independence.mjs","apps/hub/scripts/vendor-fonts.mjs","apps/hub/tests/ui-foundation/vendored-fonts.test.ts","apps/hub/package.json",".github/workflows/ci.yml"]
purpose: "Google Fonts 障害で Hub のビルドと本番デプロイが停止する因果経路を除去し、保証の説明・走査範囲・検査の生存証明を実装と一致させる"
goal: "フォント経路が Google Fonts の可用性に依存せず、ビルド入力全体で再導入を拒否し、台帳改ざんと検査対象 0 件を必ず失敗させる"
scope_in: ["next/font/local と同梱 WOFF2 の整合性確認","next/font/google 再導入禁止ゲートの責務名・走査範囲・負のテストの整合","フォント・ライセンス・manifest の完全性検査","CI とローカル検査入口の整合"]
scope_out: ["全てのビルド時ネットワーク I/O の汎用静的検出","Google Fonts 以外の既存外部依存の一括排除","既存の日本語パス起因テスト失敗の修正","commit・push・deploy"]
acceptance: ["フォント取得経路に限定した保証名と説明に統一される","Hub の実ビルド入力 root ごとに存在と非 0 件走査が確認され、禁止指定子で検査が失敗する","font・license・manifest の破損・欠落・重複を負のテストが検出する","CI とローカルが同一のフォント検査入口を実行する","変更固有の lint・typecheck・test・build が成功し、4 条件が PASS する"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hub-font-build-dependency-hardening-20260814.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-14T03:43:46Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "本番デプロイを停止させた Google Fonts のビルド時取得と、その恒久対策の保証範囲・検査欠落を追跡する独立 issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-font-build-dependency-hardening-20260814.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1555","linked_at":"2026-08-14T03:48:52Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-14T04:31:38Z","evidence_refs":["apps/hub/scripts/check-font-assets.mjs","apps/hub/scripts/check-google-font-build-fetch.test.mjs","apps/hub/tests/ui-foundation/vendored-fonts.test.ts",".github/workflows/ci.yml"],"policy":"manual","reconciled_at":"2026-08-14T04:31:38Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T03:43:46Z","missing_sections":[],"status":"complete"}
---

# 概要

Hub の Google Fonts 障害対策を、フォント経路の外部依存除去とその恒久的な再発防止として仕上げる。

## 背景と問題

`next/font/google` が Hub のビルド中に Google Fonts へ通信し、外部側の取得失敗で `wrangler deploy` job が停止した。同梱と `next/font/local` への変更は直接原因を除去するが、現行の報告と検査名は「ビルド全体がhermetic」と読め、実装の保証範囲より広い。

## 現在の挙動

- 同梱 WOFF2 と `next/font/local` により、今回の Google Fonts 障害経路は切断されている。
- 禁止ゲートは `next/font/google` だけを限定 root で走査し、実ビルド依存の一部が範囲外。
- self-test は検出関数だけを確認し、root 欠落や走査 0 件を経路全体で検出しない。
- フォント本体は SHA-256 で確認するが、license の内容整合や負のテストが不足する。

## 期待する挙動

保証を「Google Fonts を使うフォント取得経路の外部依存除去」に限定し、Hub の全ビルド入力、root ごとの母数、台帳改ざん、CI/ローカル結線を1つの契約として検証する。

## 再現手順またはユースケース

1. Hub のビルド入力に `next/font/google` を追加する。
2. フォント契約ゲートを実行する。
3. CI 前に必ず非 0 終了し、再導入を拒否することを確認する。

## 影響と優先度

- 影響範囲: Hub のビルドと本番デプロイ
- 深刻度: high
- 緊急度: 外部障害で修正版を本番反映できない再発を防ぐため

## スコープ

- In: フォント同梱・禁止ゲート・台帳・負のテスト・CI/ローカル結線
- Out: ビルド全体の汎用ネットワークサンドボックス化、既存の日本語パス起因バグ、commit/push/deploy

## 関連グラフ

- 原因/親ノード: なし
- 関連仕様: なし
- 関連アーキテクチャ: `arch-harness-hub-frontend`, `arch-harness-hub-infrastructure`
- 解決タスク: `issue-hub-font-build-dependency-hardening-20260814`

## 受入条件

- [ ] 保証名と説明がフォント取得経路に限定される
- [ ] 実ビルド入力 root ごとの存在・母数・禁止指定子を検証する
- [ ] font/license/manifest の破損・欠落・重複を負のテストが検出する
- [ ] CI とローカルが同じフォント検査入口を使う
- [ ] 変更固有の品質ゲートが成功し、4条件が PASS する

## 検証証跡

- コマンド/テスト: G18 相当コマンド、Hub フォント契約テスト、lint、typecheck、Next build
- 証跡 path: worktree のコマンド出力と Beads 完了 notes
