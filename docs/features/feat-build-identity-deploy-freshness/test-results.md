---
status: confirmed
layer: feature-evidence
task: SYS-BUILD-IDENTITY-P06
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P06 テスト実行証跡 — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`
実行日: 2026-08-08

## 実行環境の注意

既定 `node` は x64 スライスで起動するため `@rollup/rollup-darwin-x64` を要求し、vitest が起動できない。
本 repository では arm64 の node で vitest を直接叩く。

```bash
/opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run <path>
```

## 結果

| 対象 | コマンド（package 直下から） | 結果 |
|---|---|---|
| hub / CI・health 全体 | `vitest run tests/ci tests/health` | **11 files / 123 tests PASS** (6.61s) |
| hub 全体 | `vitest run` | **129 files / 1424 tests PASS** (10 todo) |
| schemas 全体 | `vitest run` | **6 files / 93 tests PASS** (2.08s) |
| 新規 挙動テスト | `vitest run tests/ci/deploy-freshness.test.ts` | **16 tests PASS** (683ms) |

## 静的ゲート

| ゲート | コマンド | 結果 |
|---|---|---|
| lint | `pnpm lint` | exit 0（669 ファイル / No fixes applied） |
| typecheck | `pnpm typecheck` | exit 0（全 package） |
| 認可ゲート | `pnpm --filter @harness-hub/hub run check:auth-gates` | `[auth-gates] OK: 3 ゲート全て pass` |
| 計画整合 | `validate-system-plan.py --feature-package feature-package/feat-build-identity-deploy-freshness` | `"violations": []` |

## 途中で踏んだ失敗と是正

| 症状 | 原因 | 是正 |
|---|---|---|
| CLI テストが 6 分以上ハングし、全ケースが `health-unreachable` を返した | `execFileSync` がテストプロセスのイベントループを止め、同一プロセスの `/health` サーバが接続を受け付けられない | `execFile` の Promise ラップ（非同期）へ変更。683ms で 16 件 PASS |
| `pnpm typecheck` が TS2379 ×3 / TS2769 ×1 | `exactOptionalPropertyTypes: true` 下で `string \| undefined` を `string?` へ渡せない | `commit?: string \| undefined` を明示。env は分割代入で `HUB_HEALTH_URL` だけを除去 |
| `packages/schemas` が 3 件 FAIL | `commit` 追加で OpenAPI snapshot と property 期待値が不一致（契約 drift ゲートの正常な発火） | 期待値へ `'commit'` を追加し、`vitest run src/contract-drift.test.ts -u` で `components.json` を再生成 |
| `version-gate-behavior.test.ts` が壊れた | ci.yml へ step を挿入したため、区間切り出しの end marker（OIDC smoke）までに新 step の YAML が紛れ込んだ | end marker を `- name: 稼働ビルドの鮮度検査` へ変更 |
| `pnpm lint` exit 1 | biome の import 整列 | `{ type R2HeadCapable, type RuntimeEnv, resolveCommit }` へ修正 |
