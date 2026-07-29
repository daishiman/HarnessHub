---
status: pass
layer: feature-test-evidence
task: SYS-HEARING-INTAKE-P06
feature_package_id: feature-package/feat-hearing-intake
source_digest: sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5
executed_at: 2026-07-29
---

# feat-hearing-intake テスト実行報告

## 結論

P04 が定義した5カテゴリと normative evidence は全件 pass。P05 実装待ちだった40件も
すべて実行テストへ昇格し、最終レビュー追加分を含むヒアリング専用スイートは
101件 pass、todo・skip 0件となった。

## 5カテゴリの結果

| カテゴリ | 判定 | 主なテスト |
|---|---|---|
| 受付番号発番 | pass | `HI-CODE-*`、実DBでtransaction rollback・並行採番・tenant別連番 |
| AIキュー認可・consumer契約 | pass | `HI-QUEUE-*` / `HI-SEC8-*`、enqueue→claim→complete、tenant/workspace・claim token一致 |
| Markdown sanitize | pass | `HI-SEC7-*`、script/event handler/`javascript:` 除去と正常Markdown描画 |
| 試算のサーバ計算限定 | pass | `HI-EST-*`、共有 `estimateSavings` 単一呼び出し、salary非保存 |
| axe a11y | pass | `HI-A11Y-*`、S10/S11/S12 の実コンポーネントで違反0件 |

## Normative evidence

| 必須証跡 | 判定 | 根拠 |
|---|---|---|
| `kind=sheet_generation` | pass | schema/queue contract と実DB往復 |
| shared queue consumer | pass | 共通層重複検出 0件、汎用 `ai_jobs` + feature adapter |
| sheetEstimate server execution | pass | estimation adapter とservice結合テスト |
| estimate snapshot | pass | DB保存・detail応答・payloadからsalary/hourlyRateを除外 |
| tenant/role | pass | tenant fixture 19/19、認可3ゲート |
| enqueue/complete round-trip | pass | `packages/db/__tests__/hearing-intake.test.ts` |

## 実行結果

| コマンド | 結果 |
|---|---|
| `pnpm --filter @harness-hub/hub exec vitest run tests/hearing-intake` | 8 files / 101 tests pass |
| `pnpm --filter @harness-hub/db exec vitest run __tests__/hearing-intake.test.ts` | 1 file / 8 tests pass |
| `pnpm --filter @harness-hub/hub test` | 52 files / 609 pass / skip 0、coverage 80.11% |
| `pnpm --filter @harness-hub/db test` | 28 files / 213 tests pass、coverage 93.78% |
| `pnpm --filter @harness-hub/schemas test` | 6 files / 86 tests pass、coverage 99.53% |
| Hub / DB / Schemas lint・typecheck | pass |
| `pnpm --filter @harness-hub/hub build` | pass |
| `pnpm --filter @harness-hub/hub build:worker` | pass |
| system plan validation | pass、violations 0 |

Hub全体を含め、todo・skip は0件である。
ブラウザ接続先が無かったため手動スクリーンショットは取得できず、実コンポーネントのaxe、
SSR描画テスト、Next/OpenNext buildを再現可能な代替証跡とした。

## 再現コマンド

```bash
pnpm --filter @harness-hub/hub exec vitest run tests/hearing-intake
pnpm --filter @harness-hub/hub test
pnpm --filter @harness-hub/db test
pnpm --filter @harness-hub/schemas test
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-hearing-intake
```
