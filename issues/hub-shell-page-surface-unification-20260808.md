---
graph_node_id: "issue-hub-shell-page-surface-unification-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-shell","page-surface","accessibility","responsive","final-review"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "Harness Hub 共通シェル・全ページ表面の統一"
owners: ["daishiman"]
created_at: "2026-08-08T10:30:00Z"
updated_at: "2026-08-10T09:45:06Z"
status: "closed"
depends_on: []
related_nodes: ["feat-hub-foundation","feat-post-signin-scope-routing","spec-harness-hub-ui-foundation-addendum","arch-harness-hub-frontend"]
resource_scope: ["apps/hub/","packages/ui/","system-spec/","specs/harness-hub-ui-foundation-addendum.md","architecture/harness-hub-frontend.md","features/feat-hub-foundation.md","features/feat-post-signin-scope-routing.md","tasks/feat-hub-foundation/","docs/","issues/hub-shell-page-surface-unification-20260808.md"]
purpose: "認証後の全画面を一貫したナビゲーション、画面見出し、面、モーダル契約へ統一し、権限外導線と破壊操作の誤操作を防ぐ"
goal: "server-first の共通 HubShell、role-aware navigation、共通 page surface、accessible overlay が仕様・実装・テスト・PR で同じ契約を参照する"
scope_in: ["desktop sidebar / header / footer と mobile tab の共通 HubShell","実在 route と session role に基づく deny-by-default navigation","Panel / ScreenHeader / ActionLink / Icon / Modal / BottomSheet の公開 UI contract","既存業務画面と公開画面の共通 surface 移行","unit / a11y / catalog / typecheck / lint / repository gate"]
scope_out: ["公開 API・DB schema・認証認可ルール自体の変更","未実装 route の新設","Cloudflare 本番デプロイ","モバイル native gesture の追加"]
acceptance: ["認証後 route は共通 HubShell を使い main landmark を一つだけ持つ","member と role 未確定時に管理者専用導線が DOM に存在しない","破壊操作は可逆性を明示する ConfirmDialog を使う","modal layer は focus trap・Esc・focus restore・scroll lock を共通実装する","変更対象の手書きファイルは 500 行以下である","task spec と repository quality gate が blocking failure 0 で完了する","仕様影響が system-spec / specs / architecture / features / tasks / docs と受領書へ反映される","devgraph branch の draft PR が base main 向けに公開される"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hub-shell-page-surface-unification-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a9b2b7930df43920ef68b9854c3c0c6473cba5bdfc71596bed4c04a608fbe3d2","evaluator":"final review + system-spec transition writer","evidence_ref":"docs/features/feat-hub-foundation/hub-shell-page-surface-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-08T10:30:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "前回 UI foundation の上に共通 shell と全画面 surface を載せる独立した実装・公開単位"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hub-shell-page-surface-unification-20260808.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-imzk","linked_at":"2026-08-08T10:34:00Z","sync_state":"linked"}
github_publication: {"labels":["ui-visual"],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":false,"head_branch":"devgraph/issue-hub-shell-page-surface-unification-20260808","linked_at":"2026-08-08T11:44:47Z","merge_commit_sha":null,"merged_at":null,"pr_number":683,"repo":"daishiman/HarnessHub","state":"open","url":"https://github.com/daishiman/HarnessHub/pull/683"}]
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T10:30:00Z","missing_sections":[],"status":"complete"}
---

# 概要

認証後の全画面を共通シェルと共通 UI 表面へ統一し、スマートフォンからデスクトップまで同じ導線・状態・操作規則で利用できるようにする。

## 背景と問題

前回の UI foundation で token、基礎 layout、画面状態、実ブラウザ検査は整った。一方、各業務画面には個別の見出し・余白・リンク表現が残り、認証後の sidebar / header / mobile navigation も全 route を一貫して包む契約になっていなかった。

## 現在の挙動

作業差分には HubShell、shell 部品、Icon、Panel、ScreenHeader、ActionLink、Modal、BottomSheet と既存画面の移行が含まれる。最終レビュー前の時点では、実 session role と表示ラベルの不一致、member に管理者導線が見える問題、破壊操作で汎用 Modal を使う問題、500 行を超える catalog 定義があった。

## 期待する挙動

実在 route と session role に合う導線だけを表示し、画面の main landmark、見出し、面、破壊操作確認、modal focus 制御を共通 contract で提供する。仕様・設計・検査・Beads・PR が同じ範囲を参照する。

## 再現手順またはユースケース

1. member / workspace-admin / provider-admin で認証後画面を開く。
2. desktop では sidebar と header、mobile では主要 4 導線と「その他」を確認する。
3. sheet 再生成または入力中止を選び、取り消せない旨と確認操作を確認する。
4. keyboard で modal を開き、Tab / Shift+Tab / Esc / focus return を確認する。

## 影響と優先度

- 影響範囲: Harness Hub の認証後全画面、公開画面の共通表面、`packages/ui` の公開部品。
- 深刻度: high。
- 緊急度: 権限外導線と取り消せない操作の誤認を release 前に防ぐため。

## スコープ

- In: HubShell、role-aware navigation、既存画面の surface 移行、overlay accessibility、catalog / unit / a11y / quality gate、全文書層と仕様受領書。
- Out: API・DB・認可ルール自体、未実装 route、本番 deploy、native swipe gesture。

## 関連グラフ

- 原因/親ノード: `issue-ui-foundation-final-review-20260808`。
- 関連仕様: `spec-harness-hub-ui-foundation-addendum`。
- 関連アーキテクチャ: `arch-harness-hub-frontend`。
- 解決タスク: `feat-hub-foundation` P12 / P13 追補で検証・引継ぎを記録する。

## 受入条件

- [x] 認証後 route が一つの共通 HubShell と main landmark を使う。
- [x] role 未確定または member へ管理者専用導線を表示しない。
- [x] 破壊操作が可逆性を明示する ConfirmDialog を使う。
- [x] modal layer が focus trap、Esc、focus restore、scroll lock を満たす。
- [x] 手書きファイルが 500 行以下で全品質ゲートが通る。
- [x] 正規仕様反映、受領書、Beads、base main 向け draft PR が揃う。

## 検証証跡

- コマンド/テスト: UI / Hub unit・a11y・typecheck・lint、task spec validator、`pnpm verify`、system-spec gate、CI-equivalent local gate 139/139 PASS。
- 証跡 path: `docs/features/feat-hub-foundation/hub-shell-page-surface-spec-reflection-receipt.md`。
- 公開証跡: draft PR [#683](https://github.com/daishiman/HarnessHub/pull/683)、Linux VRT 初回差分 run [#31255679470](https://github.com/daishiman/HarnessHub/actions/runs/31255679470)、baseline 受領後 PASS run [#31255841043](https://github.com/daishiman/HarnessHub/actions/runs/31255841043)。
