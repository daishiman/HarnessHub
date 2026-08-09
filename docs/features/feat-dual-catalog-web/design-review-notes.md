---
status: confirmed
layer: feature-design-review
task: SYS-DUAL-CATALOG-WEB-P03
parent_feature: feat-dual-catalog-web
feature_package_id: feature-package/feat-dual-catalog-web
feature_context_digest: sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3
reviewed_artifact: docs/features/feat-dual-catalog-web/architecture-decision-record.md
verdict: pass-with-corrections
---

# feat-dual-catalog-web 独立設計レビュー記録 (P03)

> **位置づけ**: P03 の成果物。[architecture-decision-record.md](./architecture-decision-record.md) (P02) の 4 系統決定 D1-D4 を、**設計文書の記述を信じずリポジトリ実測で裏を取る**方針でレビューする。指摘は「是正指示 + 差し戻し先」を明記し、是正済みのものはその結果まで記録する。

## 0. レビュー方法と総合判定

- **方法**: D1-D4 の各決定が依拠する前提を、対応する実ファイル・実 CI 定義・実テスト設定に当たって確認した。「ADR にそう書いてあるから正しい」は根拠として採用していない。
- **総合判定**: **pass-with-corrections** — P02 への全面差し戻しは不要。是正指示 5 件のうち R2 は P02 へ差し戻して**是正済み**、R5/R6/R7/R8 は P04 以降への引き継ぎ事項として確定した。
- P05 実装着手の可否: **可**。ただし §4 の引き継ぎ事項を満たさない実装は acceptance を満たさない。

| # | 対象 | 判定 | 差し戻し先 |
|---|---|---|---|
| R1 | D1 画面構成・状態管理境界 | OK (条件付き) | — (P12 で spec 追補) |
| R2 | D2 リトライ上限・レート制御の欠落 | **要是正 → 是正済み** | P02 (ADR §2.4 を追補) |
| R3 | D2 ポーリング × CWV (CLS/INP) 共存 | OK | — |
| R4 | D3 Stage 0 gate 判定結果の消費 | OK | — |
| R5 | D3 pending-h7 の空配信が「正常な空」と誤読される | 要是正 | P04 (検証設計で固定) |
| R6 | テスト収集経路が Write scope と噛み合わない | **要是正 (重大)** | P04/P05 |
| R7 | acceptance 2 (CWV 実測) の到達可能性 | 要是正 | P07/P13 |
| R8 | 既存 CI ゲートとの二重実行 | 要是正 | P05 |

## 1. 主要レビュー観点への回答

P03 spec が名指しした 2 観点と 2 workstream について先に結論を述べる。

### 1.1 ポーリングは qa-018 (axe / CWV) と共存できるか — **できる**

| 悪化要因 | ADR の設計 | 実測による裏取り |
|---|---|---|
| CLS (再レンダリングでレイアウトが跳ねる) | S03 を S02 のタブに統合し、更新対象を `CatalogPublishStatus` 内の status 表示に限定 (§1.1) | 既存 [`hearing-sheet-list.tsx`](../../apps/hub/src/app/(dashboard)/sheets/hearing-sheet-list.tsx) が同型の実装 (`StatusChip` の差し替えのみ) で G9 axe を通過している。**同じ形なら退行しない** |
| INP (ポーリングがメインスレッドを占有) | `setTimeout` + 純関数の間隔計算のみ。状態管理ライブラリを増やさない (§1.3) | `@tanstack/react-query` は `apps/hub/package.json` に**不在**。導入しない決定は CWV 予算 (D4) に対して純減であり整合 |
| スクリーンリーダの割り込み | `aria-live="polite"` かつ focus を奪わない (§2.2) | `polite` は読み上げ中断を起こさない。`assertive` を選んでいない点は qa-018 と整合 |
| 不可視タブでの浪費 | `visibilityState !== 'visible'` で停止 (§2.2) | 既存 hearing-intake の 30s 固定 `setInterval` は可視性制御を持たない。**本 feature の方が厳しい** |

**判定 (R3): OK。** ただしこれは「設計上悪化しない」であって実測ではない。実測は P06 (axe) / P13 (CWV) に委ねる (R7 参照)。

### 1.2 D3 は feat-stage0-distribution-gate の判定結果を正しく消費しているか — **正しい**

- [`stage0-gate-conclusion.md`](../feat-stage0-distribution-gate/stage0-gate-conclusion.md) を直接確認: `verdict: H7_NOT_ESTABLISHED` / `stage1_entry_condition: NOT_MET`、§8 (2026-07-30) に「再検証は `HarnessHub-n2c0` で行い、結果が揃うまで Stage 1 を開始しない」。
- ADR §3.1 は `plugins[].source` の**経路固有値を確定させず**、`plugins: []` + `x-catalog-source-status: pending-h7` を返す。これは gate の fail-closed 契約 (「未確定のまま経路依存の決定を確定させない」) を**破っていない**。
- 参照点を `system-spec/spec-state.json` の `decisions[]` (D7) と定めた点も妥当 — gate の結論が入る唯一の正本を見ており、ADR 側に判定ロジックを複製していない。

**判定 (R4): OK。** ただし §2 の R5 を伴う。

### 1.3 Security — テナント分離 deny-by-default は反映されているか

- ADR §5 の境界 3 で「認可判定を `lib/catalog/` に書かない」「`lib/authz/` の `withAuthz` を marketplace.json route に適用」と明記。**認可の複製を禁じている点は正しい**。
- 実測: `apps/hub/src/lib/authz/` は存在し、CI の `test:tenant-isolation` が `.github/workflows/ci.yml` で強制されている。catalog 画面のデータ取得は `x-harness-tenant-id` / `x-harness-workspace-id` ヘッダ経由で既存 API の deny-by-default に従う (既存 sheets 画面と同型)。
- **判定: OK。** ただし marketplace.json は「配布出口」であり、**テナント横断で公開される可能性がある唯一の route** である。P05 では `withAuthz` 適用後も「別テナントの entry が混入しないこと」を単体で固定すること (P04 引き継ぎ)。

### 1.4 API — 消費契約の妥当性 (エラー時のリトライ上限・レート制御)

**指摘 R2 (要是正)**: ADR §2.2 は正常系の間隔 (2s→×2→30s) しか定めておらず、**連続失敗時の停止条件・総試行時間・同時実行制御・`429` の扱いが未定義**だった。この状態で P05 に入ると「失敗し続けるサーバへ 30s 間隔で無限にリクエストを打つ UI」が仕様上許容されてしまう。

**差し戻しと是正結果**: P02 へ差し戻し、ADR に **§2.4「エラー時のリトライ上限とレート制御」を追補済み** (連続失敗 5 回 / 総試行 15 分 / in-flight 1 本 / `Retry-After` 優先 / 停止判定は純関数 `shouldContinuePolling`)。追補は既存 §2.2 を書き換えない additive 改訂であり、D2 の他の決定に影響しない。**是正済みにつき P04 進行可。**

## 2. D1-D4 の個別レビュー

### R1 — D1 画面構成・状態管理境界

- **OK な点**: 3 層分離 (`app/` = route のみ / `components/` = client 部品 / `lib/` = React 非依存の純粋ロジック) は、P04 で「lib 層は DOM なし単体テスト、components 層は axe 込み DOM テスト」に割り当てられる形になっており、検証可能性から逆算されている。`@harness-hub/ui` 単一入口の制約も ADR R-15 と一致。
- **条件付きの理由**: S04 の route を `/catalog/releases` に置く決定は、[screen-inventory.md](../../docs/screen-inventory.md) の S04「Workspace 設定・Release 履歴」という画面定義に対し、**Release 履歴だけを切り出した部分実装**である。これは P05 の Write scope が `app/(workspace)/catalog/` に限定されている以上、**scope 内で取り得る唯一の配置**であり設計ミスではない。ただし frontend-spec §1 の route 表との差分は残る。
- **引き継ぎ**: route drift (`/harnesses` vs `/catalog`、S04 の配置) は P12 で frontend-spec へ追補する (ADR §7-3 で追跡済み)。

### R5 — pending-h7 の空配信が「正常な空カタログ」と誤読される

- ADR §3.1 の `plugins: []` は、**「経路未確定なので出せない」と「公開済みツールが 1 件も無い」が同じ応答になる**。配信を受ける側 (Bootstrap Installer / marketplace 利用者) が後者と解釈すると、gate 未確立が観測できないまま素通りする。
- ヘッダ `x-catalog-source-status: pending-h7` はこの区別のために置かれているが、**ヘッダは落ちやすい** (プロキシ・キャッシュ層で除去され得る)。
- **是正指示 (P04 へ)**: 検証設計で以下 2 点を必ず固定すること。
  1. `pending-h7` 時の応答が **ヘッダと body の両方**で未確定を表明すること (body 側にも `sourceStatus` を持たせる)。
  2. 「entry が 0 件」と「経路未確定」が**異なる応答**になることをテストで区別する (0 件を緑と誤読させない = 既存 a11y テストが `tests/a11y/hub-screens.spec.ts` で採っている Goodhart 回避と同じ型)。

### R6 — テスト収集経路が Write scope と噛み合わない (**重大**)

実測で判明した最も重い問題。

| 実測 | 内容 |
|---|---|
| `apps/hub/vitest.config.ts` の `include` | `['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'tests/**/*.spec.ts', 'tests/**/*.spec.tsx']` — **`tests/` 配下のみ** |
| P04 の Write scope | `apps/hub/src/__tests__/dual-catalog-web/` |
| 帰結 | **この場所に置いたテストは vitest が一切収集しない**。`pnpm test` でも `test:a11y` でも実行されず、「テストを書いたのに緑」という最悪の偽陽性になる |

- **是正指示 (P04/P05 へ)**: テストは Write scope どおり `apps/hub/src/__tests__/dual-catalog-web/` に置いた上で、**`apps/hub/vitest.config.ts` の `include` に `src/__tests__/**` を追加する**。これは既存 `tests/**` の収集を変えない純粋な追加であり、既存テストの挙動に影響しない。
- **Write scope 逸脱の明示**: `vitest.config.ts` は P04/P05 いずれの Write scope にも含まれない。しかし**この 1 行がなければ P04 の成果物が実行不能**であり、acceptance 1 (「axe 違反 0 がリリース条件として CI に存在する」) が構造的に達成できない。よって**最小逸脱として許容し**、P08 (refactoring/migration note) と P11 (evidence) で追跡対象として明記すること。

### R7 — acceptance 2「CWV 全指標 good を実測で満たす」の到達可能性

- 実測: `.github/workflows/cwv.yml` は**週次 cron の Lighthouse 実行**であり、`vars.HUB_PUBLIC_URL` が未設定なら「未計測を good と見なさないため」**fail-closed で落ちる**設計。
- 帰結: **本 feature の実装だけでは acceptance 2 を実測で満たせない。** 公開 URL が存在する = P13 のデプロイ完了が前提条件。
- **是正指示 (P07/P13 へ)**: P07 の受入判定で acceptance 2 を「達成」と書かない。**「実測待ち (blocked on deploy)」として正直に記録**し、P13 で `HUB_PUBLIC_URL` 設定後の実測をもって確定させる。計測していない指標を good と申告することは qa-018 の fail-closed 契約に対する違反にあたる。

### R8 — 既存 CI ゲートとの二重実行

- 実測: `.github/workflows/ci.yml` に **G9 axe** (`pnpm --filter @harness-hub/ui run test:a11y && pnpm --filter @harness-hub/hub run test:a11y`) と **G13 client bundle** (`pnpm --filter @harness-hub/hub run check:client-bundle`) が**既に存在する**。
- ADR §6 は新規 `.github/workflows/hub-web-quality-gate.yml` に「axe 検査 + client bundle 予算」を置くとしており、そのままでは同じ検査が 2 本走る。
- **是正指示 (P05 へ)**: 新規 workflow は**本 feature 固有分のみ**を担う。具体的には (a) `src/__tests__/dual-catalog-web/` の catalog 専用テスト実行、(b) catalog route を対象にした client bundle 予算の確認。汎用の G9/G13 を再定義しない。`apps/hub/package.json` への script 追加は Write scope 外のため、workflow から vitest を直接呼ぶ形にすること。

### R9 (参考) — D4 の前提は実在するか

ADR §4.2 が「前提とする」と書いた 2 点を実測確認した。**どちらも成立している。**

| 前提 | 実測 |
|---|---|
| `next.config.ts` の `experimental.optimizePackageImports` に `@harness-hub/ui` が登録済み | **登録済み** (`apps/hub/next.config.ts`) |
| First Load JS 予算 120 KiB が既存ゲートの実値 | **一致** (`apps/hub/scripts/check-client-bundle.mjs` の `DEFAULT_BUDGET_BYTES = 120 * 1024`) |

また §2.1 の `Idempotency-Key` を client 生成 UUID で送る決定は、`crypto.randomUUID()` が `src/shared/audit/index.ts` と `src/lib/auth/device-flow/service.ts` で既に使われており、Workers 実行環境で利用可能なことが実績で裏付けられる。**判定: OK。**

## 3. P02 へ差し戻さなかった指摘の扱い

R5/R6/R7/R8 はいずれも「P02 の architecture decision が誤っている」のではなく、**実装・検証の結線の問題**である。ADR を書き換えても解消せず、P04/P05/P07 の成果物側で解く必要がある。したがって差し戻さず、次節の引き継ぎ事項として確定する。

## 4. P04 以降への引き継ぎ事項 (未達なら acceptance 不成立)

| # | 引き継ぎ先 | 必須事項 |
|---|---|---|
| H1 | P04 | `vitest.config.ts` の `include` に `src/__tests__/**` を追加し、テストが実際に収集されることを確認する (R6) |
| H2 | P04 | pending-h7 応答を body + ヘッダの両方で表明し、「0 件」と「未確定」を区別するテストを置く (R5) |
| H3 | P04 | marketplace.json にテナント横断の entry が混入しないことを単体で固定する (§1.3) |
| H4 | P04 | `shouldContinuePolling` の停止条件 (連続失敗 5 / 総試行 15 分) を純関数テストで固定する (R2 是正の実装確認) |
| H5 | P05 | 新規 workflow は catalog 固有分のみ。既存 G9/G13 を再定義しない (R8) |
| H6 | P07 | acceptance 2 を「実測待ち」として記録し、達成と書かない (R7) |
| H7 | P08/P11 | `vitest.config.ts` の Write scope 最小逸脱を追跡対象として明記する (R6) |
| H8 | P12 | route drift (`/harnesses` vs `/catalog`、S04 の配置) を frontend-spec へ追補する (R1) |

## 5. 実装後の再検証 (2026-08-08)

> **背景**: §1-§4 は実装着手前に ADR だけを対象に行ったレビューである。P05-P13 が完了し実装が main
> に入った現在、同じ 6 観点を**実コードへ当て直して**再検証した。ADR の記述を信じず、
> 実ファイル・実テスト・実 CI 定義に当たっている。指摘は「観点 → verdict → 根拠 (file:line)」で記す。

- **再検証の総合判定**: **pass-with-corrections (継続)** — 設計判断そのものの誤りは検出していない。
  一方で **CONCERN 4 件** (うち 1 件は実装挙動、3 件は文書の陳腐化) を新規に検出した。
- **CWV は PASS と書かない**。予算未達が未解消のまま残っている (§5.5)。

| # | 観点 | verdict |
|---|---|---|
| V1 | S01-S04 画面構成・状態管理境界 (ADR §1) | PASS |
| V2 | install descriptor 契約 (ADR §2.1) | PASS |
| V3 | ポーリング設計 (ADR §2.2 / §2.4) | **CONCERN** |
| V4 | marketplace.json 生成方式 (ADR §3) | **CONCERN (軽微)** |
| V5 | CWV バンドル予算 (ADR §4) | **未達 (既知・未解消)** |
| V6 | feature 境界の遵守 (ADR §5) | PASS |

### 5.1 V1 — S01-S04 画面構成・状態管理境界: **PASS**

- 3 層分離は実在する。route 層 = `apps/hub/src/app/(workspace)/catalog/{page.tsx, [projectId]/page.tsx, releases/page.tsx}`、
  client 部品 = `apps/hub/src/components/catalog/` の 5 ファイル、純粋ロジック = `apps/hub/src/lib/catalog/`。
  route 層にデータ取得は無く、`page.tsx:25-37` は `searchParams` と scope の解決のみを行う。
- S03 が独立 route を持たない決定 (ADR §1.1) は守られている。`catalog/` 配下の動的 route は `[projectId]` だけで、
  `CatalogPublishStatus` は S02 のタブ部品として存在する。
- **状態管理境界は ADR より厳しく作られている**。ADR §1.1 は「サーバ状態 = `useState`」としか書いていないが、
  実装は scope 切替時の stale 描画を明示的に閉じている: `CatalogList.tsx:43-45` が `scopeKey` を状態として持ち、
  `CatalogList.tsx:91-92` で `entriesScopeKey !== scopeKey` の間は前 tenant の行を 1 frame も出さない。
  `authorization-cache-boundary.test.tsx:127-198` (DC-TEN-06..10) が固定している。
- **軽微な差分 (記録のみ)**: ADR §1.2 / §6 は `lib/catalog/` を 6 ファイルと列挙するが、実装は 7 ファイル
  (`publish-status.ts` が追加。`PublishRequestState` → StatusChip 値の写像)。Write scope 内の追加であり逸脱ではない。

### 5.2 V2 — install descriptor 契約: **PASS**

- 「UI 側で descriptor を組み立てない」制約が実装で守られている。`CatalogInstallPanel.tsx:84-107` は
  `descriptor.command` / `download_url` / `launch_url` を**そのまま**描画するだけで、R2 key や URL の合成が無い。
  `scope-boundary.test.ts:75` (DC-SCOPE-04) が回帰を固定。
- `Idempotency-Key` は契約どおり client 生成 UUID で、**同一導入操作では鍵を再利用**する
  (`CatalogInstallPanel.tsx:42,46` の `useRef` + `??=`)。再試行のたびに鍵を作り直す実装なら download count が
  重複加算されるが、そうなっていない。送出は `http-adapter.ts:175-181` の 1 箇所に閉じている。
- port の型 (`ports.ts:63-72`) と HTTP 実装 (`http-adapter.ts:175-181`) の引数が一致し、契約と実装の乖離は無い。

### 5.3 V3 — ポーリング設計: **CONCERN** (穴 2 件)

純関数側 (`polling.ts`) は ADR §2.4 を過不足なく実装している (連続失敗 5 = `:15`、総試行 15 分 = `:17`、
`Retry-After` 優先 = `:100-103`)。問題は**呼び出し側の hook にある**。

- **C1 (実質的な指摘) — 認可失敗を「一時的な失敗」と同じに扱っている**。
  `CatalogPublishStatus.tsx:72-76` は失敗の種別を見ずに `consecutiveFailures` を加算するだけで、
  `shouldContinuePolling` (`polling.ts:70-77`) の入力にも失敗種別が無い。
  結果として **403 (権限なし) でも 5 回叩いてから止まる**。`degradation.ts:52` は「権限不足は
  サインインし直しても解決しない」と正しく述べており、その理屈はリトライにもそのまま当てはまる。
  401 も同様で、`catalogCapabilities` が `requiresSignIn: true` を返せる情報を hook が使っていない。
  → **是正指示 (follow-up)**: `PollingState` に失敗種別を渡し、`unauthorized` / `forbidden` / `fatal` は
  1 回目で停止させる。判定は `polling.ts` の純関数側に置く (hook に条件を書くと §2.4 の「停止条件を 1 箇所に集める」が崩れる)。
- **C2 — 不可視タブからの復帰でポーリングが再開しない**。
  ADR §2.2 は frontend-spec の `refetchIntervalInBackground: false` と同義と述べており、これは
  「一時停止して復帰時に再開」を意味する。しかし実装は `CatalogPublishStatus.tsx:78-89` で
  `documentVisible: false` を受けると `stopped = true` を立てて effect を抜け、
  `visibilitychange` の購読はコードベース全体に存在しない (`apps/hub/src` 全文検索で 0 件)。
  タブを離れて戻ると自動更新は**永久に**戻らず、利用者が「再試行」を押す必要がある。
  緩和要因として「自動更新を停止しました」+ 再試行ボタンが出る (`:122-133`) ため、
  黙って古い値を表示し続ける最悪形ではない。
  → **是正指示 (follow-up)**: `visibilitychange` で復帰時に `retry()` 相当を発火させるか、
  ADR §2.2 を「復帰しない前提の停止」と改訂して意図を一致させる。どちらでもよいが、
  現状は**設計文と実装の意味が食い違ったまま**である。
- **C3 (文書側) — 終端 status の定義が ADR と実装で違う**。ADR §2.2 は終端を
  `Published` / `Failed` / `Draft` の 3 つとするが、実装の pollable 集合は
  `validating` / `approved` / `publishing` の 3 状態のみ (`polling.ts:27-31`)。
  実装は `needs_fix` / `ready` / `approval_pending` (= 人の操作待ち) も叩かない**より正しい**判断だが、
  ADR が追随していない。→ ADR §2.2 の表を実装に合わせて改訂する。
- `429` の扱いに穴は無い。`Retry-After` を数値形式のみ受理し空文字を 0 秒と誤読しない
  (`polling.ts:83-92`)、異常値は総試行上限でクランプする (`:102`)。`polling-contract.test.ts` の
  DC-POLL-09/10 が両分岐を固定している。
- 同時実行も設計どおり。`run` を直列に繋ぎ (`CatalogPublishStatus.tsx:91-93`)、unmount 時に
  `AbortController` で中断する (`:98-102`)。

### 5.4 V4 — marketplace.json 生成方式: **CONCERN (軽微)**

- スキーマは正本と一致している。`marketplace-document.test.ts:69-86` (DC-MKT-01) が
  `.claude-plugin/marketplace.json` を実読みし、**追加キーが `source_status` の 1 つだけ**であること、
  `plugins[]` の要素キーが完全一致することを固定する。新形式の発明は起きていない。
- 生成は純関数で決定的 (`marketplace.ts:62-78`)、fail-closed も実装済み。
  `resolveAdoptedSourceResolver()` は `null` を返し (`marketplace.ts:93-95`)、
  route は entry を読みに行かずに空を返す (`route.ts:40-44`)。
- **§2 の R5 是正は履行されている**。「0 件」と「経路未確定」の区別が body (`marketplace.ts:76`) と
  header (`route.ts:57`) の**両方**で表明されている。当時の是正指示どおり。
- **CONCERN**: `GET /marketplace.json` は `withAuthz` 配下 (`route.ts:32-38`) にあり、**未認証では取得できない**。
  現状は plugins が常に空なので実害は無い。しかし H7 確定後に URL 型 marketplace として消費させる場合、
  一般の marketplace クライアントは session を持たない。ADR §3 は「配布出口」とだけ述べ、
  **未認証消費者の経路を決めていない**。→ H7 確定と同時に「認証必須の workspace カタログ」と
  「未認証の配布出口」を分けるか統合するかを ADR で決める必要がある (経路確定前なので今は差し戻さない)。

### 5.5 V5 — CWV バンドル予算: **未達 (既知・未解消)。PASS ではない**

- 予算の実体: `.github/workflows/cwv.yml:71-73` が LCP ≤ 2500ms / CLS ≤ 0.1 /
  **TBT ≤ 200ms (INP の lab 代理指標)** を fail-closed で判定する。
- **未達の事実**: `HarnessHub-aqi` は現在も **IN_PROGRESS** であり、close 条件は「本番 CWV 実測で TBT ≤ 200ms」。
  初回本番実測 **TBT 926ms (予算 200ms)** に対する是正 (`next.config.ts` の `optimizePackageImports`) は
  入っているが、**是正後の本番実測が取れておらず、予算内に収まった証跡が無い**。
  本 feature の acceptance 2 も `acceptance-record.md:20` で「未達 (未計測)」と記録されており、
  §2 の R7 / 引き継ぎ H6 (「達成と書かない」) は守られている。**この点は履行済み**。
- 代理指標のみ緑。client JS 予算は `/catalog/[projectId]` 119.0 KiB / 120.0 KiB で
  **余裕 1.0 KiB** (`evidence-summary.md` §1.4)。ADR §4.2 の dynamic import 方針は実装されており
  (`http-adapter.ts:56-83` が zod 契約一式 18.3 KiB を遅延化)、それでこの余裕である。
  → **注意喚起**: catalog に import を 1 つ足すだけで G13 が落ちうる。代理指標が緑なことを
  CWV good の根拠に使わないこと (予算超過の TBT 926ms と代理指標の緑は両立する)。
- **CONCERN (文書の陳腐化)**: 本 feature の複数文書が「CWV は原理的に測れない」と記すが、**この前提は既に無効**。
  `runbook-follow-ups.md:30` / `evidence-summary.md:96-101` / `release-record.md:112` は
  「`/catalog` が未認証 401 で Lighthouse が読めない」を阻害要因とするが、現在の main には
  署名付き短命 credential による計測経路が存在する: `cwv.yml:22-42` が
  `HUB_CWV_PROBE_SECRET` 等を fail-closed で要求して `mint-cwv-probe.mjs` で ticket を発行し、
  `apps/hub/src/middleware.ts:46-68` がこれを検証して cookie へ移す。
  → **follow-up**: 阻害要因は解消済みなので、`gh workflow run hub-cwv` を実行して acceptance 2 を
  実測で確定させる。同時に上記 3 文書の「計測不能」記述を訂正する (本 P03 の Write scope 外)。

### 5.6 V6 — feature 境界の遵守: **PASS**

- 書込操作の越境は無い。`lib/catalog/` 内の `POST` は install descriptor 取得 1 本のみ
  (`http-adapter.ts:177`)、promote / rollback / pointer 更新の口は存在しない。
  `scope-boundary.test.ts:29-80` (DC-SCOPE-01..04) と `tenant-isolation.test.ts:126` (DC-TEN-04
  「`lib/catalog/` に認可判定を複製しない」) が構造として固定している。
- 認可の単一化 (ADR §5 境界 3) は守られている。marketplace route は `withAuthz` 経由 (`route.ts:32-38`)、
  画面側の取得は `http-adapter.ts:36-41` が scope 空を `forbidden` に倒して API の deny-by-default に委ねる。
- 承認キュー UI (Stage 2 / scope out) は未実装 (DC-SCOPE-02)。

### 5.7 ADR §7 #5 の記述が実装に追い越されている — **CONCERN (文書)**

ADR §7 #5 は「通常 session の `GET /catalog` ハードナビゲーションは**到達不能**」「クエリあり/なし双方が
`403 missing_tenant_scope`」「`/catalog` への通常 nav link は依然として無く、一般利用者向けの公開経路は
現状未提供」と述べる。**現在の実装はいずれとも一致しない。**

- `apps/hub/src/components/primary-nav.tsx:33` に「業務ツール」として `/catalog` への nav link が実在する。
- ADR が根拠として挙げる回帰テスト自体が到達可能を固定している:
  `catalog-hard-navigation-scope.test.ts:78-92` は単一 workspace 所属の通常 session が
  クエリなし GET でも `200` を返すことを assert する。403 が残るのは
  「複数 workspace 所属で active workspace 未選択」の場合だけ (`:94-101`)。
- 認可入力に query を使わない原則は維持されている (`:85-92`)。§1.1 の「表示用スコープであって認可判定ではない」
  という整理は依然として正しい。

→ **follow-up**: ADR §7 #5 を現状 (単一認可層内で session から active scope を解決する形で到達可能になった)
に改訂する。設計原則の変更ではなく記述の陳腐化であり、P02 への差し戻しは要さない。

### 5.8 再検証の follow-up 一覧

| # | 内容 | 引き継ぎ先 | 種別 |
|---|---|---|---|
| F1 | ポーリングが 401/403/契約不正でも 5 回リトライする。失敗種別を `shouldContinuePolling` へ渡し即時停止させる (§5.3 C1) | `HarnessHub-h2pe` | 実装 |
| F2 | 不可視タブ復帰でポーリングが再開しない。現行 ADR は明示 Retry として同期し、自動再開実装は `HarnessHub-h2pe` で追跡 (§5.3 C2) | `HarnessHub-h2pe` | 実装/文書 |
| F3 | **本変更で解消**: ADR §2.2 の終端 status 定義を実装 (`POLLABLE_PUBLISH_STATES`) に合わせて改訂 (§5.3 C3) | ADR | 文書 |
| F4 | `marketplace.json` の未認証消費者経路を H7 確定と同時に決める (§5.4) | `HarnessHub-dctf` | 設計 |
| F5 | **文書訂正は本変更で解消、実測は継続**: `__cwv_probe` を現行経路として 3 文書へ反映。`hub-cwv` の fresh 実測は `HarnessHub-aqi` で継続 (§5.5) | 運用 + 各文書 | 文書/運用 |
| F6 | **本変更で解消**: ADR §7 #5 を primary navigation・active scope 再検証・複数 workspace の 403 へ改訂 (§5.7) | ADR | 文書 |
