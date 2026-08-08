---
graph_node_id: "arch-harness-hub-frontend"
artifact_kind: "architecture"
artifact_subtypes: ["frontend"]
project_id: "harness-hub"
domain: "frontend"
tags: ["system-spec-import","frontend"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub frontend アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-08-02T12:48:16.841716Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow","spec-post-signin-workspace-scope"]
resource_scope: ["architecture/harness-hub-frontend.md"]
purpose: "Hub Web の frontend 構成 (Next.js App Router) と UI/UX 品質要件 (WCAG 2.2 AA / Core Web Vitals good / HIG 快適性原則) の正本参照"
goal: "qa-018 の品質要件と qa-007 の技術構成に適合する frontend 実装の指針を提供する"
scope_in: ["system-spec/frontend.md","system-spec/ui-ux.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-frontend.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"bda6fe3fb33ce9aaa79d6b29701c63e0b5803917b9bfcf797c72409fe365de36","evaluator":"validate-coverage-matrix.py --require-complete","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-02T12:15:00Z","origin_kind":"system-spec-harness","source_digest":"48100e2bd54aca5787d04687a5e22607dffdfe34497755b1f24ec296f68bb873","source_path":"system-spec/frontend.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-frontend.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-17T00:35:59Z","missing_sections":[],"status":"complete"}
---

# Harness Hub frontend アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/frontend.md](../system-spec/frontend.md) (sha256: `d44652f33f2ca180…`)
- [system-spec/ui-ux.md](../system-spec/ui-ux.md) (sha256: `d6d58903cbefc22a…`)

- confirmation: `confirmed` / evaluator: `validate-coverage-matrix.py` → **PASS** (`system-spec/spec-state.json`)
- 取込日時: 2026-08-02T08:12:28Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/frontend.md (Next.js 16 App Router + TypeScript + pnpm) と system-spec/ui-ux.md (WCAG 2.2 AA・CWV good・HIG 快適性)。doctrine anchor: Apple HIG + Clean Architecture。

## Context and drivers

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-08-08 / `feat-post-signin-scope-routing` / RSC scope シェル)**:

- サインイン後の既定着地 (`DEFAULT_POST_SIGNIN_LANDING` = `/sheets`) は URL クエリを持たない。
  `(dashboard)` / `(workspace)` 配下の Server Component は
  `apps/hub/src/lib/routing/dashboard-scope.ts` の `resolveDashboardScope()` で
  session から tenant/workspace を解決し、page は `query ?? session` の順で API へ渡す。
- 判定ロジックは `middleware/authz.ts` の `resolveSessionScope()` を export して再利用する。
  画面側に別の所属検証を置かない (二重実装禁止)。
- layout は共通シェル `HubShell` (`apps/hub/src/components/shell/hub-shell.tsx`) で
  サイドバー / ヘッダー / フッター / ボトムタブを描画し、解決済み scope をリンクのクエリへ
  引き継ぐ。リンク定義の正本は `components/shell/nav-items.ts` の 1 箇所。
  (2026-08-08 当初の `PrimaryNav` 最小シェルは本シェルへ置換して削除した。)
- 画面骨格 (skip link / header / main ランドマーク / nav / footer) は領域ごとに 1 実装だけ持つ。
  業務画面は `HubShell`、公開画面 (`/`, `/legal`, `/device`, サインイン) は
  `components/shell/public-shell.tsx` (`packages/ui` の `AppShell`)。root layout は
  ランドマークを持たない (二重の `main` を作らないため)。
- client-only page (docs 詳細/編集) は layout が Context 経由で同じ scope を配る
  (`dashboard-scope-context.tsx`)。server page は Context を消費できないため各自
  `resolveDashboardScope()` を呼ぶ (React `cache()` で request 内は 1 回にまとまる)。

## Goals and non-goals

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: frontend — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 2026-08-01 dual catalog 実装反映

- `CatalogList` は入力値と適用済み query を分け、初回 1 回・submit 1 回につき 1 回だけ `CatalogPort` を呼ぶ。
- 一覧・詳細・Release 履歴の表示 cache は tenant/workspace/project key と一致する場合だけ描画する。
- 同一 scope の `degraded` は直近表示を維持できるが、401/403/契約不正では `ErrorState` のみとし、以前の内容や install descriptor を描画しない。
- 正本は [system-spec/frontend.md](../system-spec/frontend.md) の `qa-118`、セキュリティ境界は [security architecture](./harness-hub-security.md) を参照する。

## 2026-08-02 顧客持ち込み Google OAuth 管理画面

- `/settings/auth` は Google Console 側の手作業、Hub 登録、接続状態を順に表示し、
  callback URL、scope、last4、現行/pending、最終テスト時刻を区別する。
- client secret は password 入力に留め、送信後に state から消す。任意の Workspace domain は
  カンマ/改行区切りを小文字化・空白除去・重複排除して API へ渡す。
- 公開 enum だけを固定文言へ写し、未知 error・例外・入力値を画面へ流さない。
  正本は [system-spec/frontend.md](../system-spec/frontend.md) の `qa-127`。

## 2026-08-02 サインイン後スコープと Web 完結導線

- サインイン後の遷移先は、保存済みの安全な相対 path、なければ単一の既定値 `/sheets` の順で
  解決する。外部 URL と protocol-relative path は既定値へ落とし、解決後にも既存の
  `authorize()` を通す。
- ブラウザ業務画面の tenant/workspace scope は session の active 値から server 側で解決する。
  API/機械クライアントの明示ヘッダーと併存して不一致なら拒否し、いずれの経路も認可規則を
  複製せず同じ resolver へ収束させる。
- Workspace 選択・切替と S01 Web 公開は共通シェルおよび既存の検査 pipeline に接続する。
  scope 未解決では旧データを描画せず、利用者には Workspace 選択へ戻れる ErrorState を示す。
- 正本は [frontend](../system-spec/frontend.md) の `qa-135`、
  [UI-UX](../system-spec/ui-ux.md) の `qa-136`、認可境界は
  [auth](../system-spec/auth.md) の `qa-137` を参照する。

## 2026-08-08 UI 基盤・実ブラウザ品質境界

- `packages/ui` を AppShell、layout primitive、design token、focus ring、base CSS の owner とし、`apps/hub` は root layout で一度だけ base CSS を注入する consumer とする。
- App Router の root / dashboard / workspace は loading / error / not-found を共通画面状態へ接続し、root は global-error も持つ。403 は再認証導線へ潰さない。
- responsive の数値正本は `breakpointTokens` (`480 / 768 / 1120`)。表の超過は局所 scroll container で受け、document 全体の overflow は実 Chromium で拒否する。
- jsdom gate に加え、Vitest Browser Mode + Playwright で 360 / 768 / 1280px、44px / 36px 操作域、catalog light/dark VRT を検査する。baseline は OS 単位とし CPU architecture では分けない。
- 規範契約は [UI 基盤追補](../specs/harness-hub-ui-foundation-addendum.md)、仕様反映経路は [受領書](../docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md) を正とする。

## 2026-08-08 共通 HubShell・page surface 境界

- `(dashboard)` / `(workspace)` layout は server component `HubShell` を共有する。current pathname は認可完了後に middleware が内部 request header `x-hh-pathname` へ載せ、`usePathname()` のためだけに全 shell を client component 化しない。
- signed session の active claim を `SessionRole` (`member` / `workspace-admin` / `provider-admin`) として読み、実在 route だけを navigation model へ投影する。API 認可を最終決定者としたまま、UI も role 未確定時に管理導線を出さない。
- `packages/ui` は ShellSidebar / ShellHeader / ShellFooter / MobileTabBar、Panel / ScreenHeader / ActionLink、Icon、Modal / BottomSheet を所有する。`apps/hub` は scope、identity、route と業務内容だけを結線する。
- navigation の「その他」は server-first な `details/summary` disclosure とし、modal contract を適用しない。操作用 Modal / BottomSheet / ConfirmDialog は focus trap、Esc、focus 復帰、scroll lock を共通 hook で担保する。
- 破壊操作は `ConfirmDialog` の `reversible` を必須とする。汎用 Modal を実行確認へ流用せず、sticky header より上の overlay layer で背面操作を防ぐ。
- 正本は [UI 基盤追補](../specs/harness-hub-ui-foundation-addendum.md) qa-206 / qa-207、受領は [共通シェル仕様反映受領書](../docs/features/feat-hub-foundation/hub-shell-page-surface-spec-reflection-receipt.md) を参照する。
