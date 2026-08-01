---
status: confirmed
layer: feature-test-results
---

# feat-dual-catalog-web テスト実行結果 (P06)

- graph node: `SYS-DUAL-CATALOG-WEB-P06` / beads: `HarnessHub-dhy.6`
- 実行日: 2026-08-01
- 対象: P05 実装物 (`apps/hub/src/{app/(workspace)/catalog,components/catalog,lib/catalog}`, `packages/schemas/dual-catalog-web/`, `.github/workflows/hub-web-quality-gate.yml`)

---

## 1. 実行サマリ

| ゲート | コマンド | 結果 |
|---|---|---|
| catalog 契約テスト | `pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web` | **8 files / 63 tests passed** |
| 既存 a11y (G9) | `pnpm --filter @harness-hub/hub run test:a11y` | 1 file / 3 tests passed |
| 型検査 | `pnpm --filter @harness-hub/hub run typecheck` / `--filter @harness-hub/schemas` | 双方 pass |
| lint / format | `pnpm exec biome check <catalog scope>` | Checked 30 files, No fixes applied |
| 共通層重複検知 | `node scripts/ci/check-shared-layer-duplicates.mjs` | 走査 447 ファイル / **違反 0 件** |
| build | `pnpm --filter @harness-hub/hub run build` | success |
| client JS 予算 (G13) | `pnpm --filter @harness-hub/hub run check:client-bundle` | **初回 fail → 是正後 pass** (§3) |
| CWV 実測 (DC-CWV-01) | `.github/workflows/cwv.yml` (Lighthouse) | **未実測** (§4) |

---

## 2. テストケース別の結果

| ファイル | ケース | 件数 | 結果 |
|---|---|---|---|
| `polling-contract.test.ts` | DC-POLL-01..11 | 11 | pass |
| `degradation.test.ts` | DC-DEG-01..08 | 8 | pass |
| `marketplace-document.test.ts` | DC-MKT-01..09 | 11 | pass |
| `tenant-isolation.test.ts` | DC-TEN-01..04 | 4 | pass |
| `scope-boundary.test.ts` | DC-SCOPE-01..04 | 5 | pass |
| `catalog-a11y.test.tsx` | DC-A11Y-01..07 / DC-RESP-01 / **DC-NAV-01** | 11 | pass |
| `ci-gate-presence.test.ts` | DC-CI-01..05 | 5 | pass |

axe 違反: **0 件** (DC-A11Y-01..04, 07 で `axe.run(document)` を実行。違反があれば違反 ID・impact・help を連結した文字列で失敗する)。

### 2.1 P06 で追加したケース (DC-NAV-01)

§3 のバンドル調査中に、**一覧から詳細への遷移リンクが `tenant` / `workspace` を落としている**ことが判明した。
詳細画面は scope を URL から読むため、一覧からの導線が全て「Workspace が特定できません」で止まる。
実装を是正したうえで、同じ退行を捕まえる `DC-NAV-01` を追加した (test-design には無い新規ケース。P04 test-design へ追補する)。

---

## 3. quality_constraints 7 件の判定

| id | 判定 | 根拠 |
|---|---|---|
| `a11y-wcag22aa-cwv-good-axe-ci-qa018` | **partial** | axe 0 件 + CI ゲート存在は pass。CWV 実測のみ未達 (§4) |
| `hub-outage-degradation-continuity-section6-1-qa011` | pass | DC-DEG-01..08 / DC-MKT-07 (`stale-while-revalidate=300`) |
| `publish-status-polling-state-machine-qa009-qa062` | pass | DC-POLL-01..11 |
| `distribution-channel-url-marketplace-bootstrap-installer-qa003-i6-i9` | pass | DC-MKT-01..09。H7 未成立のため `plugins: []` + `source_status: 'pending-h7'` の fail-closed を確認 |
| `workspace-catalog-thin-dual-catalog-stage1-mvp-i4-u7` | pass | DC-SCOPE-01..04 / DC-A11Y-01..04 |
| `multi-tenant-simultaneous-workspaces-success-criteria-u5` | pass | DC-TEN-01..04 + DC-NAV-01 |
| `publish-pipeline-server-side-out-of-scope-depends-on-feat-publish-pipeline` | pass | DC-SCOPE-01..04 (promote/rollback/検査実行の導線を持たないことを assert) |

---

## 4. client JS 予算 (G13) — 検知した fail と是正

**予算**: route あたり First Load JS 120.0 KiB (gzip, `apps/hub/scripts/check-client-bundle.mjs` の既定値)。

### 4.1 初回計測 (fail)

| route | 実測 | 判定 |
|---|---|---|
| `/catalog/[projectId]` | 139.6 KiB (142,932 B) | **NG** (+19.6 KiB) |
| `/catalog/releases` | 137.4 KiB (140,668 B) | **NG** (+17.4 KiB) |
| `/catalog` | 135.4 KiB (138,669 B) | **NG** (+15.4 KiB) |

原因はチャンク単位の実測で 2 つに切り分けた。

1. **zod + 契約一式 18.3 KiB** (`static/chunks/5120-*.js`) が 3 ルートすべての初回チャンクに載っていた。
   `lib/catalog/http-adapter.ts` が応答検証スキーマを静的 import していたため。
   同じチャンクは `/sheets` には無く、catalog 固有の増分であることが確認できた。
2. **`next/link` の router runtime 3.3 KiB** (`static/chunks/9664-*.js`)。
   apps/hub 全体で `next/link` を使っていたのは `CatalogList.tsx` **のみ**で、既存画面 (`/sheets`) は素の `<a href>` で遷移していた。

### 4.2 是正 (P05 Write scope 内)

| 是正 | 変更 | 削減 |
|---|---|---|
| 検証器の遅延読込 | `http-adapter.ts`: `import('@harness-hub/schemas')` を fetch と**並走**させ、初回チャンクから外す。検証自体は残す | −18.3 KiB |
| `next/link` の除去 | `CatalogList.tsx`: `<a href={detailHref(scope, id)}>` へ。既存画面の規約に揃える | −3.3 KiB |

**予算値は変更していない。** 閾値はリポジトリ共通の退行検知器であり、自 feature のために緩めると次の退行を検知できなくなる。

### 4.3 是正後 (pass)

| route | 是正前 | 是正後 | 余裕 |
|---|---|---|---|
| `/catalog/[projectId]` | 139.6 KiB | **119.0 KiB** | 1.0 KiB |
| `/catalog/releases` | 137.4 KiB | **116.9 KiB** | 3.1 KiB |
| `/catalog` | 135.4 KiB | **112.9 KiB** | 7.1 KiB |

`check:client-bundle` は exit 0。計測結果は `apps/hub/artifacts/client-bundle-report.json` に保存される。

> `/catalog/[projectId]` の余裕は 1.0 KiB と薄い。この route の計測値には、client-reference manifest の和集合として
> 兄弟ルート `/catalog` の chunk も算入される。構成の余裕確保は P08 (refactoring-migration) で扱う。

### 4.4 PR 作成後の Hub 全体回帰

PR #628 の初回 GitHub CI は `ai-queue-contract.test.ts` が catalog failure fixture の `kind` を
queue kind 新設と誤認して 1 件 fail した。fixture を computed key へ変え、実行時のデータ形状は維持した。

| 検証 | 結果 |
|---|---|
| 誤検知検査 + catalog cache 境界 | 2 files / 22 tests pass |
| Hub 全体 (`vitest run --coverage`) | 76 files / 908 passed / 1 skipped |
| Hub 全体 coverage | statements/lines 81.84%、branches 86.47%、functions 84.47% |

本追補はテスト記法だけの変更で、production code・schema・仕様契約への追加影響はない。

---

## 5. 未実施・未達 (差し戻し理由)

| 項目 | 状態 | 理由 | 引き継ぎ先 |
|---|---|---|---|
| **DC-CWV-01 (LCP/INP/CLS 実測)** | 未実測 | Lighthouse は公開 URL に対して走る。`vars.HUB_PUBLIC_URL` は P13 デプロイ後に確定する | P07 で「未計測を good と見なさない」判定 → P13 後に実測 |
| **J1/J2 E2E (Playwright)** | 未実施 | Playwright 未導入。導入は本 feature の Write scope 外 | P12 の follow-up として記録 |
| **実 API 経路の疎通** | 未実施 | `/api/v1/harnesses*` は feat-publish-pipeline 所有で未実装 (ADR §0 A2)。現状は 404 → `degraded` 表示となる (設計どおり) | feat-publish-pipeline |

**fail のまま残したゲートは無い。** 上記 3 件はいずれも「本 feature の実装では判定不能」であり、判定条件そのものを
未達として明示する (P03 指摘 R7: 未計測を good と見なさない)。

---

## 6. 再現コマンド

```bash
pnpm --filter @harness-hub/hub exec vitest run src/__tests__/dual-catalog-web
pnpm --filter @harness-hub/hub test
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
