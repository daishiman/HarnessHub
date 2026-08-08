---
status: confirmed
layer: feature-evidence
task: SYS-BUILD-IDENTITY-P09
parent_feature: feat-build-identity-deploy-freshness
feature_package_id: feature-package/feat-build-identity-deploy-freshness
---

# P09 品質保証 — 稼働ビルドの素性と鮮度

feature: `feat-build-identity-deploy-freshness`

## P08（しきい値の単一定数化）の確認

しきい値が複数箇所に散ると「検査は 30 分・文書は 60 分」の食い違いが起き、運用判断が割れる。
本 feature では次の 1 箇所だけを正本とした。

```js
// apps/hub/scripts/check-deploy-freshness.mjs
export const DEFAULT_MAX_LAG_MINUTES = 30;
```

- CI からの上書きは環境変数 `DEPLOY_FRESHNESS_MAX_LAG_MINUTES`（既定は上記定数）
- CLI からの上書きは `--max-lag-minutes`
- **ci.yml に数値を直書きしていない**（workflow へ二重定義しない）
- 運用文書（`operations.md`）も数値ではなく定数名で参照する

判定分類（`OUTCOMES`）も同 script の 1 箇所に定義し、CI 出力と JSON 証跡で同じ語彙を使う。

## 品質ゲート結果

| ゲート | 結果 |
|---|---|
| `pnpm lint` | exit 0（669 ファイル） |
| `pnpm typecheck` | exit 0（全 package） |
| `apps/hub` 全テスト | 129 files / 1424 tests PASS（10 todo） |
| `packages/schemas` 全テスト | 6 files / 93 tests PASS |
| `check:auth-gates` | 3 ゲート全て pass |
| `validate-system-plan.py` | `"violations": []` |

## 意図的に fail-closed にした箇所

「検査できなかった」を「成功」と混同しないため、次の 3 つは全て **落とす** 側に倒してある。
ここを緩めると、本 feature 自体が今回の障害と同じ「success を返し続ける」状態になる。

| 分類 | 落とす理由 |
|---|---|
| `commit-unavailable` | 埋込配線が壊れた瞬間に検査が永久に緑になるのを防ぐ |
| `health-unreachable` | 到達不能を「問題なし」と読み替えない |
| 引数不備（exit 2） | URL 未指定のまま通過すると、検査していないのに緑になる |

## 契約 drift ゲートが働いたことの記録

`packages/schemas` に `commit` を追加した時点で、`openapi/components.json` snapshot と
`openapi.test.ts` の property キー期待値が **自動的に不一致になり 3 件 FAIL した**。
これは事故ではなく、「schema を変えたら OpenAPI 文書も更新せよ」を強制する drift ゲートの正常な発火である。
`vitest run src/contract-drift.test.ts -u` で snapshot を再生成して解消した。

## 残る品質上の留保

- 本番環境での実測（実際に `/health` から `commit` が返ること）は、**この feature の merge と deploy 後**にしか
  取れない。P13 の release-record に確認手順を残し、初回 deploy 後に追記する。
- 本番 `curl` は本セッションで許可されていないため、実測は未取得のままである（未取得を「確認済み」とはしない）。

## `HarnessHub-u9zq` 最終再検証 (2026-08-08)

smoke 直前の配信版再確認を追加した後、次を再実行した。

| ゲート | 結果 |
|---|---|
| task specification contract | `validate-system-plan.py --feature-package feature-package/feat-build-identity-deploy-freshness` → contract `1.3.0` / `violations: []` |
| 実挙動・CI 順序 | `smoke-version-recheck.test.ts` 8 件 + `production-auth-gates.test.ts` 14 件 → **22 PASS** |
| 無応答境界 | 実 HTTP server が応答を終えないケースで、全体 deadline 内に exit 1 となることを上記 8 件へ追加 |
| format / lint | 対象 4 ファイルの `biome check` → PASS |
| 型 | `pnpm --filter @harness-hub/hub run typecheck` → PASS |
| graph / diff | `validate-graph-schema.py` と `git diff --check` → PASS |

本番の Cloudflare 伝播は merge 後の deploy でしか確認できないため、local PASS を本番実測の代わりにはしない。
