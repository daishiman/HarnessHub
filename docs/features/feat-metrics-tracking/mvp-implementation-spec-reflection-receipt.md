---
status: confirmed
layer: feature-spec-reflection
beads_id: HarnessHub-lm7
dev_graph_node_id: feat-metrics-tracking
package_digest: sha256:85adf59613687174abc6a4904276bb3856bd6ed6d7acf0ee637ac6221df637ef
recorded_at: 2026-08-10
---

# feat-metrics-tracking MVP 仕様反映受領書

## 1. 判定

仕様・設計への影響は **あり**。

MetricsEvent/MetricsRollup の schema・migration `0008`、ingest / summary / rollups API、
Workers cron 週次 rollup、`packages/estimation` の metrics domain module、S09/S16 画面、
shell navigation を実装したため、backend / database / frontend / ui-ux / security /
maintenance-ops の正本を更新する必要がある。

## 2. 正規フローの受領

system-spec は本 branch で metrics 契約を再確定済みである（`spec-state.json` の backend /
database / frontend / ui-ux セル、`completeness-report.json`）。主な契約:

| 領域 | 正本 | 受領した契約 |
|---|---|---|
| ingest | `system-spec/backend.md` | 短命 Bearer + workspace header + Idempotency-Key。body は harnessId と runCount のみ |
| rollup | `system-spec/backend.md` / `database.md` | 日次・週次 cron。金額はサーバ側のみ。画面は rollup 読取専用 |
| 保持 | `system-spec/database.md` | Turso 無期限保持。R2 archive なし。使用量監視 |
| 画面 | `system-spec/frontend.md` / `ui-ux.md` | S09/S16 は rollup 由来。user 次元金額は salary 権限者のみ |
| 試算 | ADR / `packages/estimation` | package 境界 owner は foundation。metrics domain は本 feature |

## 3. 反映先

- `system-spec/`: backend / database / frontend / ui-ux / security / maintenance-ops / `spec-state.json`
- `docs/features/metrics-build-pipeline-mvp-addendum.md`: MVP 実装索引
- `architecture/`: data / backend / frontend への差分追記
- `features/`: macro feature の MVP 着地注記
- `tasks/`: P01〜P13 projection を package digest `85adf596…` へ同期
- `docs/features/feat-metrics-tracking/`: ADR、本受領書、最終レビュー

## 4. MVP 意図的ギャップ（後続）

- 正規 route は S09=`/dashboard`・S16=`/tracking`。本 MVP の実装・nav は当面
  `/metrics` と `/metrics/usage` を実体とする。canonical alias / redirect は後続 task。
- S17 個別ダッシュボード画面は `feat-user-org-admin` 管轄。本 feature は user 次元 rollup API まで。
- 本番 deploy / smoke / Turso 使用量監視の運用証跡は P13 相当として残課題。

## 5. 500 行ルール

手書き実装・テストは 500 行以下。超過した単一正本（`system-spec/spec-state.json`、
`.dev-graph/state/graph.json`、migration snapshot）は機械生成のため分割しない。

## 6. 完了境界

本受領書は **MVP 実装 + 仕様反映** の完了を示す。
Beads epic `HarnessHub-lm7` と子 P03〜P13 の durable close は draft PR merge と
default branch reconciliation 後に行う。
