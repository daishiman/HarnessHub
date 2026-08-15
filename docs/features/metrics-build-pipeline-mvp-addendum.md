---
status: confirmed
layer: specification-addendum
features: [feat-metrics-tracking, feat-build-pipeline-board]
beads_ids: [HarnessHub-lm7, HarnessHub-9am]
recorded_at: 2026-08-10
---

# Metrics Tracking / Build Pipeline Board MVP 追補仕様

本追補は Studio 拡張 2 feature の **MVP 実装索引** である。詳細契約の正本は
`system-spec/` 各章と各 feature の ADR に置き、ここへ複製しない。

## 1. 機能の到達範囲（MVP）

### 1.1 feat-metrics-tracking（`HarnessHub-lm7`）

- 実行ログ ingest: 短命 token・冪等キー・回数のみ
- 日次/週次 rollup cron とサーバ側金額換算
- S09 ダッシュボード / S16 利用・削減効果（rollup 読取専用）
- 試算 formula は `packages/estimation` の単一実装を消費

### 1.2 feat-build-pipeline-board（`HarnessHub-9am`）

- Build の 7 工程ボード（S13）
- 工程遷移は admin 限定・隣接のみ・監査付き
- 公開工程は既存 PublishRequest を正本として参照（二重状態機械なし）

## 2. 共有 migration 方針

- 既存 `packages/db/migrations/0008_metrics-tracking-and-build-stage-events.sql` は
  **immutable lineage** として維持する（rename / 分割 / 再採番しない）
- 今後の schema delta と release unit は Metrics と Build で分離する

## 3. MVP route 面

| 画面 | 正規（仕様） | 実装 path (2026-08-16) |
|---|---|---|
| S09 | `/dashboard` | `/dashboard`（旧 `/metrics` は 308） |
| S13 | `/pipeline` | `/builds`（canonical alias は後続） |
| S16 | `/tracking` | `/tracking`（旧 `/metrics/usage` は 308） |

## 4. 受領書

- [metrics 仕様反映受領書](./feat-metrics-tracking/mvp-implementation-spec-reflection-receipt.md)
- [build-pipeline 仕様反映受領書](./feat-build-pipeline-board/mvp-implementation-spec-reflection-receipt.md)

## 5. 上位正本への trace

- 要件: `system-spec/00-requirements-definition.md` I10 ほか
- データ: `system-spec/database.md`
- API: `system-spec/backend.md`
- UI: `system-spec/frontend.md` / `ui-ux.md`
- アーキテクチャ差分: `architecture/harness-hub-{data,backend,frontend}.md`
