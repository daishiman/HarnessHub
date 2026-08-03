---
status: confirmed
layer: feature-quality
task: SYS-POST-SIGNIN-SCOPE-P06
parent_feature: feat-post-signin-scope-routing
feature_package_id: feature-package/feat-post-signin-scope-routing
source: docs/features/feat-post-signin-scope-routing/test-design.md
---

# P06 テスト実行記録

対象: `HarnessHub-3sjj.6`。実行日: 2026-08-03。

| コマンド | 結果 |
| --- | --- |
| `pnpm --filter @harness-hub/hub exec vitest run tests/routing/post-signin-landing.test.ts tests/auth-tenancy/active-workspace-cookie.test.ts tests/auth-tenancy/home-page.test.tsx tests/security/authz-session-scope.test.ts tests/auth-tenancy/signin-page.test.tsx` | 5 files / 27 tests PASS |
| `pnpm --filter @harness-hub/hub exec vitest run tests/a11y/hub-screens.spec.ts` | 1 file / 3 tests PASS |
| `pnpm --filter @harness-hub/hub run test:tenant-isolation` | 1 file / 12 tests PASS |
| `pnpm --filter @harness-hub/hub run typecheck` | PASS |
| `pnpm --filter @harness-hub/hub run lint` | PASS |
| `pnpm --filter @harness-hub/hub run check:auth-gates` | 3 gates PASS |

計 42 テストが成功した。最初の実行は Rollup の optional binary 欠落で起動不能だったため、`pnpm install --frozen-lockfile` で lockfile どおりに復元してから再実行した。既存テストの回帰は 0 件。
