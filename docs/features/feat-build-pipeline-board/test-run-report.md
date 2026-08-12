# test-run-report: feat-build-pipeline-board (P06)

> SYS-BUILD-PIPELINE-BOARD-P06 の正本成果物。P04 で定義した 5 テストカテゴリ + axe/CWV を実行し、結果を記録する。

## 実行環境

- 実行日: 2026-08-13
- node: v22.21.1 (arm64, `/opt/homebrew/bin/node`)
- pnpm workspace: apps/hub, packages/db, packages/schemas

## 5 テストカテゴリの実行結果

| # | カテゴリ | コマンド | 結果 |
| --- | --- | --- | --- |
| 1 | stage-transition-admin-only | `pnpm --filter @harness-hub/hub vitest run src/__tests__/build-pipeline-board/stage-transition-admin-audit.test.ts` (BPB-SEC2/SEC6/SM) | PASS (27/27) |
| 1 | stage-transition-admin-only (DB層) | `pnpm --filter @harness-hub/db vitest run __tests__/build-stage-transition.test.ts` | PASS (12/12) |
| 2 | stage-change-audit-event | 同上 stage-transition-admin-audit.test.ts (BPB-SEC6-001/002) | PASS (上記27件に含む) |
| 3 | publish-stage-publishrequest-integrity | 同上 (BPB-B4-001〜003) / build-stage-transition.test.ts (B4節) | PASS (上記に含む) |
| 4 | build-entity-tenant-scope-isolation | 同上 (BPB-D4-001〜003) / build-stage-transition.test.ts (tenant分離節) | PASS (上記に含む) |
| 5 | shared-authz-table-b9-consistency | `pnpm --filter @harness-hub/hub vitest run src/__tests__/build-pipeline-board/authz-shared-table-consistency.test.ts` (P04で新規作成) | PASS (5/5) |

## Normative closure (axe / CWV)

| 基準 | コマンド | 結果 |
| --- | --- | --- |
| axe violations = 0 | `pnpm --filter @harness-hub/hub vitest run src/__tests__/build-pipeline-board/board-a11y-and-page.test.tsx` | PASS (4/4, BPB-A11Y-001/002 含む) |
| CWV LCP/INP/CLS = good | 本番URL実測はP13の責務。ローカルでは client bundle 予算 (`apps/hub/tests/ci/bundle-budget.test.ts`) で間接担保。P06時点では未実測 (production未デプロイのため計測不能)。 |

## build-pipeline-board 範囲の全体結果

```
apps/hub  (vitest src/__tests__/build-pipeline-board/)
  ✓ authz-shared-table-consistency.test.ts (5 tests)
  ✓ board-screen.test.tsx (8 tests)
  ✓ board-dto-and-title.test.ts (14 tests)
  ✓ runtime-and-http.test.ts (6 tests)
  ✓ board-a11y-and-page.test.tsx (4 tests)
  ✓ stage-transition-admin-audit.test.ts (27 tests)
  Test Files  6 passed (6)
  Tests  64 passed (64)

packages/db  (vitest __tests__/build-stage-transition.test.ts __tests__/migration-lineage.test.ts)
  ✓ migration-lineage.test.ts (5 tests)
  ✓ build-stage-transition.test.ts (12 tests)
  Test Files  2 passed (2)
  Tests  17 passed (17)

packages/schemas  (vitest build-pipeline-board/contracts.test.ts)
  ✓ contracts.test.ts (10 tests)
  Test Files  1 passed (1)
  Tests  10 passed (10)
```

合計 91 テスト、全て PASS。FAIL 0 件。

## scope_in / acceptance 未割当チェック

feature context (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`) の scope_in/acceptance に対し、上表で全件を追跡した (未割当 0 件)。

## 型検査

`cd apps/hub && pnpm exec tsc --noEmit -p .` — エラー 0 件で完了 (exit code 0)。

## 未実施・既知の限界

- Playwright E2E / Lighthouse CWV 実測は、本番URL相当の稼働環境が前提のため P06 時点では未実施 (P13 production smoke の責務として引き継ぐ)。

## 再実行手順

```bash
cd apps/hub && pnpm vitest run src/__tests__/build-pipeline-board/
cd packages/db && pnpm vitest run __tests__/build-stage-transition.test.ts __tests__/migration-lineage.test.ts
cd packages/schemas && pnpm vitest run build-pipeline-board/contracts.test.ts
```
