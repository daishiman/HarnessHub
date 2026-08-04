---
status: confirmed
layer: feature-design
task: SYS-DUAL-CATALOG-WEB-P02
parent_feature: feat-dual-catalog-web
feature_package_id: feature-package/feat-dual-catalog-web
feature_context_digest: sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend]
consumes: [requirements-baseline.md, docs/frontend-spec.md, docs/screen-inventory.md, architecture/harness-hub-frontend.md]
---

# feat-dual-catalog-web アーキテクチャ決定記録 (P02)

> **位置づけ**: P02 の成果物。[requirements-baseline.md](./requirements-baseline.md) が確定した要件に対し、**4 系統** (D1 画面構成 / D2 install descriptor 取得・ポーリング契約 / D3 marketplace.json 生成方式 / D4 CWV バンドル予算) の architecture decision を確定する。P05 実装はこの決定に従い、逸脱する場合は本文書を先に改訂する。

## 0. 決定の前提となる実測状態 (2026-08-01 確認)

P02 spec が想定した前提と現行リポジトリ実測との差分。**D1-D4 はこの実測状態を織り込んで決定している。**

| # | 前提 | 実測 | 決定への影響 |
|---|---|---|---|
| A1 | 採用配布経路が feat-stage0-distribution-gate で確定済み | **H7 は `NOT_ESTABLISHED`** ([stage0-gate-conclusion.md](../feat-stage0-distribution-gate/stage0-gate-conclusion.md))。`decisions[]` に D7 は不在。2026-07-30 追記で「再検証 (`HarnessHub-n2c0`) の結果が揃うまで Stage 1 を開始しない」 | **D3**: marketplace.json 生成を「経路非依存のカタログ生成」と「経路固有の出力 adapter」に分離し、adapter は採用経路確定まで**未確定として明示的に空**とする (推測で経路を確定させない) |
| A2 | `GET/POST /api/v1/harnesses*` が実装済み | `apps/hub/src/app/api/v1/` に `harnesses/` が**存在しない**。実装済みは publish / channels / releases / projects / sheets / device / tokens / ai-jobs | **D2**: catalog のデータ取得を port 境界 (`lib/catalog/ports.ts`) に閉じ、endpoint 未実装時は §6.1 縮退表示へ倒す。UI 側は API の有無に依存しない |
| A3 | サーバ状態管理に TanStack Query v5 を使う (frontend-spec §1) | `@tanstack/react-query` は **未導入**。既存 (hearing-intake) は `window.setInterval` の 30s 固定 | **D2**: backoff 計算を**純関数**に切り出し、hook は最小の `setTimeout` 駆動とする。将来 TanStack Query 導入時は同純関数を `refetchInterval` に渡すだけで移行できる |
| A4 | route は `/harnesses` (frontend-spec §1 route 表) | P05 published task spec の Write scope は `apps/hub/src/app/(workspace)/catalog/` | **D1**: 実装正本である published task spec に従い URL は `/catalog` とする。frontend-spec §1 の `/harnesses` 表記との差分は §7 に spec drift として記録し P12 で追補する |

**A1 に対する本 feature の姿勢**: Stage 0 gate の fail-closed 契約は「配布経路が未確定のまま**配布経路に依存する決定を確定させること**」を禁じる。本 ADR は D3 の経路固有部分を確定させず未確定のまま残すことでこの契約を守り、D1/D2/D4 (配布経路に非依存な閲覧 UI・ポーリング・品質ゲート) のみを確定する。

## 1. D1 — S01/S02/S03/S04 の画面構成と状態管理境界

### 1.1 決定

| 画面 | route (実装) | 構成 | 状態の所在 |
|---|---|---|---|
| S01 一覧 | `/catalog` | RSC (`page.tsx`) が `searchParams` から tenant/workspace の **UI 表示用スコープ**を読む → client 部品 `CatalogList` が一覧取得・絞込・ページ送り (`HarnessHub-6o0r` 追補: この読み取りは**認可判定ではない**。§7 #5 参照) | サーバ状態=`CatalogList` の `useState`、URL 状態=`searchParams` (tenant/workspace) |
| S02 詳細 | `/catalog/[projectId]` | RSC (`page.tsx`) → client 部品 `CatalogDetail` が詳細 + release 一覧 + install descriptor を取得 | 同上。install descriptor は `CatalogInstallPanel` のローカル状態 |
| S03 公開状態 | `/catalog/[projectId]` 内タブ | `CatalogPublishStatus` を S02 のタブとして統合 (frontend-spec §3.1「S03 は S02 の公開タブに統合」に準拠。独立 route を作らない) | 非終端の PublishRequest のみポーリング (D2) |
| S04 Workspace 設定・Release 履歴 | `/catalog/releases` | **読取専用の Release 履歴のみ**を本 feature が持つ。IdP 接続・role 管理・token 失効は feat-auth-tenancy、rollback 実行は feat-publish-pipeline の所有 | `CatalogReleaseHistory` のローカル状態 |

### 1.2 コンポーネント境界

- `apps/hub/src/app/(workspace)/catalog/` = **route 層のみ** (RSC。`searchParams` 解決と見出し・ランドマークの定義)。データ取得ロジックを置かない。
- `apps/hub/src/components/catalog/` = **本 feature 固有の client 部品** (`CatalogList` / `CatalogDetail` / `CatalogInstallPanel` / `CatalogPublishStatus` / `CatalogReleaseHistory`)。
- `apps/hub/src/lib/catalog/` = **純粋ロジック** (port 定義・fetch adapter・backoff 計算・marketplace 生成・縮退判定)。React に依存しない = Vitest で DOM なしに検証できる。
- 共通部品 (`DataTable` / `StatusChip` / `Alert` / `DegradedBanner` / `Button`) は `@harness-hub/ui` の**単一入口から**消費する。deep import しない (ADR R-15)。a11y の一括担保は部品側の責務 (qa-018)。

**根拠**: この 3 層分離により、a11y (部品側) / 表示 (components) / 契約 (lib) の検証を独立に行える。P04 のテスト設計は lib 層を純関数テスト、components 層を axe 込みの DOM テストに割り当てる。

### 1.3 状態管理ライブラリを導入しない決定

グローバル状態ライブラリ (Redux/Zustand) は導入しない (frontend-spec §1 C1 制約)。TanStack Query も本 task では導入しない (§0 A3)。**理由**: 本 feature の状態は画面ローカルに閉じており、導入は CWV 予算 (D4) に対する純増でしかない。

## 2. D2 — install descriptor 取得契約とポーリング契約

### 2.1 消費する API 契約 (本 feature は実装せず消費する)

| endpoint | 用途 | owner |
|---|---|---|
| `GET /api/v1/harnesses` (filter: target/status/q, cursor) | S01 一覧 | feat-publish-pipeline |
| `GET /api/v1/harnesses/:projectId` | S02 詳細 (channels + stable release + 利用統計) | feat-publish-pipeline |
| `POST /api/v1/harnesses/:projectId/install` (`Idempotency-Key` 必須) | install descriptor 取得。target 別 descriptor を返す | feat-publish-pipeline |
| `GET /api/v1/publish/:id` | S03 公開状態 | feat-publish-pipeline |
| `GET /api/v1/projects/:id/releases` | S02/S04 release 履歴 | feat-publish-pipeline |

- **決定**: これらは `lib/catalog/ports.ts` の `CatalogPort` interface として型で固定し、実 fetch は `lib/catalog/http-adapter.ts` に閉じる。UI 部品は port だけを見る。
- **決定**: install descriptor の**内容を UI 側で組み立てない**。R2 object key や生 URL をクライアントで合成することを禁じる (frontend-spec §3.2 S02)。descriptor が返した値だけを表示・コピーする。
- **決定**: `POST /install` は `Idempotency-Key` を client 生成の UUID で必ず送る (download count の重複加算防止)。

### 2.2 ポーリング契約 (qa-062 / qa-031 の実装方式)

| 対象 | 初回間隔 | backoff | 上限 | 停止条件 |
|---|---|---|---|---|
| PublishRequest (非終端) | **2s** | ×2 | **30s** | 終端 status (`Published` / `Failed` / `Draft`) |
| catalog 一覧 | ポーリングなし | — | — | staleTime 相当 60s (手動再取得のみ) |

- **決定**: 間隔計算は `lib/catalog/polling.ts` の**純関数** `nextPollIntervalMs(attempt)` に切り出す。hook (`useCatalogPolling`) は純関数の返り値で `setTimeout` を張り直すだけにする。
- **決定**: `document.visibilityState !== 'visible'` の間はポーリングを停止する (frontend-spec §4 `refetchIntervalInBackground: false` と同義。Workers 無料枠と端末電池の温存)。
- **決定**: 状態更新の読み上げは `aria-live="polite"` (qa-018)。更新のたびに focus を奪わない。

### 2.3 縮退 (§6.1) の実装方式 — acceptance 3 の直接根拠

- **決定**: port が `5xx` / ネットワーク失敗 / 未実装 (`404`) を返した場合、UI は**エラーで画面全体を潰さず** `DegradedBanner` を出し「導入済みのツールはそのまま使えます」を明示する (qa-019 の文言規約)。
- **決定**: 縮退時に**新規公開・追加・更新の操作導線のみ**を無効化し、閲覧済みデータの表示と install descriptor のコピー導線は残す。これが「Hub 停止中も導入済み Skill が動作継続する」の UI 面での担保になる。
- **決定**: 判定は `lib/catalog/degradation.ts` の純関数 `classifyCatalogFailure(status)` に閉じ、`degraded` / `unauthorized` / `forbidden` / `fatal` の 4 分類を返す。401 は `/signin`、403 は権限トースト (frontend-spec §3.1)。
- **最終レビュー追補 (qa-120 / qa-118、cache 原契約 qa-117)**: stale 表示を許すのは、同じ tenant/workspace/project で直前に認可済みだったデータがあり、最新失敗が `degraded` の場合だけとする。401/403/契約不正では以前の一覧・詳細・install descriptor・Release 履歴を描画せず、scope が変わった場合は新 scope の取得前から旧 scope の内容を表示対象外にする。

### 2.4 エラー時のリトライ上限とレート制御 (P03 指摘 R2 による追補)

§2.2 は正常系の間隔だけを決めており、**失敗が続いた場合の停止条件**が欠けていた。以下を追加で確定する。

| 項目 | 決定 | 理由 |
|---|---|---|
| 連続失敗の上限 | **5 回** で自動ポーリングを停止し、明示的な「再試行」導線へ倒す | 無限リトライは Workers 無料枠と端末電池を食い潰す。停止は利用者に見える形で行う |
| 総試行時間の上限 | **15 分**。非終端のまま経過したら停止し §6.1 縮退表示へ | 検査が滞留した PublishRequest を UI が永久に叩き続けない |
| 失敗時の間隔 | 成功時と**同一の数列** (2s→×2→30s) を共有する | 失敗専用の別数列を持つと停止条件が二重管理になる |
| 同時実行 | 同一 `projectId` の in-flight は常に **1 本**。前回未完了なら次を張らない。unmount 時は `AbortController` で中断 | 遅延応答の重複適用と、タブ復帰時のバースト送信を防ぐ |
| `429` 応答 | `Retry-After` ヘッダがあればその値を優先し、無ければ backoff 数列に従う | サーバ側のレート制御を client の数列が上書きしない |

- **決定**: 停止判定は `lib/catalog/polling.ts` の純関数 `shouldContinuePolling(state)` に閉じる (`nextPollIntervalMs` と同じ層。React 非依存で検証可能)。

## 3. D3 — marketplace.json 生成パイプライン方式

### 3.1 決定 (2 層分離)

```
CatalogEntry[] --(純関数: buildMarketplaceDocument)--> marketplace document
                                                              |
                                          (経路固有 adapter: 採用経路確定後に実装)
                                                              v
                                              URL 型 marketplace / Bootstrap Installer
```

- **決定 (確定)**: 生成部 `lib/catalog/marketplace.ts` の `buildMarketplaceDocument(entries)` は**純関数**とし、`.claude-plugin/marketplace.json` と同一スキーマ (`name` / `description` / `version` / `owner` / `plugins[]`) を出力する。既存 `scripts/build-plugins-from-harness.py --check-only` (marketplace-integrity CI) が検証している形式を正本とし、新形式を発明しない。
- **決定 (確定)**: 配信は `apps/hub/src/app/marketplace.json/route.ts` の Route Handler による**動的生成**とする。静的ファイルを R2 へ事前生成する方式は採らない — Catalog pointer の atomic 更新 (feat-publish-pipeline 所有) と生成物の同期点が二重になり、pointer 切替と配信内容の不整合窓が生まれるため。
- **決定 (2026-08-01 改訂)**: 認証済み tenant/workspace ごとに内容が変わるため、`Cache-Control: private, max-age=60, stale-while-revalidate=300` と `Vary: Cookie, x-harness-tenant-id, x-harness-workspace-id` を付す。private cache による同一 session/scope の停止時継続性は維持し、CDN 等の shared cache が別 tenant へ応答を再配信する経路は閉じる (qa-117)。
- **未確定 (fail-closed)**: `plugins[].source` に入れる**経路固有の値** (`github` / `git-subdir` / `npm` のいずれか) は、feat-stage0-distribution-gate の採用経路 decision (D7) が `decisions[]` へ登録されるまで確定しない。実装では `resolvePluginSource()` を**未採用時に例外ではなく空 `plugins: []` + `x-catalog-source-status: pending-h7` ヘッダ**を返す形にし、「経路未確定」を配信面で観測可能にする。

**根拠**: H7 の再検証 (`HarnessHub-n2c0`) 結果次第で source 型が変わる。ここで推測値を焼き込むと、gate の結論が出た時に配信済み marketplace.json が誤った source を指し続ける。空配信 + 明示ヘッダなら、経路確定時に adapter を 1 箇所差し替えるだけで済む。

## 4. D4 — CWV バンドル予算と dynamic import 分割方針

### 4.1 予算

| 軸 | 値 | 計測 |
|---|---|---|
| First Load JS | **≤ 120 KiB / route** (運用値。上限 250KB の内側) | 既存 G13 `apps/hub/scripts/check-client-bundle.mjs` |
| Worker bundle | ≤ 3 MiB | 既存 `check-bundle.mjs` |
| LCP / INP / CLS | ≤ 2.5s / ≤ 200ms / ≤ 0.1 | `.github/workflows/cwv.yml` |

### 4.2 分割方針

- **決定**: S01 一覧 (`/catalog`) の初期チャンクには **`DataTable` / `StatusChip` / `Alert` / `Button` のみ**を載せる。install パネル・公開状態タブ・release 履歴は `next/dynamic` の client-side dynamic import とし、ユーザー操作 (タブ選択・ボタン押下) を境界に読み込む。
- **決定**: `@harness-hub/ui` を barrel 経由で import しつつ、`next.config.ts` の `experimental.optimizePackageImports` に登録済みであることを前提とする (HarnessHub-aqi の TBT 926ms 実害の対策)。**新規に共通層 package を作らない** — 作れば同リストへの追加が必要になり、忘れると同じ退行を再発させるため。
- **決定**: Markdown 描画を catalog 画面に持ち込まない。ツール説明は plain text として扱う。react-markdown 一式 (146.4 KB) を初期チャンクへ引き込まないための明示的制約。
- **決定**: 一覧のカード/テーブル切替は CSS のみで行い、モバイル用の別コンポーネントを JS で出し分けない (CLS 抑制と JS 量の両立)。

## 5. cross-feature 境界の確定 (P01 §6 の解消)

| P01 §6 | 決定 |
|---|---|
| 1. publish pipeline 消費境界 | 本 feature は §2.1 の 5 endpoint を**読み取り専用で消費**する。状態機械・検査・pointer 更新・promote/rollback の**実行**は一切実装しない。S02 に promote/rollback ボタンを置かない (owner 操作は feat-publish-pipeline の画面責務)。**解消** |
| 2. 配布経路判定の消費境界 | 採用経路の参照点は `system-spec/spec-state.json` の `decisions[]` (D7) と定める。本 feature はこれを読むだけで判定しない。未登録時は §3.1 の pending-h7 応答。**解消 (未登録状態の扱いを含めて確定)** |
| 3. 単一認可ミドルウェア消費境界 | `lib/authz/` の `withAuthz` を marketplace.json route に適用し、catalog 画面のデータ取得は既存 API 側の deny-by-default に従う。認可判定を `lib/catalog/` に書かない。**解消** |
| 4. 共通部品 owner 境界 | `@harness-hub/ui` を単一入口から消費。本 feature 固有部品のみ `components/catalog/`。`packages/ui` に手を入れない (P05 Write scope 外)。**解消** |

## 6. P05 実装対象マップ (Write scope との対応)

| Write scope | 実装物 |
|---|---|
| `apps/hub/src/app/(workspace)/catalog/` | `page.tsx` (S01) / `[projectId]/page.tsx` (S02+S03) / `releases/page.tsx` (S04) |
| `apps/hub/src/components/catalog/` | `CatalogList` / `CatalogDetail` / `CatalogInstallPanel` / `CatalogPublishStatus` / `CatalogReleaseHistory` |
| `apps/hub/src/lib/catalog/` | `ports.ts` / `http-adapter.ts` / `polling.ts` / `degradation.ts` / `marketplace.ts` / `index.ts` |
| `apps/hub/src/app/marketplace.json/route.ts` | marketplace document の動的配信 |
| `packages/schemas/dual-catalog-web/` | catalog 一覧/詳細/install descriptor/marketplace の zod (単一ソース。手書き型定義禁止) |
| `.github/workflows/hub-web-quality-gate.yml` | axe 検査 + client bundle 予算の CI ゲート (acceptance 1 の「CI に存在する」の実体) |
| `docs/features/feat-dual-catalog-web/implementation-notes.md` | 実装記録 |

## 7. 未解決事項と rollback

| # | 事項 | 扱い |
|---|---|---|
| 1 | **H7 採用経路 (D7) 未登録** | §3.1 の pending-h7 で fail-closed。`HarnessHub-n2c0` の結論後に `resolvePluginSource()` を実装し P02 を additive 改訂する |
| 2 | `GET/POST /api/v1/harnesses*` 未実装 | port 境界 + 縮退で吸収 (§0 A2 / §2.3)。実装到着時は `http-adapter.ts` のみ差し替え |
| 3 | route path の spec drift (`/harnesses` vs `/catalog`) | 実装は `/catalog`。frontend-spec §1 route 表への追補を P12 で行う |
| 4 | TanStack Query 未導入 | `polling.ts` の純関数分離により移行コストを局所化 (§0 A3) |
| 5 | **通常 session の `GET /catalog` ハードナビゲーションは到達不能** (`HarnessHub-6o0r`) | §1.1 の「RSC が tenant/workspace を解決する」は `page.tsx` が `searchParams` を読んで `CatalogList` へ渡す**表示用スコープの受け渡し**を指すのみで、**認可判定ではない**。認可判定 (`src/middleware.ts` → `authorize()`) は単一認可層 (§5 境界 3) に閉じており、`resolveRequestedScope()` は URL パス (`/t/{tenantId}/w/{workspaceId}/...`) と `x-harness-tenant-id`/`x-harness-workspace-id` ヘッダのみを読む。実際の middleware を通す回帰テストで、ログイン済み通常 session のクエリあり/なし双方が `403 missing_tenant_scope` になることを確定した。**ただし CWV 計測専用の `__cwv_probe` は例外**である。これは署名・origin・固定 scope・5 分 TTL を検証後に cookie へ移す、GET/HEAD の catalog read に限った閉域 credential であり、通常利用者の navigation や query scope の許可ではない（`apps/hub/tests/security/middleware-entry.test.ts`、`system-spec/auth.md` qa-133）。`/catalog` への通常 nav link は依然として無く、一般利用者向けの公開経路は現状未提供とする。query 対応や redirect 補完を採る場合は、単一認可層のコア変更として system-spec reopen・ADR 改訂・spec-reflection-receipt を伴う正式 governance を別途行う。 |

**rollback trigger**: feat-publish-pipeline の API 契約 (§2.1) または採用配布経路 (§3.1) が本 ADR の前提と異なることが判明した場合、当該決定を re-open し P02 を再実行する。再実行までは影響を受ける P03 以降の項目の着手を保留する。

## 8. 追記 (2026-08-04): `HarnessHub-dhy.2` 完了確認

`HarnessHub-dhy.2` (アーキテクチャ設計 — S01/S02/S03/S04 画面構成・install descriptor
取得・ポーリング契約・marketplace.json 生成方式・CWV バンドル予算の決定) が求める決定は
本 ADR の D1 (§1)・D2 (§2)・D3 (§3)・D4 (§4) として既に確定済みであり、本タスク固有の
未決定事項は残っていない。新規の設計決定は不要と判断し、本節をその確認記録として残す。

未完了のまま残る P13 (リリース/デプロイ) は、CWV 本番実測・U5 実測・draft PR merge・
default-branch reconciliation という**運用上の実施**であり、本 ADR (P02 設計) の対象外
である。
