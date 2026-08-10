---
status: confirmed
layer: feature-test-design
task: SYS-DUAL-CATALOG-WEB-P04
parent_feature: feat-dual-catalog-web
feature_package_id: feature-package/feat-dual-catalog-web
feature_context_digest: sha256:a0c5f78ef31fc345184884f4f48f60b0c9b2e5beaae7d9a83c0f789d13a6e9d3
consumes: [design-review-notes.md, architecture-decision-record.md, requirements-baseline.md, docs/frontend-spec.md]
test_root: apps/hub/src/__tests__/dual-catalog-web/
---

# feat-dual-catalog-web テスト設計 (P04)

> **位置づけ**: P04 の成果物。goal-spec の **acceptance 3 件** と **quality_constraints 7 件** の全件に、実行可能なテストケースまたは実測手段を割り当てる。未割当 0 件であることを §4 の対応表で示す。

## 0. 実行基盤の実測前提

| 項目 | 実測 | 本設計での扱い |
|---|---|---|
| テストランナー | Vitest (`apps/hub/vitest.config.ts`)。既定 `node` 環境、ファイル先頭の docblock で `jsdom` に切替 | 踏襲する |
| テスト収集経路 | `include` は元々 `tests/**` のみ → **`src/__tests__/**` を追加済み** (P03 指摘 R6 / 引き継ぎ H1) | この結線がなければ本設計の全テストが実行 0 件になる |
| axe | `axe-core` 導入済み。既存 `apps/hub/tests/a11y/hub-screens.spec.ts` が `renderToStaticMarkup` → jsdom 載せ替え → `axe.run(document)` の形 | **同一の形を踏襲**する (新方式を発明しない) |
| Playwright | `apps/hub` に**未導入** (`playwright.config` なし。依存も無い) | J1/J2 ジャーニーは §3 に**設計として記載**し、実行可能な代替を Vitest + jsdom で用意する (§3.2) |
| Lighthouse CWV | `.github/workflows/cwv.yml` (週次 cron)。`vars.HUB_PUBLIC_URL` 未設定なら fail-closed | 自動テスト不可。**P13 デプロイ後の実測**に割り当てる (P03 指摘 R7) |
| カバレッジ閾値 | lines/functions/branches/statements 各 80% | `src/lib/catalog/` は純関数中心のため閾値を満たす設計にする |

## 1. テストファイル構成

| ファイル (`apps/hub/src/__tests__/dual-catalog-web/` 配下) | 環境 | 対象 |
|---|---|---|
| `polling-contract.test.ts` | node | `lib/catalog/polling.ts` — 間隔数列・停止条件・レート制御 |
| `polling-lifecycle.test.tsx` | **jsdom** | S03 / S01 の timer・visibility・cleanup の実配線 |
| `degradation.test.ts` | node | `lib/catalog/degradation.ts` — 失敗分類と §6.1 縮退 |
| `marketplace-document.test.ts` | node | `lib/catalog/marketplace.ts` — 文書生成・pending-h7 表明 |
| `tenant-isolation.test.ts` | node | テナント境界を跨ぐ entry 混入の禁止 |
| `authorization-cache-boundary.test.tsx` | **jsdom** | 401/403 後の stale 非表示・scope 切替・同一 scope 縮退・絞り込み要求数 |
| `scope-boundary.test.ts` | node | feat-publish-pipeline 責務への非侵食 |
| `catalog-a11y.test.tsx` | **jsdom** | S01/S02/S03/S04 の axe 違反 0 + レスポンシブ |
| `ci-gate-presence.test.ts` | node | **CI ゲートが定義として存在すること**そのものの検証 |

## 2. テストケース一覧

### 2.1 ポーリング契約 (`polling-contract.test.ts`)

| ID | ケース | 期待 |
|---|---|---|
| DC-POLL-01 | `nextPollIntervalMs(0)` | `2000` (初回 2 秒) |
| DC-POLL-02 | `nextPollIntervalMs(1..n)` の数列 | `4000, 8000, 16000, 30000` — ×2 で増え **30000 で頭打ち**。以降いくら進めても 30000 を超えない |
| DC-POLL-03 | 負値・非整数・巨大値の入力 | 例外を投げず 2000〜30000 の範囲に収まる (純関数の全域性) |
| DC-POLL-04 | 終端 status (`Published`/`Failed`/`Draft`) で `shouldContinuePolling` | `false` (停止) |
| DC-POLL-05 | 非終端 status (`Validating`/`Publishing` 等) | `true` (継続) |
| DC-POLL-06 | 連続失敗 4 回 → 5 回 | 4 回は `true`、**5 回で `false`** (上限 5 / ADR §2.4) |
| DC-POLL-07 | 経過時間 15 分未満 → 15 分以上 | 15 分以上で `false` (総試行上限) |
| DC-POLL-08 | `document.visibilityState !== 'visible'` 相当の入力 | `false` (不可視時は停止) |
| DC-POLL-09 | `429` + `Retry-After: 7` | 次回間隔は backoff 数列ではなく **7000** (サーバ指示を優先) |
| DC-POLL-10 | `429` + `Retry-After` なし | backoff 数列に従う |
| DC-POLL-11 | in-flight が存在する状態 | `false` (同一 projectId の多重送信を張らない) |
| DC-POLL-12 | 401 / 403 / fatal | 回数上限を待たず `false` (即時停止) |
| DC-POLL-13 | degraded | 終端扱いにせず、回数・時間上限までは継続 |
| DC-POLL-14 | visible 復帰候補 | 可視性以外の停止事由がない場合だけ `true` |

### 2.1.1 lifecycle 配線 (`polling-lifecycle.test.tsx`)

| ID | ケース | 期待 |
|---|---|---|
| DC-POLL-LC-01 | 401 / 403 / fatal 応答後に時間を進める | request 増分 0 |
| DC-POLL-LC-02 | degraded 応答後に初回 backoff を進める | request が再発生する（陽性対照） |
| DC-POLL-LC-03 | timer 待機中に hidden 化 | hidden 中の request 増分 0、visible 復帰で +1 |
| DC-POLL-LC-03B | S01 公開ウィザードで同じ操作 | S03 と同じ 0 / +1 |
| DC-POLL-LC-04 | visible event を連続送出 | 再開は +1 のみ |
| DC-POLL-LC-05 | 終端失敗後に hidden → visible | request 増分 0 |
| DC-POLL-LC-06 | unmount 後に時間を進める | timer / listener が残らず request 増分 0 |

### 2.2 縮退 (`degradation.test.ts`) — acceptance 3 の直接根拠

| ID | ケース | 期待 |
|---|---|---|
| DC-DEG-01 | `classifyCatalogFailure(500/502/503)` | `degraded` |
| DC-DEG-02 | `classifyCatalogFailure(404)` (API 未実装) | `degraded` — **`fatal` にしない** (ADR §0 A2) |
| DC-DEG-03 | `classifyCatalogFailure(401)` | `unauthorized` (→ `/signin`) |
| DC-DEG-04 | `classifyCatalogFailure(403)` | `forbidden` (→ 権限トースト。サインイン画面へ飛ばさない) |
| DC-DEG-05 | ネットワーク例外 (status なし) | `degraded` |
| DC-DEG-06 | `degraded` 時の UI 能力表 | 閲覧・install descriptor コピーは **可**、新規公開/追加/更新は **不可** |
| DC-DEG-07 | 縮退バナーの文言 | 「導入済みのツールはそのまま使えます」の主旨を含む (qa-019 文言規約) |
| DC-DEG-08 | 分類の網羅性 | 返り値は `degraded`/`unauthorized`/`forbidden`/`fatal` の 4 値のみ。未知 status も必ずいずれかに落ちる |

### 2.3 marketplace 文書 (`marketplace-document.test.ts`)

| ID | ケース | 期待 |
|---|---|---|
| DC-MKT-01 | `buildMarketplaceDocument(entries)` の形 | `.claude-plugin/marketplace.json` と同一キー (`name`/`description`/`version`/`owner`/`plugins[]`)。**新形式を発明しない** |
| DC-MKT-02 | zod スキーマ (`packages/schemas/dual-catalog-web/`) での検証 | 生成物が `safeParse` に通る |
| DC-MKT-03 | 純粋性 | 同一入力で同一出力。`Date.now()`/乱数に依存しない |
| DC-MKT-04 | **entry 0 件** の場合 | `plugins: []` かつ `sourceStatus: 'ready'` |
| DC-MKT-05 | **経路未確定 (H7 未成立)** の場合 | `plugins: []` かつ `sourceStatus: 'pending-h7'` |
| DC-MKT-06 | DC-MKT-04 と DC-MKT-05 の応答 | **互いに区別できる** (0 件と未確定を同じ緑にしない / P03 指摘 R5・引き継ぎ H2) |
| DC-MKT-07 | Route Handler 応答ヘッダ | `Cache-Control: private, max-age=60, stale-while-revalidate=300` + `Vary: Cookie, x-harness-tenant-id, x-harness-workspace-id`。認証済み応答を shared cache へ保存しない |
| DC-MKT-08 | pending-h7 時の応答ヘッダ | `x-catalog-source-status: pending-h7` が付く (body 側 `sourceStatus` と**二重に**表明) |
| DC-MKT-09 | 未確定時に推測値を焼き込まないこと | `plugins[].source` に `github`/`git-subdir`/`npm` のいずれも出現しない |

### 2.4 テナント分離 (`tenant-isolation.test.ts`)

| ID | ケース | 期待 |
|---|---|---|
| DC-TEN-01 | 2 テナント混在の entry 集合を tenant A で生成 | tenant B の entry が **1 件も混入しない** (U5 の二値判定) |
| DC-TEN-02 | tenant 未指定 | 空ではなく**エラー**にする (deny-by-default。無指定を「全件」と解釈しない) |
| DC-TEN-03 | fetch adapter が送るヘッダ | `x-harness-tenant-id` / `x-harness-workspace-id` を必ず付ける (既存 sheets 画面と同型) |
| DC-TEN-04 | `lib/catalog/` 内の認可判定 | **存在しない** — 認可の複製を禁じる (ADR §5 境界 3)。ソース上に role 判定分岐を持たない |
| DC-TEN-05 | catalog UI の通信経路 | 生の `fetch` を持たず、tenant/workspace header を付ける `CatalogPort` だけを使う |
| DC-TEN-06 | 一覧の成功 → 403 | 以前の行と table を描画しない |
| DC-TEN-07 | `initialDetail` あり → 403 | 以前の詳細・install descriptor を描画しない |
| DC-TEN-08 | Release 履歴の成功 → 403 | 以前の履歴行と table を描画しない |
| DC-TEN-09 | 同一 scope の成功 → 503 | DegradedBanner と以前の認可済み一覧を維持する |
| DC-TEN-10 | tenant/workspace 切替後の 503 | 旧 scope の一覧を 1 件も描画しない |
| DC-LIST-01 | 絞り込み値の入力 → submit | 入力中は要求 0 回、submit で 1 回だけ増え、適用 query を送る |

### 2.5 責務境界 (`scope-boundary.test.ts`)

| ID | ケース | 期待 |
|---|---|---|
| DC-SCOPE-01 | `components/catalog/` の操作導線 | promote / rollback / 検査実行 / pointer 更新のボタン・呼出を**持たない** (feat-publish-pipeline 責務) |
| DC-SCOPE-02 | 承認キュー UI (Stage 2) | 実装されていない (scope_out) |
| DC-SCOPE-03 | `CatalogPort` の操作種別 | 読み取り + install descriptor 取得のみ。状態機械を進める書込を持たない |
| DC-SCOPE-04 | install descriptor の組み立て | UI 側で R2 key や URL を合成しない。descriptor が返した値のみ表示 (ADR §2.1) |

### 2.6 アクセシビリティとレスポンシブ (`catalog-a11y.test.tsx`, jsdom)

| ID | ケース | 期待 |
|---|---|---|
| DC-A11Y-01 | S01 `/catalog` の SSR HTML に `axe.run` | 違反 **0 件** |
| DC-A11Y-02 | S02 `/catalog/[projectId]` | 違反 0 件 |
| DC-A11Y-03 | S03 (S02 内の公開状態タブ) | 違反 0 件。タブは role/aria-selected を持つ |
| DC-A11Y-04 | S04 `/catalog/releases` | 違反 0 件 |
| DC-A11Y-05 | **空ページを緑にしない**ガード | 見出し・ランドマーク・行データが実際に描画されていることを別途 assert (既存 `hub-screens.spec.ts` と同じ Goodhart 回避) |
| DC-A11Y-06 | ポーリング更新箇所 | `aria-live="polite"` を持ち、`assertive` を使わない |
| DC-A11Y-07 | 縮退バナー | 到達可能で読み上げ可能 (`role="status"` 相当) |
| DC-RESP-01 | 1280×800 と 390×844 の DOM 出力 | **同一** — viewport 別コンポーネントを JS で出し分けない (ADR §4.2)。切替は CSS クラスのみ |

### 2.7 CI ゲートの存在検証 (`ci-gate-presence.test.ts`) — acceptance 1 の直接根拠

acceptance 1 は「axe 違反 0 が**リリース条件として CI に存在する**」であり、**テストが通ること**ではなく**ゲートが定義されていること**が条件。よってワークフロー定義自体を検証対象にする。

| ID | ケース | 期待 |
|---|---|---|
| DC-CI-01 | `.github/workflows/hub-web-quality-gate.yml` の存在 | 存在する |
| DC-CI-02 | 同 workflow の内容 | catalog テスト (`src/__tests__/dual-catalog-web`) を実行する step を含む |
| DC-CI-03 | 同 workflow の内容 | client bundle 予算チェックを含む |
| DC-CI-04 | 失敗の伝播 | `continue-on-error: true` を持たない (落ちたら赤になる = リリース条件として機能する) |
| DC-CI-05 | 既存ゲートとの非重複 | 既存 `ci.yml` の G9/G13 を再定義していない (P03 指摘 R8 / 引き継ぎ H5) |

## 3. E2E ジャーニー (J1/J2) の扱い

### 3.1 設計 (Playwright 導入時に実行する)

| ジャーニー | 手順 | 検証 |
|---|---|---|
| **J1 カタログ閲覧・導入** | サインイン → `/catalog` 一覧 → 絞込 → 詳細 `/catalog/[projectId]` → 「追加する」→ install descriptor 表示・コピー | 各段で axe 違反 0、descriptor が UI 合成でないこと |
| **J2 公開状態確認** | `/catalog/[projectId]` → 公開タブ → 非終端 status のポーリング更新 → 終端で停止 | 2s→backoff→30s、終端で追加リクエストが飛ばない |
| viewport | 1280×800 / 390×844 の 2 系統 | レイアウト崩れなし・操作到達性維持 |

### 3.2 現時点の代替 (実行可能)

Playwright が未導入のため、上記のうち**検証価値の中核**を Vitest + jsdom へ移す。

- axe 検査 → DC-A11Y-01..07 (SSR HTML を実際に走査するため E2E とほぼ同等の被覆)
- ポーリング判定 → DC-POLL-01..14、実配線 → DC-POLL-LC-01..06 + 03B
- レスポンシブ → DC-RESP-01 (CSS のみ切替という決定により DOM 同一性で代替可能)

**残余リスク**: 実ブラウザでの CSS 適用結果・フォーカス順序の実挙動は未検証。Playwright 導入は本 feature の Write scope 外のため、P12 の follow-up として記録する。

## 4. 網羅対応表 (未割当 0 件)

### 4.1 acceptance 3 件

| acceptance | 割当 | 達成手段 |
|---|---|---|
| axe 検出可能違反 0 がリリース条件として CI に存在する | DC-CI-01..05, DC-A11Y-01..07 | **自動テストで完結** |
| CWV 全指標 good を実測で満たす | DC-CWV-01 (下記) | **自動テスト不可**。`.github/workflows/cwv.yml` の Lighthouse 実測。`vars.HUB_PUBLIC_URL` 設定 = P13 デプロイ後 |
| 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退) | DC-DEG-01..08, DC-MKT-07 | 縮退分類 + stale-while-revalidate による配信継続 |

- **DC-CWV-01**: LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1 を Lighthouse で実測。判定は cwv.yml の既存しきい値に従う。**未計測を good と見なさない** (P03 指摘 R7 / 引き継ぎ H6)。

### 4.2 quality_constraints 7 件

| id | 割当テストケース |
|---|---|
| `a11y-wcag22aa-cwv-good-axe-ci-qa018` | DC-A11Y-01..07 / DC-CI-01..05 / DC-CWV-01 / DC-RESP-01 |
| `hub-outage-degradation-continuity-section6-1-qa011` | DC-DEG-01..08 / DC-MKT-07 |
| `publish-status-polling-state-machine-qa009-qa062` | DC-POLL-01..14 / DC-POLL-LC-01..06 + 03B |
| `distribution-channel-url-marketplace-bootstrap-installer-qa003-i6-i9` | DC-MKT-01..09 |
| `workspace-catalog-thin-dual-catalog-stage1-mvp-i4-u7` | DC-SCOPE-01..04 / DC-A11Y-01..04 |
| `multi-tenant-simultaneous-workspaces-success-criteria-u5` | DC-TEN-01..10 / DC-MKT-07 |
| `publish-pipeline-server-side-out-of-scope-depends-on-feat-publish-pipeline` | DC-SCOPE-01..04 |

**未割当: 0 件。**

## 5. P05 への引き継ぎ

1. 本設計のケース ID をテスト名に含め、対応追跡を可能にする。
2. `lib/catalog/` は React 非依存の純関数として実装する (DC-POLL / DC-DEG / DC-MKT が DOM なしで書けることが前提)。
3. `hub-web-quality-gate.yml` は `apps/hub/package.json` へ script を足さず (Write scope 外)、workflow から vitest を直接呼ぶ。
4. DC-MKT-06 の「0 件と未確定の区別」は body + ヘッダの二重表明で満たす。
