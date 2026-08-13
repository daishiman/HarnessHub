---
graph_node_id: "issue-elegant-home-review-20260813"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["home-dashboard","elegant-review","authorization","ui-ux"]
priority: "high"
start_date: "2026-08-13"
target_date: null
iteration: null
title: "変更中の着地ダッシュボードを承認済み契約へ整合しエレガントに改善する"
owners: ["daishiman"]
created_at: "2026-08-13T01:36:41.452373Z"
updated_at: "2026-08-13T02:28:20.416734Z"
status: "closed"
depends_on: []
related_nodes: ["spec-post-signin-landing-observability","feat-hub-foundation"]
resource_scope: ["apps/hub/src/app/(dashboard)/dashboard/","apps/hub/src/app/api/v1/dashboard/","apps/hub/src/features/home-dashboard/","apps/hub/src/lib/routing/post-signin-landing.ts","packages/db/repository/","packages/ui/src/components/DataTable.tsx","docs/screen-inventory.md"]
purpose: "現在変更中の着地画面を30種の思考法で再検証した結果、承認済みの /dashboard・自分が最後に触ったもの・KPIなしという契約との不整合、認可境界と型不変条件の不足が見つかったため、既存変更を破棄せず正しい契約へ収束させる。"
goal: "承認済み着地契約と実装・仕様・テストを一致させ、矛盾なし・漏れなし・整合性あり・依存関係整合の4条件をすべてPASSにする。"
scope_in: ["着地routeと画面内容の承認済み契約への整合","本人の最近の作業と既存業務導線の実装","認可・tenant/workspace分離・DTO不変条件のテスト","共通UIの強調表示型契約とモバイル復帰導線の改善","関連する仕様台帳の一括更新"]
scope_out: ["成果物の削除","S09のKPI・推移・ランキング機能の前倒し","認証方式・role階層の変更","commit・push・本番公開"]
acceptance: ["遷移元のないサインイン成功で承認済みの着地routeへ遷移する","着地画面は本人が最後に触った項目を種別横断で提示しKPIを通常表示しない","memberとworkspace-adminの閲覧範囲が既存のown/all契約と一致する","visible=falseのsectionは件数0かつrecent空を型と実行時schemaで強制する","モバイルとデスクトップの両方から着地面へ戻れる","対象テスト・型検査・lint・buildがPASSする","検証4条件がすべてPASSする"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-security","arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-elegant-home-review-20260813.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-13T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"specs/harness-hub-post-signin-landing-observability-contract.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "変更中の既存Webアプリにおける仕様・認可・UI・テストの不整合を是正する単一の改善issue。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-elegant-home-review-20260813.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1cno","linked_at":"2026-08-13T01:37:32Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-13T02:26:12Z","evidence_refs":["apps/hub/src/__tests__/home-dashboard/summary-route.test.ts","apps/hub/src/__tests__/home-dashboard/home-dashboard-render.test.tsx","issues/sys-elegant-home-review-20260813.md"],"policy":"manual","reconciled_at":"2026-08-13T02:26:12Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-13T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

変更中の着地ダッシュボードを、承認済みの `/dashboard`・本人の最近の作業・KPIなしという契約へ整合させる。

## 背景と問題

利用者はサインイン後に仕事を再開できる画面を必要としている。30種の思考法で現在の変更を再検証したところ、実装は `/home`・Workspace全体の最近の動き・KPIを採用し、既存の承認済み契約と相反していた。認可境界、DTOの不変条件、モバイル導線、共通UIの型契約にも不足がある。

## 改善前の挙動

`DEFAULT_POST_SIGNIN_LANDING` は `/home` で、ホームAPIは3機能のWorkspace全体の更新を集約し、画面は要対応件数をKPIとして表示する。`screen-inventory.md` には current `/home`、planned `/dashboard`、旧既定 `/sheets` が併存する。

## 改善後の挙動

既定着地・画面・API・ナビ・仕様台帳を `/dashboard` へ統一した。最近項目は本人に紐づく対象だけを返し、通常時のKPIを削除した。member/workspace-adminのown/all、非表示sectionの不変条件、モバイル復帰導線、共通UIの型契約をテストで固定した。

## 期待する挙動

サインイン後は承認済みの着地routeへ進み、本人が最後に触った項目と既存業務画面への導線を表示する。通常時のKPIは表示せず、memberとworkspace-adminの閲覧範囲は既存own/all契約に一致する。仕様・実装・テスト・依存関係が同じ契約を参照する。

## 再現手順またはユースケース

1. 変更中の `DEFAULT_POST_SIGNIN_LANDING` と着地画面を開く。
2. `specs/harness-hub-post-signin-landing-observability-contract.md` のacceptanceと比較する。
3. memberとworkspace-adminでホームAPIを呼び、本人性・非表示section・tenant/workspace分離を確認する。
4. narrow viewportで着地面から別画面へ移動し、再び着地面へ戻れるか確認する。

## 影響と優先度

- 影響範囲: サインイン済みの全利用者、着地route、3業務機能、共通UI、仕様台帳
- 深刻度: high
- 緊急度: 既定着地の意味と認可範囲が承認済み契約と異なるため、変更を確定する前に是正が必要

## スコープ

- In: 着地route、本人の最近の作業、認可・DTO不変条件、モバイル導線、共通UI型、関連仕様・テスト
- Out: 成果物削除、S09のKPI前倒し、認証方式変更、commit・push・本番公開

## 関連グラフ

- 原因/親ノード: `feat-hub-foundation`
- 関連仕様: `spec-post-signin-landing-observability`
- 関連アーキテクチャ: `arch-harness-hub-frontend`, `arch-harness-hub-backend`, `arch-harness-hub-security`, `arch-harness-hub-data`
- 解決タスク: `issue-elegant-home-review-20260813`

## 受入条件

- [x] 遷移元のないサインイン成功で承認済みの着地routeへ遷移する。
- [x] 着地画面は本人が最後に触った項目を種別横断で提示し、通常時にKPIを表示しない。
- [x] memberとworkspace-adminの閲覧範囲が既存のown/all契約と一致する。
- [x] 非表示sectionは件数0かつrecent空を型と実行時schemaで強制する。
- [x] モバイルとデスクトップの両方から着地面へ戻れる。
- [x] 対象テスト・型検査・lint・buildがPASSする。
- [x] 矛盾なし・漏れなし・整合性あり・依存関係整合がすべてPASSする。

## 検証証跡

- コマンド/テスト: Hub・DB・UIの全Vitest + coverage、3 package typecheck / Biome、Next production build、仕様差分検索
- 結果: 全テストPASS。coverageはHub 85.07/84.50/82.24、DB 89.42/85.62/87.16、UI 95.50/90.57/88.20（statements/branches/functions）。
- 証跡 path: `apps/hub/src/__tests__/home-dashboard/`、本issueのBeads notesと最終作業報告
