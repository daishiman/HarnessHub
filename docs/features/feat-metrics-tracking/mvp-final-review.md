---
status: confirmed
layer: feature-final-review
beads_id: HarnessHub-lm7
dev_graph_node_id: feat-metrics-tracking
recorded_at: 2026-08-10
---

# feat-metrics-tracking MVP 最終レビュー

## 目的

実行ログを安全に受け取り、週次で集計し、削減効果をダッシュボードで見せる Studio 機能の MVP を着地させる。

## 実装サマリ

| 層 | 内容 |
|---|---|
| DB | `metrics_events` / `metrics_rollups`（migration `0008`）+ repository |
| API | `POST /api/v1/metrics/events`、`GET summary`、`GET rollups` |
| cron | Workers 日次・週次 rollup（`createMetricsRollupCronJobs`） |
| 試算 | `packages/estimation/src/metrics.ts`（サーバ側のみ） |
| UI | `/metrics`（S09）、`/metrics/usage`（S16）、insight nav |
| 契約 | `@harness-hub/schemas` metrics-tracking contracts |

## 検証（MVP 最小）

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py --feature-package feature-package/feat-metrics-tracking` | PASS / violations 0 / digest `85adf596…` |
| schemas metrics-tracking | 28 tests PASS |
| estimation metrics | 10 tests PASS |
| db metrics-tracking | 10 tests PASS |
| hub metrics-tracking + nav | focused suite 内で PASS（hub 全体 145 focused と同時実行） |

## 残課題

1. 正規 route `/dashboard` `/tracking` への alias
2. P13 本番 deploy / smoke
3. Turso 使用量監視と anomaly 通知の運用証跡
4. Beads P03〜P13 の順次 close（merge 後）
