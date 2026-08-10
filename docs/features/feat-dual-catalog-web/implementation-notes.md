---
status: confirmed
layer: feature-implementation
---

# feat-dual-catalog-web 実装ノート (P05)

- graph node: `SYS-DUAL-CATALOG-WEB-P05` / beads: `HarnessHub-dhy.5`
- 前提: P04 `docs/features/feat-dual-catalog-web/test-design.md`
- 正本: `.dev-graph/plans/.../task-specs/phase-05-implementation.md` (package digest `sha256:7069e348...`)

本書は「何を実装したか」ではなく、**P04 の全テストケースに実装対象が対応しており未割当が 0 件であること**、および
**設計 (P02 ADR / P03 指摘) のどの決定がコードのどこに落ちているか** を追跡可能にするために置く。

---

## 1. 実装ファイルと責務

### 1.1 契約 (`packages/schemas/dual-catalog-web/`)

| ファイル | 責務 |
|---|---|
| `primitives.ts` | `catalogTargetSchema` (skill/webapp)・`catalogVisibilitySchema`・`catalogSourceStatusSchema` (`ready` / `pending-h7`) |
| `catalog.ts` | `catalogEntrySchema` (一覧行)・`catalogDetailSchema` (詳細)・`catalogListResponseSchema` (cursor 付き) |
| `marketplace.ts` | `marketplaceDocumentSchema` / `marketplacePluginSchema` |
| `index.ts` | 上記の再輸出 |

契約を `packages/schemas` に置く理由は、同じ形を UI・Route Handler・テストが別々に書くと**片方だけ古くなる**ため。
zod の単一定義から `z.output<>` で型を導出し、TypeScript の型と実行時検証の出所を 1 つにしている。

`marketplace.ts` は `.claude-plugin/marketplace.json` と**同一キー**を使う。新形式を発明すると既存の
`scripts/build-plugins-from-harness.py --check-only` による検証資産がそのまま使えず、消費側 (installer) も二重実装になる。
`source_status` だけが Hub 固有の追加項目で、既存キーを一切変えないため既存 consumer の解釈を壊さない。

### 1.2 純粋ロジック (`apps/hub/src/lib/catalog/`)

React 非依存の純関数に閉じている (P04 引き継ぎ 2)。DOM なしで全分岐をテストできることが前提。

| ファイル | 公開 API | 決定の出所 |
|---|---|---|
| `polling.ts` | `INITIAL_POLL_INTERVAL_MS=2000` / `MAX_POLL_INTERVAL_MS=30000` / `MAX_CONSECUTIVE_FAILURES=5` / `MAX_POLL_DURATION_MS=15分`、`nextPollIntervalMs` / `shouldContinuePolling` / `parseRetryAfterSeconds` / `resolveRetryDelayMs` / `isPollablePublishState` | ADR §2.4 (qa-009 / qa-062) |
| `degradation.ts` | `classifyCatalogFailure` (4 値へ全射)・`catalogCapabilities`・`isDegraded` | ADR §6.1 (qa-011) |
| `marketplace.ts` | `buildMarketplaceDocument` (純関数)・`resolveAdoptedSourceResolver` | ADR §3.1 (qa-003) |
| `ports.ts` | `CatalogPort` / `CatalogScope` / `CatalogResult<T>` (例外ではなく result 型) | ADR §2.1 |
| `http-adapter.ts` | `httpCatalogPort` (唯一の fetch 実装) | ADR §5 境界 3 |
| `publish-status.ts` | `publishStatusChipValue` (状態 → 表示語彙の写像) | qa-019 文言規約 |
| `index.ts` | 上記の再輸出 (`components/` からは常にここ経由) | — |

**ポーリングの数値をコンポーネントに書かない**ことが要点。書くと停止条件が 2 か所に散り、片方だけ直した退行が起きる。
`CatalogPublishStatus.tsx` は間隔も停止判定も `lib/catalog` の関数へ委譲し、自前の閾値を一切持たない。

### 1.3 画面 (`apps/hub/src/app/(workspace)/catalog/`, `apps/hub/src/components/catalog/`)

| 画面 | ルート | コンポーネント |
|---|---|---|
| S01 業務ツール一覧 | `/catalog` | `CatalogList.tsx` |
| S02 詳細・導入 | `/catalog/[projectId]` | `CatalogDetail.tsx` + `CatalogInstallPanel.tsx` |
| S03 公開状態・修正内容 | S02 内の「公開状態」タブ | `CatalogPublishStatus.tsx` (`next/dynamic`) |
| S04 Release 履歴 (読取) | `/catalog/releases` | `CatalogReleaseHistory.tsx` (`next/dynamic`) |

- Page (RSC) は scope 解決と初期取得だけを行い、対話が要る部分のみ `'use client'` に落とす。
- **code splitting の境界はタブ**に置いた (ADR §4.2)。初期表示に必要なのは「概要」だけで、ポーリングを持つ
  公開状態タブや履歴タブの JS を初回バンドルに含めると、閲覧しかしない利用者にまで転送量と実行時間を負担させる (G13)。
- `loading:` に文言を置き、読み込み中も高さが確保されるようにして CLS を抑えている。

### 1.4 配布出口 (`apps/hub/src/app/marketplace.json/route.ts`)

読み取り専用の Route Handler。`withAuthz({ action: 'harnesses.read' })` で既存認可ミドルウェアを**消費するだけ**。
`Cache-Control: private, max-age=60, stale-while-revalidate=300` と scope/session の `Vary` を付ける。
同一 session/scope の private cache は Hub 停止時にも直近 document を返せる一方、認証済み応答を shared cache へ置かず、
別 tenant/workspace への再配信を防ぐ (qa-117 / DC-MKT-07)。

最終レビューで、401/403/契約不正後も取得済み行を残し得る実装を検出した。一覧・詳細・Release 履歴は
非閲覧 failure で stale を描画せず、cache key を tenant/workspace/project に束縛した。同一 scope の 503 だけは
§6.1 の縮退として直近の認可済み表示を維持する。`CatalogList` は入力値と適用 query も分け、submit 1 回につき
request 1 回へ修正した。回帰は `authorization-cache-boundary.test.tsx` の DC-TEN-06..10 / DC-LIST-01 が固定する。

### 1.5 CI ゲート (`.github/workflows/hub-web-quality-gate.yml`)

`pull_request` で発火し、catalog 契約テスト → `pnpm -r build` → `check:client-bundle` を実行する。
`continue-on-error` も `|| true` も置かない (落ちたら赤になって初めて「リリース条件」になる)。
既存 `ci.yml` の G9 (axe) / G13 (client JS 予算) は**再実装せず**、G13 は同一 script (`check:client-bundle`) を呼ぶ。

---

## 2. 設計決定の反映点 (P02 ADR / P03 指摘)

| 決定 | 反映先 | 理由 |
|---|---|---|
| §0 A2: `/api/v1/harnesses*` 未実装は `fatal` にしない | `degradation.ts` の 404 → `degraded` | API 未実装期でも画面が「壊れた」ではなく「今は一覧が出せない」を表示できる |
| §2.1: descriptor を UI で合成しない | `CatalogInstallPanel.tsx` は返却値をそのまま表示 | R2 key や URL の組み立て規則が UI に漏れると、サーバ側の変更で静かに壊れる |
| §2.4: ポーリング 2s → ×2 → 30s 上限 | `polling.ts` の純関数 | 表示層から数値を排除し、契約テストで固定 |
| §3.1: H7 未成立なら fail-closed | `resolveAdoptedSourceResolver()` が `null` → `plugins: []` + `source_status: 'pending-h7'` | 未確定のまま推測 source を焼き込むと、gate 未成立で配布が始まる |
| §4.2: viewport 出し分けは CSS のみ | `components/catalog/*.tsx` に `matchMedia` / `innerWidth` を持たない | JS 分岐を入れると SSR と client で DOM が食い違い、レイアウトが跳ねる |
| §5 境界 3: 認可判定を複製しない | `lib/catalog/` に role 判定を持たない | 規則が変わったとき片方だけ古くなる |
| §6.1: 取得済みデータを消さない | `CatalogDetail` は失敗時も `detail` を保持し bar だけ出す | 一時障害で画面が空になると「消えた」と誤解される |
| P03 R5: 0 件と未確定を同じ緑にしない | body `source_status` + header `x-catalog-source-status` の二重表明 | body を読まない中継 (CDN・監視) からも観測できる |
| P03 R8: 検査は「存在」ではなく「リリース条件」であること | `ci-gate-presence.test.ts` が workflow の失敗伝播まで assert | 書いてあるだけの検査は条件にならない |

---

## 3. P04 テストケース ↔ 実装対象 の対応 (未割当 0 件)

| ケース ID | 実装対象 | 状態 |
|---|---|---|
| DC-POLL-01..14 | `lib/catalog/polling.ts` | 14 件 pass |
| DC-POLL-LC-01..06 + 03B | `CatalogPublishStatus.tsx`, `PublishWizard.tsx` | 9 件 pass |
| DC-DEG-01..08 | `lib/catalog/degradation.ts` | 8 件 pass |
| DC-MKT-01..09 | `lib/catalog/marketplace.ts`, `packages/schemas/dual-catalog-web/marketplace.ts`, `app/marketplace.json/route.ts` | 11 件 pass (ケース分割込み) |
| DC-TEN-01..04 | `lib/catalog/http-adapter.ts`, `lib/catalog/marketplace.ts` | 4 件 pass |
| DC-SCOPE-01..04 | `components/catalog/`, `lib/catalog/ports.ts` | 5 件 pass (ケース分割込み) |
| DC-A11Y-01..07 / DC-RESP-01 | `app/(workspace)/catalog/**`, `components/catalog/**` | 10 件 pass (ケース分割込み) |
| DC-CI-01..05 | `.github/workflows/hub-web-quality-gate.yml` | 5 件 pass |
| DC-CWV-01 | `.github/workflows/cwv.yml` (既存) | **未実測** — 公開 URL 確定 (P13) 待ち。P07 で「未計測を good と見なさない」扱い |

実装対象が無いケース: **0 件**。DC-CWV-01 のみ実装ではなく実測待ちで、P07 の判定へ持ち越す。

---

## 4. 命名の差異 (P08 へ引き継ぐ)

test-design DC-MKT-04/05 は `sourceStatus` と書いているが、実装は **`source_status`** (snake_case) を採用した。
理由は `.claude-plugin/marketplace.json` および `packages/schemas` 既存契約が snake_case で統一されており、
この 1 項目だけ camelCase にすると消費側が両方を扱う羽目になるため。**契約側を正とし、test-design の表記を追補する**。

---

## 5. Write scope からの逸脱 (2 件)

P05 の Write scope 外を触った箇所。隠さず記録し、P08 refactoring-migration-note へ引き継ぐ。

| ファイル | 変更 | 必要だった理由 | 影響 |
|---|---|---|---|
| `apps/hub/vitest.config.ts` | `include` に `src/__tests__/**` を追加 | 既存設定が `tests/**` のみを見ており、新規テストが**1 件も実行されない**まま緑になる | 実行対象の追加のみ。既存テストの対象・環境は不変 |
| `packages/schemas/src/index.ts` | `dual-catalog-web` を再輸出 | 契約を `@harness-hub/schemas` から解決させるため。相対パス直参照にすると package 境界が崩れる | 追加輸出のみ。既存輸出の削除・改名なし |

いずれも「追加のみ・既存挙動を変えない」変更に限定した。

また `apps/hub/.claude/handoff/20260801T170843.md` が PreCompact フックにより自動生成されている (エージェント基盤の副産物、
本 feature の成果物ではない)。コミット対象に含めるかは運用判断。

---

## 6. 既知の制約 (後続フェーズへ)

1. **`/api/v1/harnesses*` が未実装** (owner: feat-publish-pipeline)。現時点で画面を実行すると §6.1 の縮退表示になる。
   これは設計どおりの挙動であり、API 実装後に自動的に通常表示へ移行する。
2. **H7 (採用配布経路) 未成立**のため `/marketplace.json` は常に `plugins: []` + `pending-h7`。
   確定時は `resolveAdoptedSourceResolver()` に resolver を与えるだけで配信が始まる (fail-closed からの復帰点は 1 か所)。
3. **Playwright 未導入**のため J1/J2 の実ブラウザ検証は未実施。中核 (axe・ポーリング・DOM 同一性) は
   Vitest + jsdom で代替済み。残余リスク (実 CSS 適用・フォーカス順序) は P12 の follow-up として記録する。
4. **CWV 実測は P13 デプロイ後**。`vars.HUB_PUBLIC_URL` 設定が前提。

---

## 7. 検証結果 (P05 時点)

| コマンド | 結果 |
|---|---|
| `pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web` | 8 files / **63 tests passed** |
| `pnpm --filter @harness-hub/hub run typecheck` | pass |
| `pnpm --filter @harness-hub/schemas run typecheck` | pass |
| `pnpm exec biome check` (catalog scope 30 files) | pass (No fixes applied) |
| `node scripts/ci/check-shared-layer-duplicates.mjs` | 違反 0 件 (走査 447 ファイル) |
| `pnpm --filter @harness-hub/hub run check:client-bundle` | pass (§8 の是正後) |

## 8. G13 予算超過の是正 (P06 実測を受けた実装変更)

P06 の実測で client JS 予算 (120.0 KiB/route) を 3 ルートすべてが超過した。P05 Write scope 内で 2 点是正した。

1. `lib/catalog/http-adapter.ts`: 応答検証スキーマを **`import('@harness-hub/schemas')` の動的読込**へ変更 (−18.3 KiB)。
   import は fetch の前に開始して並走させるため往復は増えない。検証そのものは残す。
2. `components/catalog/CatalogList.tsx`: `next/link` を撤去し `<a href>` へ (−3.3 KiB)。
   apps/hub で `next/link` を使っていたのはここだけで、既存画面は素の `<a>` で遷移していた。
   併せて **href が `tenant`/`workspace` を落としていた欠陥**を修正 (詳細画面は scope を URL から読むため、
   落とすと一覧からの導線が全滅する)。回帰テスト `DC-NAV-01` を追加。

結果: `/catalog` 112.9 KiB / `/catalog/[projectId]` 119.0 KiB / `/catalog/releases` 116.9 KiB — 全 route pass。
詳細は `test-run-results.md` §4。
