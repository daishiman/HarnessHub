---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P11
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
package_digest: sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502
collected_at: "2026-07-21"
---

# E4 CI run 証跡 (A1)

> **A1 は 2026-07-25 に確定した（§確定 run を参照）。** 本ファイルは追記形式で、§実行結果〜§A1 の判定状態は **2026-07-21 時点（P11 収集時）の記録**としてそのまま保存する。当時 blocked だった事実を消さないためである。

## 実行結果（2026-07-21 / feature branch）

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

## A1 の判定状態（2026-07-21 時点）

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

---

## 確定 run（2026-07-25 / main / P13）

§A1 解除に必要なもの の 3 条件がすべて満たされたため、ここに A1 の確定を記録する。

| 項目 | 値 |
|---|---|
| workflow | `hub-ci` (`.github/workflows/ci.yml`) |
| run id | **[30143422049](https://github.com/daishiman/HarnessHub/actions/runs/30143422049)** |
| branch | `main` |
| head sha | `ec0f3e45dfa2e72da6d6a24c082046b931eefa59` |
| trigger | push |
| 総合 | **✓ success** |

### job 別（実測: `gh run view 30143422049 --json jobs`）

| job | 結果 | 完了時刻 (UTC) |
|---|---|---|
| 静的ゲート (G1 pnpm 混入検査 / G10 共通層 duplicate detector) | **✓ success** | 2026-07-25T04:06:03Z |
| build & test (G2-G9 required status checks) | **✓ success** | 2026-07-25T04:08:38Z |
| wrangler deploy (Cloudflare Workers) | **✓ success** | 2026-07-25T09:59:09Z |

### A1 が満たされた根拠

`deploy` job は `needs: [static-gates, test]` かつ `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` で定義されている。**両ゲートの success を経由しなければ起動しない**ため、deploy job が success で終わっていることが「同一 run 内で test → deploy の順に success 終了した」ことの機械的証明になる。

### 証跡の性質（限定条件を明記する）

- **deploy job のみ 09:59 に再実行している。** cron trigger 登録の失敗（後述）を解消する前に一度失敗したため。static-gates と test は 04:06〜04:08 の初回実行の結果を引き継いでいる。
- run の conclusion は `success`、run 内の全 job も `success`。したがって「**同一 run 内で全 job success**」という A1 の条件は満たす。一方「全 job を一度の連続実行で通した」わけではない。
- 再実行は**同一 sha (`ec0f3e45`) に対して**行われたため、3 job が検査した対象コードは同一である。この点で、条件の実質（test を通ったコードが deploy された）は損なわれていない。

### 併せて解決した blocker: cron trigger 登録

2026-07-21 から未解決だった cron trigger 登録失敗は、本 run で解消した。

- 原因: Cloudflare Free プランの cron trigger 上限 **5 本は Worker 単位ではなくアカウント単位**（API エラーコード `10072`）。同一アカウントの他プロジェクトが 5 枠を消費していた。
- 対処: 他プロジェクト (`ubm-hyogo-api` / `ubm-hyogo-api-staging`) の cron を全削除して枠を解放。
- 結果: `harness-hub` の cron 2 本（`0 15 * * *` / `0 0 * * 1`）が登録され、アカウント使用数は **2 / 5**。

詳細と復元用ペイロードは [../release-notes.md](../release-notes.md) §3、設計側の反映は [docs/infrastructure-spec.md](../../../infrastructure-spec.md) §5 を参照。
