---
title: "feat-docs-cms CI 品質ゲート確認 (P09)"
status: confirmed
graph_node_id: "SYS-DOCS-CMS-P09"
beads_linkage: "HarnessHub-9wb.9"
depends_on:
  - docs/features/feat-docs-cms/test-run-report.md
---

# feat-docs-cms CI 品質ゲート確認

> P09 で指定された 4 項目 (axe/tenant 分離/AI キュー認可/XSS sanitize) + 関連 CI ゲートを
> `.github/workflows/ci.yml` の実際の実行経路に沿って fail-closed で確認する。

## 発見した不整合とその修正

- `packages/db/scripts/check-tenant-isolation-coverage.ts` の `SYMBOL_BY_TABLE` に
  新規 `documents` テーブルのエントリが欠落しており、`pnpm check:tenant-isolation-coverage` が NG だった。
  fixture (`__tests__/fixtures/two-tenants.ts`) 自体は `createDocsCmsRepository.createDocument` で
  既に `documents` を seed していたため、スクリプト側の宣言漏れのみが原因。
  `documents: 'createDocsCmsRepository'` を追加し修正。修正後 OK (scoped=20 / fixture 網羅 20/20)。

## 確認結果 (CI ワークフロー実行順)

| ゲート | コマンド | 結果 |
| --- | --- | --- |
| typecheck (全 workspace) | `pnpm -r typecheck` | OK (7 projects) |
| 単体/結合/契約テスト | `pnpm --filter hub test` | Test Files 99 passed, Tests 1136 passed / 1 skipped |
| Docs cursor pagination 回帰 | `packages/db/__tests__/docs-cms.test.ts` | `DOCS-PAGE-001` pass (3 文書を重複なく走査) |
| production build | `pnpm --filter hub build` | OK (compile + type check) |
| tenant 分離 (D4/DOCS-TEN) | `apps/hub/src/__tests__/docs-cms/tenant-isolation.test.ts` (hub test に内包) | 6/6 pass |
| XSS sanitize (SEC7/DOCS-SEC7) | `apps/hub/src/__tests__/docs-cms/markdown-sanitize.test.ts` (hub test に内包) | 7/7 pass |
| AI キュー認可 (SEC8/DOCS-QUEUE) | `apps/hub/src/__tests__/docs-cms/ai-queue-contract.test.ts` (hub test に内包) | 8/8 pass |
| axe (DOCS-A11Y) | `apps/hub/tests/docs-cms/a11y-screens.test.tsx` (hub test に内包) | 6/6 pass |
| DDL 単一 lineage | `pnpm --filter @harness-hub/db run check:ddl` | OK: 6 migration / 単一 lineage / 未承認破壊的 DDL 0 件 |
| テナント分離網羅 (D4 §8.4/qa-020) | `pnpm --filter @harness-hub/db run check:tenant-isolation-coverage` | OK: scoped=20 / fixture 網羅 20/20 (修正後) |
| 接続層隔離 | `pnpm --filter @harness-hub/db run check:connection-isolation` | OK: packages/db 外からの driver 直接 import 0 件 |
| schema drift | `pnpm --filter @harness-hub/schemas run check:drift` | 4/4 pass |
| db write gate | `node packages/db/scripts/check-db-write-gate.mjs` | OK: repository 配下 write 81 件 全て guardedWrite 経由 |
| 名指し tenant 分離ゲート | `node scripts/ci/check-tenant-isolation-gate.mjs` | OK: apps/hub/tests/auth-tenancy/tenant-isolation.test.ts 12 ケース / 必須 ID 7 種 |

## 既存規約に基づく対象外の確認

- `test:a11y` npm script (`vitest run tests/a11y`) は `tests/a11y/hub-screens.spec.ts` のみを対象にした別カテゴリの CI ゲートであり、
  feature 単位の axe テスト (`tests/hearing-intake/a11y-screens.test.tsx` 等) はいずれもこの script の対象外という既存規約がある。
  `tests/docs-cms/a11y-screens.test.tsx` もこの規約に従い対象外だが、`pnpm --filter hub test` (フルスイート、`tests/**/*.test.tsx` を収集) には含まれ、既に green 確認済み。

## 総合判定

axe/tenant 分離/AI キュー認可/XSS sanitize の 4 項目、および関連する DDL・接続層隔離・schema drift・db write gate を含む全 CI 品質ゲートが green。
1 件の宣言漏れ (documents テーブルの tenant-isolation-coverage 未登録) を検出・修正済み。
source digest: `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
