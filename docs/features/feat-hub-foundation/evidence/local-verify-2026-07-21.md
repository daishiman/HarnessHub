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

# ローカル全品質ゲート再検証（2026-07-21）

- 実行コマンド: `pnpm verify`
- 結果: **exit 0**
- 実行順: pnpm 混入 → 共通層/運用機構 → Biome → typecheck → Next build → OpenNext build → 全テスト → secret scan → schema drift → bundle 予算
- テスト: **46 test files / 592 tests 全 pass**
  - db 3/17、estimation 3/39、inspection 6/51、schemas 6/86、ui 12/266、hub 16/133
- Biome: 152 files、error/warning/info 0
- typecheck: 全 6 package pass
- duplicate / boundary detector: 200 source files、登録共通層 12 件 + 共通運用機構 4 件、違反 0
- secret scan: 191 files、finding 0
- schema drift: 4 tests pass
- Worker bundle: 998,715 bytes（0.952 MiB）/ 3,145,728 bytes、`wrangler-dry-run`
- production build: Next.js / OpenNext とも成功

## 外部状態の読み取り確認

- `wrangler deployments list`: production deployment を取得でき、現行配信 version は `d61b1cb4-ae22-44a8-a0a2-5f8750a6fd8c`
- `GET https://harness-hub.daishimanju.workers.dev/health`: HTTP 200、`runtime-config` / `db` / `r2` は全て `ok`
- GitHub environment: `gh auth status` が token 失効、Secrets/Variables 読み取りは HTTP 401。未設定と断定せず **未確認**とする

## この証跡が保証しないもの

- 変更後の GitHub Actions 実行（commit/push 未実施のため）
- main push 後の CI deploy job 完走
- Better Stack の 3 分間隔監視と 1 か月分の SLO 時系列
- cron trigger の本番登録・実発火
