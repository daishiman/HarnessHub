---
graph_node_id: "spec-harness-hub-ui-foundation-addendum"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-foundation","frontend","ui-ux","testing-qa","browser-test","vrt"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "Harness Hub UI 基盤・実ブラウザ品質ゲート追補"
owners: ["daishiman"]
created_at: "2026-08-08T07:16:25Z"
updated_at: "2026-08-08T07:47:52Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["feat-hub-foundation","issue-ui-foundation-final-review-20260808","arch-harness-hub-frontend","arch-harness-hub-testing-qa"]
resource_scope: [".github/workflows/ci.yml",".github/workflows/ui-visual.yml","specs/harness-hub-ui-foundation-addendum.md","system-spec/frontend.md","system-spec/ui-ux.md","system-spec/testing-qa.md","docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md"]
purpose: "UI 基盤の所有境界、画面状態、breakpoint、実ブラウザ/VRT gate を製品仕様として固定する"
goal: "qa-201 / qa-203 / qa-204 と実装・CI・文書が同じ UI 品質契約を参照する"
scope_in: ["AppShell / layout / design token の公開契約","loading / empty / not found / forbidden / unexpected error の表示契約","responsive breakpoint と局所横スクロール契約","実 Chromium、catalog VRT、CI failure evidence"]
scope_out: ["公開 API・DB schema・認証認可判定の変更","Cloudflare deploy unit と本番 SLO の変更"]
acceptance: ["packages/ui の公開 layout / token / state contract を apps/hub が利用する","root / dashboard / workspace の状態 file 欠落を G15 が拒否する","360x800 / 768x1024 / 1280x800 の responsive regression が実 Chromium で通る","catalog 7 分類の light / dark VRT が OS baseline と一致する","UI / Hub の typecheck・lint・unit/a11y と client bundle budget が通る"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-ui-foundation-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"9310f064f5f79d8e2b0ef53d3b1dfc25c8afcb25a51fe92e6890cd4ddc0230e2","evaluator":"final review + system-spec transition writer","evidence_ref":"docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-08T07:16:25Z","origin_kind":"system-spec-harness","source_digest":"9310f064f5f79d8e2b0ef53d3b1dfc25c8afcb25a51fe92e6890cd4ddc0230e2","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "qa-201 / qa-203 / qa-204 の確定 UI 契約を横断参照する製品仕様追補"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-ui-foundation-addendum.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-08T07:16:25Z","missing_sections":[],"status":"complete"}
---

# Harness Hub UI 基盤・実ブラウザ品質ゲート追補

## 目的と成功状態

画面ごとに色・余白・レイアウト・失敗表示を作る状態を避け、利用者がどの画面でも同じ操作感で状況を理解できる UI 基盤を定める。DOM だけを扱う単体テストでは検出できない横はみ出し、タップ領域、画像差分も実 Chromium で検査できる状態を成功とする。

## スコープ

- In: `packages/ui` の layout / token / base style、`apps/hub` の App Router 配線、実ブラウザ・VRT・responsive・CI gate。
- Out: 公開 API、DB schema、認証認可判定、Cloudflare deploy unit、本番 SLO の変更。
- owner: `packages/ui`。
- consumer: `apps/hub`。

## 用語と主体

| Term/Actor | Definition/Responsibility |
|---|---|
| UI contract | consumer が公開入口から利用する layout・token・状態表現の契約 |
| route state | loading / not found / forbidden / unexpected error を表す App Router 境界 |
| VRT | baseline と現在画像を比較する visual regression testing（見た目の回帰検査） |
| local scroll | 表など幅が必要な部品の内部だけを横スクロールさせる境界 |
| `packages/ui` | layout / token / base CSS の owner |
| `apps/hub` | UI contract を route と画面へ結線する consumer |

## ユースケースとユーザーフロー

1. 実装者は公開 layout と token で新しい画面を組み立て、route ごとの独自 shell を増やさない。
2. 利用者は読込中・空・権限不足・未検出・予期しない失敗を区別でき、次の操作を選べる。
3. 実装者は catalog fixture を light / dark で描画し、意図しない画像差分を commit 前後で検出する。
4. CI は画面状態 file の欠落、横はみ出し、タップ領域不足、responsive 退行、baseline 差分を fail-closed で拒否する。

## 機能要件

- `FR-UIF-001`: `packages/ui` は `AppShell`、`Container`、`SidebarLayout`、`Stack`、`Card`、`PageHeader`、`NavList` を単一の公開 contract として所有する。
- `FR-UIF-002`: `apps/hub` は root layout で `buildBaseCss()` を一度だけ注入し、route ごとに token や shell を再定義しない。
- `FR-UIF-003`: 数値の正本を `breakpointTokens` の `sm=480`、`md=768`、`lg=1120` とする。
- `FR-UIF-004`: `DataTable` は `data-hh-scroll-x` の局所容器で横幅を受け止め、文書全体を横スクロールさせない。
- `FR-UIF-005`: root / dashboard / workspace は `loading.tsx`、`error.tsx`、`not-found.tsx` を持ち、root は `global-error.tsx` も持つ。
- `FR-UIF-006`: catalog は layout / form / feedback / data / chart / navigation / overlay の 7 分類を light / dark で描画する。

## 非機能要件

- Accessibility/Usability: light / dark の通常文字は 4.5:1、操作部品の輪郭は 3:1 を満たす。comfortable の操作部品は 44px 以上、compact も 36px 未満にしない。
- Reliability: baseline 不在、許容差超過、画像取得失敗、画面状態 file 欠落を成功へ倒さない。
- Performance: shell 追加後も client JS と Worker bundle の既存予算内を維持する。
- Maintainability: server component で成立する骨格へ不要な client state を持ち込まず、route file は共通部品への薄い adapter とする。

## UI・状態遷移

| 状態 | 共通表現 | 必須の意味 |
|---|---|---|
| loading | `LoadingScreen` | `role=status` と `aria-busy` で読み込み中を通知する |
| empty | `EmptyState` | 次に取れる操作を示す |
| not found | `NotFoundScreen` | 安全な戻り先を示す |
| forbidden | `ForbiddenScreen` | 再ログインではなく管理者への依頼先を示す |
| unexpected error | `ErrorScreen` | 再試行または安全な戻り先を示す |

403 を認証切れへ変換しない。`md` 未満は 1 列、`md` 以上は 2 列へ遷移し、表のように幅が必要な要素だけ local scroll を許可する。

## ビジネスルールと検証

- `BR-UIF-001`: token と layout の owner は `packages/ui`、route 配線の owner は `apps/hub` とする。
- `BR-UIF-002`: VRT baseline key は OS 単位とし、CPU architecture では分けない。
- `BR-UIF-003`: baseline は actual / diff の実物を確認してから更新し、`VRT_UPDATE=1` を通常テストの合格条件に使わない。
- `BR-UIF-004`: catalog fixture に時刻・乱数・外部 API 応答など毎回変わる値を入れない。

## API契約

N/A: 公開 endpoint、request / response schema、status code は変更しないため。

## データモデル

N/A: 永続 Entity、field、relation、index、migration は変更しない。theme / density / viewport は描画時の一時値である。

## 認証・認可

- Authentication: 既存 session / OIDC 契約を維持する。
- Authorization: 既存 middleware の role / scope 判定を維持し、UI は判定結果を複製しない。
- Tenant boundary: tenant / workspace scope の解決規則は変更しない。

## エラー・例外・回復

- Error taxonomy: forbidden、not found、unexpected error を別状態として表現する。
- Retry/Fallback: unexpected error は再試行または安全な戻り先を示す。forbidden は再認証 loop に入れない。
- VRT failure: actual / diff を artifact として残し、意図した変更なら対応 OS baseline、意図しない変更なら実装を修正する。

## イベント・非同期処理

N/A: 新しい queue、event producer / consumer、delivery、ordering、DLQ は追加しない。

## 可観測性

- `ci.yml` の G15 は root / dashboard / workspace の画面状態 file 欠落を静的に拒否する。
- `ui-visual.yml` は `workflow_dispatch` または PR の `ui-visual` label で実 Chromium を起動する。
- VRT failure は actual / diff 画像を GitHub Actions artifact として保存する。
- catalog coverage test は必須 7 分類が各 1 件以上あることを検査する。

## 互換性・移行・リリース

- 既存画面は一括置換せず、Catalog、signin、device approval、primary navigation から共通 contract へ移行する。
- viewport は 360x800、768x1024、1280x800、VRT は 1024x768 とする。
- 問題時は実装・route 配線・baseline・CI workflow を同一変更単位で revert し、baseline だけを更新して不具合を隠さない。

## テストと受入条件

- [x] `AC-UIF-001`: 公開 layout / token / state contract を consumer から利用できる。
- [x] `AC-UIF-002`: root / dashboard / workspace の状態 file が全て存在し G15 が欠落を拒否する。
- [x] `AC-UIF-003`: UI / Hub の typecheck・lint・unit / a11y test が通る。
- [x] `AC-UIF-004`: 実 Chromium で 3 viewport の overflow / tap target / column switch が通る。
- [x] `AC-UIF-005`: catalog 7 分類の light / dark VRT が対応 OS baseline と一致する。
- [x] `AC-UIF-006`: client JS と Worker bundle が既存予算内である。

## 未決事項

本仕様内の未決事項は無い。Linux baseline の初期採取は GitHub Actions 上の actual を目視確認するリリース手順であり、仕様値の未決ではない。system-spec U1〜U9 source-index の既存欠落は本追補の範囲外として独立 issue で扱う。

## 正本と証跡

- elicitation: `system-spec/spec-state.json` qa-201 / qa-203 / qa-204（qa-204 は qa-202 を継承）
- compiled chapters: `system-spec/ui-ux.md`、`system-spec/testing-qa.md`、`system-spec/frontend.md`
- frontend guide: `docs/frontend-ui-foundation-spec.md`
- architecture: `architecture/harness-hub-frontend.md`
- receipt: `docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md`
