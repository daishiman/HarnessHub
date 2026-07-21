# E4 CI run 証跡 (A1)

## 実行結果

| 項目 | 値 |
|---|---|
| workflow | `hub-ci` (`.github/workflows/ci.yml`) |
| run id | **29793052030** |
| branch | `feat/wt-2` |
| trigger | push |
| 総合 | **✓ success** |
| 実行日 | 2026-07-21 |

## job 別

| job | 結果 | 所要 |
|---|---|---|
| 静的ゲート (G1 pnpm 混入検査 / G10 共通層 duplicate detector) | **✓ success** | 14s |
| build & test (G2 lint / G3 typecheck / build / G4 test / G6 secret scan / G7 DDL / G8 drift / G9 axe / G5 bundle) | **✓ success** | 2m20s |
| wrangler deploy (Cloudflare Workers) | **skipped** | — |

## A1 の判定状態

acceptance A1 の判定条件は「**単一 workflow run 内で test job → deploy job の順に success 終了**」（requirements-baseline §4.2）。

- **達成済み**: 静的ゲート → build & test の連鎖が CI 上で success。ローカルだけでなく **clean install の ubuntu-latest でも全ゲートが通る**ことを確認した。
- **未達**: `deploy` job は `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` により feature branch では skip される。**skip は success ではない**ため、A1 は依然 blocked。

### A1 解除に必要なもの

1. GitHub Secrets: `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`、variable `HUB_HEALTH_URL`（**ユーザー作業**）
2. 本 PR を main へ merge → main への push で deploy job が実行される
3. その run で test → deploy が success 終了したことを本ファイルへ追記して A1 を確定する

## 先行 run（参考）

| run id | 結果 | 備考 |
|---|---|---|
| 29789168757 | failure | G4 で失敗。次 commit で解消し 29793052030 が success |

- 失敗 run を「なかったこと」にしないため記録する。CI 環境（clean install）でのみ再現した差異があったことの記録であり、ローカル実測だけでは A1 を判定できない根拠でもある。
