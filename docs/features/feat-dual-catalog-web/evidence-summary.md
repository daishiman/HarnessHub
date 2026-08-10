---
status: confirmed
layer: feature-evidence
---

# feat-dual-catalog-web 証跡サマリ (P11)

- graph node: `SYS-DUAL-CATALOG-WEB-P11` / beads: `HarnessHub-dhy.11`
- 集約日: 2026-08-01
- 消費: `test-run-results.md` (P06) / `acceptance-record.md` (P07) / `quality-assurance-report.md` (P09) / `final-review-record.md` (P10)

本書の目的は、quality_constraints 7 件の判定を**第三者が同じ手順で再現できる状態**にすること。
各制約について「何を実行し」「何が出れば合格か」「実際に何が出たか」を対で記録する。

---

## 0. 実行前提

| 項目 | 値 |
|---|---|
| 実行位置 | リポジトリルート |
| Node | v22.21.1 |
| pnpm | 10.9.0 |
| git HEAD | `6bd89591` (+ 本 feature の未コミット変更) |
| 事前準備 | `pnpm install` |

> 本 feature の成果物は執筆時点で未コミットのため、HEAD だけを checkout しても再現しない。
> 再現時は本 feature の変更を含む状態で実行すること。

### 一括再現

```bash
pnpm install
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web
pnpm --filter @harness-hub/hub run test:a11y
pnpm --filter @harness-hub/hub run typecheck
pnpm --filter @harness-hub/schemas run typecheck
pnpm exec biome check "apps/hub/src/__tests__/dual-catalog-web" "apps/hub/src/components/catalog" \
  "apps/hub/src/lib/catalog" "apps/hub/src/app/(workspace)/catalog" "apps/hub/src/app/marketplace.json" \
  "packages/schemas/dual-catalog-web"
node scripts/ci/check-shared-layer-duplicates.mjs
pnpm --filter @harness-hub/hub run build
pnpm --filter @harness-hub/hub run check:client-bundle
```

### 実行結果 (2026-08-01)

| コマンド | 期待 | 実測 |
|---|---|---|
| `vitest run src/__tests__/dual-catalog-web` | 全 pass | **8 files / 63 tests passed** |
| `test:a11y` (既存 G9) | 全 pass | 1 file / 3 tests passed |
| `typecheck` (hub) | 出力なし (exit 0) | pass |
| `typecheck` (schemas) | 出力なし (exit 0) | pass |
| `biome check` | No fixes applied | Checked 30 files, No fixes applied |
| `check-shared-layer-duplicates.mjs` | 違反 0 件 | 登録共通層 12 件 + 運用機構 4 件 / 走査 447 ファイル / **違反 0 件** |
| `build` | exit 0 | success |
| `check:client-bundle` | `withinBudget: true` | **true / violations: []** |

---

## 1. `a11y-wcag22aa-cwv-good-axe-ci-qa018` — partial

### 1.1 axe 検出可能違反 0

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/catalog-a11y.test.tsx
```

| ケース | 対象 | 期待 | 実測 |
|---|---|---|---|
| DC-A11Y-01 | S01 `/catalog` | violations 0 | pass |
| DC-A11Y-02 | S02 `/catalog/[projectId]` | violations 0 | pass |
| DC-A11Y-03 | S03 公開状態タブ | violations 0 + tab の `role`/`aria-selected` | pass |
| DC-A11Y-04 | S04 `/catalog/releases` | violations 0 | pass |
| DC-A11Y-07 | 縮退バナー | violations 0 + `role="status"` / `aria-live="polite"` | pass |
| DC-A11Y-05 | **検査の実効性** | `lang="ja"` / `<main>` / 見出し / skip link / 行データの実在 | pass |
| DC-RESP-01 | レスポンシブ | 破綻なし | pass |
| DC-NAV-01 | 一覧→詳細で scope 保持 | `tenant` / `workspace` が URL に残る | pass |

**空ページで緑を取れないこと**は DC-A11Y-05 が担保する (Goodhart 回避)。

### 1.2 リリース条件としての CI 存在

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/ci-gate-presence.test.ts
```

| ケース | 検査内容 | 実測 |
|---|---|---|
| DC-CI-01 | `hub-web-quality-gate.yml` が存在し `pull_request` で発火 | pass |
| DC-CI-02 | catalog テストの `run` があり、指し先に実テストが存在する | pass |
| DC-CI-03 | client JS 予算チェックを `pnpm -r build` の後に実行 | pass |
| DC-CI-04 | `continue-on-error` / `\|\| true` / `passWithNoTests` を持たない | pass |
| DC-CI-05 | 既存 `ci.yml` の G9 / G13 を再実装しない | pass |

### 1.3 CWV 実測 — **未計測**

```bash
gh workflow run hub-cwv --ref main            # catalog route が deploy 済みになってから実行する
```

現状は URL 未設定のため `cwv.yml` の「計測対象 URL の解決」step が意図的に `exit 1` する。
**未計測が緑にならない構成**であることが、この制約に対する現時点の証跡になる。

### 1.4 CWV 代理指標 (client JS 予算)

```bash
pnpm --filter @harness-hub/hub run build && pnpm --filter @harness-hub/hub run check:client-bundle
```

| route | 実測 | 予算 | 余裕 |
|---|---|---|---|
| `/catalog/[projectId]` | 119.0 KiB | 120.0 KiB | 1.0 KiB |
| `/catalog/releases` | 116.9 KiB | 120.0 KiB | 3.1 KiB |
| `/catalog` | 112.9 KiB | 120.0 KiB | 7.1 KiB |

証跡ファイル: `apps/hub/artifacts/client-bundle-report.json` (`withinBudget: true` / `violations: []` / `measuredAt: 2026-08-01T12:28:49.061Z`)

---

## 2. `hub-outage-degradation-continuity-section6-1-qa011` — pass

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/degradation.test.ts
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/marketplace-document.test.ts -t "DC-MKT-07"
```

| ケース | 期待 | 実測 |
|---|---|---|
| DC-DEG-01 | 500/502/503 → `degraded` | pass |
| DC-DEG-02 | 404 → `degraded` (`fatal` にしない) | pass |
| DC-DEG-03/04 | 401 → `unauthorized` / 403 → `forbidden` | pass |
| DC-DEG-05 | ネットワーク例外 → `degraded` | pass |
| DC-DEG-06 | 縮退時の能力表 (閲覧可・コピー可・変更不可) | pass |
| DC-DEG-07 | 「導入済みのツールはそのまま使えます」を含む | pass |
| DC-DEG-08 | 未知 status も 4 値のいずれかへ落ちる (全射) | pass |
| DC-MKT-07 | `private, max-age=60, stale-while-revalidate=300` + Cookie/tenant/workspace `Vary` | pass |

---

## 3. `publish-status-polling-state-machine-qa009-qa062` — pass

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/polling-contract.test.ts
```

DC-POLL-01..14 が **14 件すべて pass**。固定内容:

| ケース | 内容 |
|---|---|
| DC-POLL-01/02 | 初回 2,000ms → ×2 で増え **30,000ms で頭打ち** |
| DC-POLL-03 | 負値・非整数・巨大値でも 2,000..30,000ms に収まる |
| DC-POLL-04/05 | 終端 status では継続せず、非終端では継続する |
| DC-POLL-06/07 | 連続失敗 5 回 / 総試行 15 分で停止する (無限ポーリングを作らない) |
| DC-POLL-08 | 不可視タブでは継続しない |
| DC-POLL-09/10 | 429 は `Retry-After` を優先し、無ければ backoff 数列に従う |
| DC-POLL-11 | in-flight があれば次を張らない (要求の重畳なし) |
| DC-POLL-12/13 | 終端失敗は即時停止し、degraded は上限まで継続する |
| DC-POLL-14 | visible 復帰は可視性以外の停止事由がない場合だけ許可する |

さらに `polling-lifecycle.test.tsx` は **9件 pass**。hidden 中の request 増分 0、visible 復帰 +1、
連続 event の多重起動なし、終端失敗後 / unmount 後の増分 0 を、S03 と S01 の実配線で確認した。

写像の単一性 (`publish-status.ts` が状態遷移規則を持たないこと) は P10 §3 で原典確認済み。

---

## 4. `distribution-channel-url-marketplace-bootstrap-installer-qa003-i6-i9` — pass

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/marketplace-document.test.ts
```

| ケース | 期待 | 実測 |
|---|---|---|
| DC-MKT-01..03 | 文書構造が `marketplaceDocumentSchema` に適合 | pass |
| DC-MKT-04 | entry 0 件 → `plugins: []` / `source_status: ready` | pass |
| DC-MKT-05 | H7 未成立 → `plugins: []` / `source_status: pending-h7` | pass |
| DC-MKT-06 | **0 件と経路未確定が区別できる** | pass |
| DC-MKT-08 | body とヘッダ (`x-catalog-source-status`) の二重表明 | pass |
| DC-MKT-09 | 未確定時に source 推測値を焼き込まない | pass |
| DC-MKT-10 | 解決器の有無が gate の `verdict` と一致する | pass |

### 判定の正本

```bash
grep -n "^verdict:" docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md
# => verdict: H7_NOT_ESTABLISHED
```

DC-MKT-10 はこの `verdict` を読んで期待を切り替える。成立へ変われば「resolver を実装すること」を要求して落ちる
(P10 §4.2 で発火を確認済み)。

---

## 5. `workspace-catalog-thin-dual-catalog-stage1-mvp-i4-u7` — partial

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/scope-boundary.test.ts
node scripts/ci/check-shared-layer-duplicates.mjs
```

| ケース | 期待 | 実測 |
|---|---|---|
| DC-SCOPE-01 | `/promote` `/rollback` `/suspend` `/submit` `/approve` `/cancel` `/package` の導線なし | pass |
| DC-SCOPE-02 | 承認キュー UI (Stage 2) のファイルが存在しない | pass |
| DC-SCOPE-03 | `CatalogPort` は 5 操作のみ / `POST` 1 本 / `PUT`・`PATCH`・`DELETE` なし | pass |
| DC-SCOPE-04 | install descriptor を UI 側で合成しない | pass |
| 共通層重複 | 違反 0 件 | 走査 447 ファイル / 違反 0 件 |

**未達 1 件**: I4 が列挙する**低品質報告導線が未実装**。再現コマンドは以下 (現状はヒット 0 件 = 未実装の確認)。

```bash
grep -rn "報告\|feedback" apps/hub/src/components/catalog/ "apps/hub/src/app/(workspace)/catalog/"
# => 0 件 (導線なし)
```

リンク先 S14 (`/feedback`) が未実装のため今は追加しない。詳細と判断根拠は `final-review-record.md` §4.3。

---

## 6. `multi-tenant-simultaneous-workspaces-success-criteria-u5` — pass (二値判定は P13)

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web/tenant-isolation.test.ts
```

| ケース | 期待 | 実測 |
|---|---|---|
| DC-TEN-01 | 他テナントの entry が 1 件も混入しない | pass |
| DC-TEN-02 | scope 未指定は空ではなくエラー、かつ**要求を送らない** | pass |
| DC-TEN-03 | 全 5 経路がテナントヘッダを送る (server 側の定数と突合) | pass |
| DC-TEN-04 | `lib/catalog/` に認可判定を複製しない | pass |
| DC-TEN-05 | 画面側に生の通信 API を書かない (走査 8 ファイル) | pass |

**U5 の二値判定そのもの** (2 社以上の Workspace で同時稼働し公開と再利用が成立) は
提供者代表が P13 で行う。本 feature が用意したのは判定に必要な分離の担保まで。

---

## 7. `publish-pipeline-server-side-out-of-scope-depends-on-feat-publish-pipeline` — pass

§5 の DC-SCOPE-01..04 と同一の証跡。加えて原典確認 (P10 §3):

```bash
grep -c "method: '" apps/hub/src/lib/catalog/http-adapter.ts   # => 5 (GET 4 + POST 1)
```

`publish-status.ts` は状態 → 表示語彙の写像のみを持ち、遷移規則 (次にどの状態へ行けるか) を持たない。
状態機械の正本は feat-publish-pipeline 側にある。

---

## 8. 再現できない項目

| 項目 | 再現できない理由 | 再現可能になる条件 |
|---|---|---|
| CWV 実測 (LCP/INP/CLS) | 2026-08-02 の run `30736055772` は未認証 401 で失敗。現在は署名付き短命 `__cwv_probe` 経路があり、原理的な計測不能ではない | `hub-cwv` を再実行し、TBT ≤ 200ms を含む fresh artifact で確定 (`HarnessHub-aqi`) |
| SLO ダッシュボードの CWV 反映 | `slo-dashboard.json` に CWV panel が無い (Write scope 外) | P09 §3.3 の follow-up 完了後 |
| 実 API 経路の疎通 | `/api/v1/harnesses*` が未実装 | feat-publish-pipeline の実装完了後 |
| E2E (J1/J2) | Playwright 未導入 | 導入 follow-up 完了後 |
| Hub 実停止での縮退確認 | デプロイ済み環境が無い | P13 後の smoke |
| 低品質報告導線 (I4) | **未実装**。リンク先 S14 (`/feedback`) が feat-feedback-loop 側で未実装 | S14 実装後 |

上 5 件は「実行したが失敗した」ではなく「**実行条件が存在しない**」。未実行を pass として記録していない。
最後の 1 件 (低品質報告導線) だけは性質が違い、**本 feature の責務の欠落**である。依存先の実装待ちだが、
未達であることを消さずに残す (`final-review-record.md` §4.3)。

---

## 9. 証跡ファイルの所在

| 証跡 | 場所 |
|---|---|
| client JS 予算の実測 | `apps/hub/artifacts/client-bundle-report.json` |
| CWV 実測 (将来) | GitHub Actions artifact `cwv-evidence` (`lighthouse.json` / `cwv-report.json`) |
| テスト実行 | `apps/hub/src/__tests__/dual-catalog-web/` (8 files / 63 tests) |
| CI ゲート定義 | `.github/workflows/hub-web-quality-gate.yml` / `.github/workflows/ci.yml` (G9・G13) / `.github/workflows/cwv.yml` (G11) |
| 判定文書 | `test-run-results.md` / `acceptance-record.md` / `quality-assurance-report.md` / `final-review-record.md` |
