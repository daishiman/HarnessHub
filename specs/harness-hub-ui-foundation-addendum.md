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
updated_at: "2026-08-11T22:25:22Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["feat-hub-foundation","feat-post-signin-scope-routing","issue-ui-foundation-final-review-20260808","issue-hub-shell-page-surface-unification-20260808","arch-harness-hub-frontend","arch-harness-hub-testing-qa"]
resource_scope: ["apps/hub/","packages/ui/","specs/harness-hub-ui-foundation-addendum.md","system-spec/frontend.md","system-spec/ui-ux.md","system-spec/testing-qa.md","architecture/harness-hub-frontend.md","features/feat-hub-foundation.md","features/feat-post-signin-scope-routing.md","tasks/feat-hub-foundation/sys-hub-foundation-p12.md","tasks/feat-hub-foundation/sys-hub-foundation-p13.md","docs/frontend-spec.md","docs/frontend-ui-foundation-spec.md","docs/screen-inventory.md","docs/features/*/information-design/*.md","tests/specs/test_screen_inventory_closure.py","docs/features/feat-hub-foundation/hub-shell-page-surface-spec-reflection-receipt.md"]
purpose: "UI 基盤の所有境界、画面状態、breakpoint、実ブラウザ/VRT gate を製品仕様として固定する"
goal: "qa-204 / qa-206 / qa-207 と実装・CI・文書が同じ UI shell / surface / quality contract を参照する"
scope_in: ["AppShell / HubShell / layout / design token の公開契約","loading / empty / not found / forbidden / unexpected error の表示契約","role-aware navigation と desktop/mobile shell","Panel / ScreenHeader / ActionLink と modal layer の操作契約","responsive breakpoint と局所横スクロール契約","実 Chromium、catalog VRT、CI failure evidence"]
scope_out: ["公開 API・DB schema・認証認可判定の変更","Cloudflare deploy unit と本番 SLO の変更"]
acceptance: ["packages/ui の公開 shell / layout / token / state contract を apps/hub が利用する","認証後 route が一つの HubShell と main landmark を使う","role 未確定または member へ管理者専用導線を表示しない","破壊操作と modal layer が可逆性・focus・scroll contract を満たす","root / dashboard / workspace の状態 file 欠落を G15 が拒否する","360x800 / 768x1024 / 1280x800 の responsive regression が実 Chromium で通る","catalog 7 分類の light / dark VRT が OS baseline と一致する","UI / Hub の typecheck・lint・unit/a11y と client bundle budget が通る"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-ui-foundation-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a9b2b7930df43920ef68b9854c3c0c6473cba5bdfc71596bed4c04a608fbe3d2","evaluator":"final review + system-spec transition writer","evidence_ref":"docs/features/feat-hub-foundation/hub-shell-page-surface-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-08T11:17:00Z","origin_kind":"system-spec-harness","source_digest":"a9b2b7930df43920ef68b9854c3c0c6473cba5bdfc71596bed4c04a608fbe3d2","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "qa-204 / qa-206 / qa-207 の確定 UI shell・surface・quality 契約を横断参照する製品仕様追補"
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
| route surface | 1 つの `page.tsx` route を role / task-mode / density / responsive pattern / sticky policy と結びつける検証単位 |
| `packages/ui` | layout / token / base CSS の owner |
| `apps/hub` | UI contract を route と画面へ結線する consumer |

## ユースケースとユーザーフロー

1. 実装者は公開 layout と token で新しい画面を組み立て、route ごとの独自 shell を増やさない。
2. 利用者は読込中・空・権限不足・未検出・予期しない失敗を区別でき、次の操作を選べる。
3. 実装者は catalog fixture を light / dark で描画し、意図しない画像差分を commit 前後で検出する。
4. CI は画面状態 file の欠落、横はみ出し、タップ領域不足、responsive 退行、baseline 差分を fail-closed で拒否する。

## 機能要件

- `FR-UIF-001`: `packages/ui` は `AppShell`、`Container`、`SidebarLayout`、`Stack`、`Card`、`ScreenHeader`、`NavList` を単一の公開 contract として所有する。画面上部の見出し帯は `FR-UIF-009` と同じ `ScreenHeader` を唯一の正とし、同じ役割の部品を 2 つ公開しない (`ScreenHeader` 導入前の `PageHeader` は廃止済み)。
- `FR-UIF-002`: `apps/hub` は root layout で `@harness-hub/ui/tokens.css` を一度だけ import し、route ごとに token や shell を再定義しない。生成元は `buildTokenCssArtifact()`、コミット済み CSS との一致は自動検査する。
- `FR-UIF-003`: 数値の正本を `breakpointTokens` の `sm=480`、`md=641`、`lg=1025` とする。`md` / `lg` は「〜640 / 641〜1024 / 1025〜」を min-width で重複なく表現する値であり、検査 viewport 360 / 768 / 1280 は各帯の回帰幅であって token ではない。
- `FR-UIF-014`: 配色はグラファイト × アンバー。`primary` は無彩色、`accent` は動作中専用で、AI専用色を持たない。英数字は IBM Plex Sans、日本語はヒラギノ角ゴ・游ゴシック等のシステムフォント、ID/ログは JetBrains Mono。Card / Panel の角は `radiusTokens.card` (10px)。`prefers-contrast: more` では枠線を `border-strong` かつ 2px にする。nav 現在地は全グループ横断の最長一致 1 件 (`resolveCurrentNavTarget`)。
- `FR-UIF-015`: 認証後の全業務画面は共通 `ShellHeader` にブラウザ履歴の「戻る」「進む」を 1 組だけ持ち、現在 route の画面タイトルを全 viewport で表示する。履歴操作だけを小さな client island に閉じ、`history.length` では判定できない進む履歴を誤って disabled にしない。タイトルは exact route を dynamic route より先に解決し、未登録 route だけ最長一致の nav 領域名へ落とす。公開 shell と各 `ScreenHeader` へ重複配置しない。
- `FR-UIF-004`: `DataTable` は `data-hh-scroll-x` の局所容器で横幅を受け止め、文書全体を横スクロールさせない。
- `FR-UIF-005`: root / dashboard / workspace は `loading.tsx`、`error.tsx`、`not-found.tsx` を持ち、root は `global-error.tsx` も持つ。
- `FR-UIF-006`: catalog は layout / form / feedback / data / chart / navigation / overlay の 7 分類を light / dark で描画する。
- `FR-UIF-007`: 認証後の `(dashboard)` / `(workspace)` route は共通 `HubShell` を使い、skip link / sidebar / header / main / footer / mobile tab を route ごとに再実装しない。
- `FR-UIF-008`: navigation は実在 route と active `SessionRole` から deny-by-default で生成する。role 未確定と member は account settings のみ、workspace-admin は users / coefficients、provider-admin はそれらに加えて auth settings を表示する。
- `FR-UIF-009`: 各画面は `ScreenHeader` / `Panel` / `ActionLink` を基本 surface とし、破壊操作の確認は `reversible` 必須の `ConfirmDialog` を使う。汎用 `Modal` を実行確認へ流用しない。
- `FR-UIF-010`: current pathname は認可完了後に middleware が内部 request header `x-hh-pathname` へ載せ、server layout が現在地表示にだけ使う。
- `FR-UIF-011`: `docs/screen-inventory.md` を route surface profile の SSOT とし、実在する `page.tsx` route はそれぞれ一意な `current` surface ID、role/capability、task-mode、density、wide/middle/narrow pattern、sticky policy、情報設計 sheet、test evidence を持つ。未実装の route/modal/role 変更は Decision ref 付き `planned` に分離する。
- `FR-UIF-012`: navigation の一時 disclosure（Workspace 切替、アカウントメニュー、モバイルの「その他」）は同時に 1 つだけ開く。外側クリック・Escape・別 disclosure の開始で閉じ、Escape は開閉元へフォーカスを戻し、外側クリックはクリック先からフォーカスを奪わない。本文の開閉に使う `details` は対象外とする。
- `FR-UIF-013`: `Modal` / `BottomSheet` は既定で背景クリック・Escape・閉じる操作により閉じる。未保存の入力を持つ面は `dismissible=false` とし、保存または破棄確認を伴う明示操作以外では閉じない。

## 非機能要件

- Accessibility/Usability: light / dark の通常文字は 4.5:1、操作部品の輪郭は 3:1 を満たす。comfortable の操作部品は 44px 以上、compact も 36px 未満にしない。
- Reliability: baseline 不在、許容差超過、画像取得失敗、画面状態 file 欠落を成功へ倒さない。
- Performance: shell 追加後も client JS と Worker bundle の既存予算内を維持する。
- Maintainability: server component で成立する骨格へ不要な client state を持ち込まず、route file は共通部品への薄い adapter とする。
- Modal accessibility: `Modal` / `BottomSheet` / `ConfirmDialog` は共通 hook で focus trap、Esc、focus 復帰、scroll lock を担保し、overlay を sticky header より上に置く。

## UI・状態遷移

| 状態 | 共通表現 | 必須の意味 |
|---|---|---|
| loading | `LoadingScreen` | `role=status` と `aria-busy` で読み込み中を通知する |
| empty | `EmptyState` | 次に取れる操作を示す |
| not found | `NotFoundScreen` | 安全な戻り先を示す |
| forbidden | `ForbiddenScreen` | 再ログインではなく管理者への依頼先を示す |
| unexpected error | `ErrorScreen` | 再試行または安全な戻り先を示す |

403 を認証切れへ変換しない。`md` 未満は 1 列、`md` 以上は 2 列へ遷移し、表のように幅が必要な要素だけ local scroll を許可する。

desktop (`md` 以上) は sidebar + header + content + footer、mobile (`md` 未満) は header + 主要 4 slot + 5 番目の「その他」とする。未実装 route は表示しない。「その他」の navigation overflow は背景を遮る dialog ではなく `details/summary` disclosure とし、標準 Tab 順・`aria-current`・44px tap target を守る。Workspace 切替・アカウントメニューを含む navigation disclosure は共通の小さな client island で light dismiss（外側クリックで閉じること）・Escape・排他開閉を担保するが、route/scope 切替は server-first の document 遷移を維持する。操作用 `BottomSheet` は別部品で、dialog semantics と明示 close を持つ。swipe は唯一の操作にしない。

## ビジネスルールと検証

- `BR-UIF-001`: token と layout の owner は `packages/ui`、route 配線の owner は `apps/hub` とする。
- `BR-UIF-002`: VRT baseline key は OS 単位とし、CPU architecture では分けない。
- `BR-UIF-003`: baseline は actual / diff の実物を確認してから更新し、`VRT_UPDATE=1` を通常テストの合格条件に使わない。
- `BR-UIF-004`: catalog fixture に時刻・乱数・外部 API 応答など毎回変わる値を入れない。
- `BR-UIF-005`: API 認可を最終決定者としたまま、UI も権限外導線を DOM に出さない。session role token は `provider-admin` / `workspace-admin` / `member` 以外へ拡張しない。
- `BR-UIF-006`: 手書きファイルは 500 行を超える前に責務別へ分離する。component catalog は core / data-chart / shell-overlay の定義へ分けても公開部品名の一意性を保つ。
- `BR-UIF-007`: 各情報設計 sheet は対応する surface ID と route だけを逆参照し、profile 値を複製しない。実 route ↔ current surface ↔ sheet ↔ evidence の閉包は `tests/specs/test_screen_inventory_closure.py` で fail-closed に検査する。

## API契約

N/A: 公開 endpoint、request / response schema、status code は変更しないため。

## データモデル

N/A: 永続 Entity、field、relation、index、migration は変更しない。theme / density / viewport は描画時の一時値である。

## 認証・認可

- Authentication: 既存 session / OIDC 契約を維持する。
- Authorization: 既存 middleware の role / scope 判定を維持し、UI は判定結果を複製しない。
- Navigation projection: signed active session の `SessionRole` を表示投影に使う。role 未確定時は最小権限へ倒し、管理者用リンクを表示しない。
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
- screen inventory closure test は、current route の未登録・重複登録、sheet/evidence の欠落、sheet からの surface ID 逆参照不整合、Decision ref の無い planned 行を拒否する。

## 互換性・移行・リリース

- 既存画面は一括置換せず、Catalog、signin、device approval、primary navigation から共通 contract へ移行する。
- `PrimaryNav` の最小シェルは `HubShell` と `nav-items.ts` へ置き換える。既存の tenant/workspace query 伝搬と route 到達性テストを後継へ移し、旧実装を併存させない。
- 検査 viewport は 360x800、768x1024、1280x800、VRT は 1024x768 とする（token の md/lg とは別契約）。
- 問題時は実装・route 配線・baseline・CI workflow を同一変更単位で revert し、baseline だけを更新して不具合を隠さない。

## テストと受入条件

- [x] `AC-UIF-001`: 公開 layout / token / state contract を consumer から利用できる。
- [x] `AC-UIF-002`: root / dashboard / workspace の状態 file が全て存在し G15 が欠落を拒否する。
- [x] `AC-UIF-003`: UI / Hub の typecheck・lint・unit / a11y test が通る。
- [x] `AC-UIF-004`: 実 Chromium で 3 viewport の overflow / tap target / column switch が通る。
- [x] `AC-UIF-005`: catalog 7 分類の light / dark VRT が対応 OS baseline と一致する。
- [x] `AC-UIF-006`: client JS と Worker bundle が既存予算内である。
- [x] `AC-UIF-007`: 認証後 route の main landmark は一つで、現在地は server-rendered shell に `aria-current` で示される。
- [x] `AC-UIF-008`: member / role 未確定 / workspace-admin / provider-admin の navigation 投影が API 権限階層と一致する。
- [x] `AC-UIF-009`: Modal layer の focus trap / Esc / focus 復帰 / scroll lock と、破壊操作の可逆性表示が unit / axe test で通る。
- [x] `AC-UIF-010`: catalog 定義を責務別に分け、変更対象の手書きファイルが 500 行以下である。
- [x] `AC-UIF-011`: 26 の current route surface が inventory に一意登録され、対応 sheet と test evidence へ機械的に到達できる。
- [x] `AC-UIF-012`: 日時は絶対表記 (JST) を常に残し、直近は `DateTimeText` で相対併記する。相対は描画後付与で hydration 不一致を作らない。
- [x] `AC-UIF-013`: 一覧 `q` は `listSearchTermSchema` と repository `containsTerm`（LIKE ESCAPE）に一本化し、ヘッダー検索は API が `q` を処理する route にだけ結線する。
- [x] `AC-UIF-014`: route surface の pattern と実装印は screen-pattern gate で突き合わせ、判定件数 0 と違反 0 を区別する。
- [x] `AC-UIF-015`: navigation disclosure が外側クリック・Escape・別メニュー開始で閉じ、Escape のフォーカス復帰と外側クリック先のフォーカス維持が unit test で通る。
- [x] `AC-UIF-016`: `dismissible=false` の Modal / BottomSheet は背景・Escape・閉じるボタンから閉じられず、未保存内容を暗黙破棄しないことが unit test で通る。
- [x] `AC-UIF-017`: 共通業務ヘッダーに名前付きの履歴 navigation が 1 件だけあり、44px の「戻る」「進む」、route 固有タイトル、最長一致 fallback、axe 違反 0 を unit / Hub 結合テストで固定する。

## 2026-08-12 UI MVP wave 追補

- 表示名: optional session claims (`name` / `workspace_names`) と Project 名解決。認可入力には使わない。
- 一覧: sticky 先頭列、FilterBar + 条件記憶、ListState 排他、header `?q=` 結線。
- 日時: `DateTimeText` + `RELATIVE_TIME_MAX_AGE_DAYS=30`。絶対表記は消さない。
- metrics: ranking はサーバで上位 N 件、母集団は `rankingTotals`。
- client JS: 120 KiB を超えた重い画面本体は route-local `next/dynamic` へ分離し、
  `StickyHeaderOffset` は sticky stack を使う画面だけに配置する。遅延分割後も
  screen-pattern gate は `import()` の参照先まで辿り、検査対象を減らさない。
- 受領: `docs/features/feat-hub-foundation/ui-mvp-wave-20260812-spec-reflection-receipt.md`。

## 未決事項

route surface の current 閉包は完了した。一方、`/dashboard` 新設と既定着地の変更、公開ウィザードの modal 化、Device 承認の owner 限定、Release rollback / master-detail は、いずれも現行実装に存在しない製品判断である。`docs/screen-inventory.md` の Current / planned 境界表と Decision ref を正本とし、承認なしに current 受入条件へ混ぜない。navigation disclosure の swipe gesture は可視ボタンと標準 keyboard 操作を代替に持つ任意拡張であり、受入を阻害しない。system-spec U1〜U9 source-index の既存欠落は本追補の範囲外として独立 issue で扱う。

## 正本と証跡

- elicitation: `system-spec/spec-state.json` qa-204 / qa-206 / qa-207（qa-206 は qa-203、qa-207 は qa-201 を継承）
- compiled chapters: `system-spec/ui-ux.md`、`system-spec/testing-qa.md`、`system-spec/frontend.md`
- frontend guide: `docs/frontend-ui-foundation-spec.md`
- route surface profile SSOT: `docs/screen-inventory.md`
- information-design rationale: `docs/features/*/information-design/*.md`
- route closure test: `tests/specs/test_screen_inventory_closure.py`
- architecture: `architecture/harness-hub-frontend.md`
- receipt: `docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md`
- shell/page surface receipt: `docs/features/feat-hub-foundation/hub-shell-page-surface-spec-reflection-receipt.md`
- UI MVP wave receipt: `docs/features/feat-hub-foundation/ui-mvp-wave-20260812-spec-reflection-receipt.md`
