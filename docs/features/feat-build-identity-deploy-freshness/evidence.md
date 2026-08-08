---
status: confirmed
layer: feature-evidence
task: SYS-BUILD-IDENTITY-P11
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P11 証跡固定 — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`
固定日: 2026-08-08

この文書は「後から同じ判断を再現できるか」を担保する。digest は文書と実装の乖離（drift）を検出するためのもので、
実装を変えたら digest も更新する。digest が合わなければ、この文書の記述は実装を指していない。

## 変更ファイルと source digest (sha256 先頭 16 桁)

| ファイル | digest |
|---|---|
| `.github/workflows/ci.yml` | `ce49ce1a5fbabeb1` |
| `apps/hub/package.json` | `64e6917720a1a748` |
| `apps/hub/scripts/check-deploy-freshness.mjs` | `46a777fb2d829b6b` |
| `apps/hub/src/app/health/route.ts` | `bc88940071615f9a` |
| `apps/hub/src/app/health/runtime-env.ts` | `de4c450ed11fec83` |
| `apps/hub/tests/ci/deploy-freshness.test.ts` | `9b63cc7e164f3442` |
| `apps/hub/tests/ci/production-auth-gates.test.ts` | `19add6b0151ef04b` |
| `apps/hub/tests/ci/version-gate-behavior.test.ts` | `3dec5426ba48b15e` |
| `apps/hub/tests/health/health.route.test.ts` | `cf15d12c872ea741` |
| `packages/schemas/openapi/components.json` | `eb2fb98911530461` |
| `packages/schemas/src/health.test.ts` | `0c466926cf17711e` |
| `packages/schemas/src/health.ts` | `06b11e5643d53ff6` |
| `packages/schemas/src/openapi.test.ts` | `bbaa068720323937` |

digest の再計算:

```bash
shasum -a 256 <path> | cut -c1-16
```

## 再実行コマンド（世代非依存）

repository root から:

```bash
# 静的ゲート
pnpm lint
pnpm typecheck

# 契約 (schemas)
cd packages/schemas && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run

# 挙動 + 配線 (hub)
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/ci tests/health

# 本 feature の新規挙動テストだけ
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run tests/ci/deploy-freshness.test.ts

# 認可ゲート
pnpm --filter @harness-hub/hub run check:auth-gates

# 鮮度検査そのものを手元から実行（本番 /health に対して）
pnpm --filter @harness-hub/hub run check:deploy-freshness --health-url "$HUB_HEALTH_URL"
```

`/opt/homebrew/bin/node` を明示するのは、既定 node が x64 スライスで起動して
`@rollup/rollup-darwin-x64` を要求し vitest が起動できないため（arm64 の node で直接叩く）。

## 実測値（2026-08-08 時点）

- `apps/hub` `tests/ci` + `tests/health`: **11 files / 123 tests PASS**
- `packages/schemas`: **6 files / 93 tests PASS**
- `apps/hub` 全体: **129 files / 1424 tests PASS**（10 todo）
- `pnpm lint` / `pnpm typecheck`: exit 0

## 未取得のまま残る証跡

- 本番 `/health` から実際に `commit` が返ることの実測。merge → deploy 後にしか取れないため、
  `release-record.md` に確認手順を残し、取得後にそちらへ追記する。**未取得を「確認済み」とは扱わない。**
