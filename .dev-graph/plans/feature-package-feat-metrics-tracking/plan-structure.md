# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 導入ハーネスの利用実態と削減効果 (G5) を可視化するため、実行ログ ingest (B2: 短命 token・冪等キー・回数のみ)・週次 rollup (B3: Workers cron)・試算エンジン共通層 (サーバ側係数換算) と S09/S16 ダッシュボードを提供する (I10)
- **到達状態 (Goal)**: 実行ログがサーバ側で信頼可能に集計され (SEC5)、S09 ダッシュボード・S16 利用/削減効果・S17 個別集計が週次 rollup から描画される状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-METRICS-TRACKING-P01`、`SYS-METRICS-TRACKING-P02`、`SYS-METRICS-TRACKING-P03`、`SYS-METRICS-TRACKING-P04`、`SYS-METRICS-TRACKING-P05`、`SYS-METRICS-TRACKING-P06`、`SYS-METRICS-TRACKING-P07`、`SYS-METRICS-TRACKING-P08`、`SYS-METRICS-TRACKING-P09`、`SYS-METRICS-TRACKING-P10`、`SYS-METRICS-TRACKING-P11`、`SYS-METRICS-TRACKING-P12`、`SYS-METRICS-TRACKING-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-METRICS-TRACKING-P01` 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード) 要件ベースライン確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-METRICS-TRACKING-P02` アーキテクチャ設計 — MetricsEvent/MetricsRollup スキーマ・ingest/rollup/summary API 契約・試算エンジン owner 確定・S09/S16 画面構成設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-METRICS-TRACKING-P03` 独立設計レビュー — MetricsEvent/MetricsRollup スキーマ・認可設計・試算エンジン owner 決定・S09/S16 rollup 読取専用設計の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-METRICS-TRACKING-P04` テストファースト設計 — ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算・異常検知 cron のテスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-METRICS-TRACKING-P05` 実装 — MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-METRICS-TRACKING-P06` テスト実行 — ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算テストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-METRICS-TRACKING-P07` 受入 — goal-spec acceptance 3 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-METRICS-TRACKING-P08` リファクタリング/マイグレーション — metrics_events/metrics_rollups テーブルマイグレーション生成と後方互換性確認

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-METRICS-TRACKING-P09` 品質保証 — CI 品質ゲート (tenant 分離・認可・bundle 予算・監査・cron) の確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-METRICS-TRACKING-P10` 最終独立レビュー — quality_constraints 8 件の充足判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-METRICS-TRACKING-P11` エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-METRICS-TRACKING-P12` ドキュメント/運用 — ingest/rollup cron 運用・Turso 使用量監視・異常検知通知・S09/S16 運用手順の runbook 作成

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-METRICS-TRACKING-P13` リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

