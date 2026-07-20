# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: C4 改訂 (qa-045-048, appr-007) で保持可能となった顧客業務ナレッジ・harness 実行入出力データを、R2 + テナント別封筒暗号化で保管し、即時完全削除を保証する独立した価値提供単位
- **到達状態 (Goal)**: テナント業務データの upload / 取得 / 即時完全削除 API と R2 使用量監視を提供し、C4 の非保持境界 (顧客業務システム接続 credential と WebApp runtime) を維持したまま業務データのみを安全に扱える状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-TENANT-DATA-RETENTION-P01`、`SYS-TENANT-DATA-RETENTION-P02`、`SYS-TENANT-DATA-RETENTION-P03`、`SYS-TENANT-DATA-RETENTION-P04`、`SYS-TENANT-DATA-RETENTION-P05`、`SYS-TENANT-DATA-RETENTION-P06`、`SYS-TENANT-DATA-RETENTION-P07`、`SYS-TENANT-DATA-RETENTION-P08`、`SYS-TENANT-DATA-RETENTION-P09`、`SYS-TENANT-DATA-RETENTION-P10`、`SYS-TENANT-DATA-RETENTION-P11`、`SYS-TENANT-DATA-RETENTION-P12`、`SYS-TENANT-DATA-RETENTION-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-TENANT-DATA-RETENTION-P01` 要件ベースライン確定 — tenant_data_objects CRUD API・R2封筒暗号化保管・即時完全削除・R2使用量監視の要件確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-TENANT-DATA-RETENTION-P02` アーキテクチャ設計 — encryption_keys.purpose拡張・R2 tenant prefix分離・API詳細設計・R2使用量監視cron拡張・削除完全性テスト採番の決定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-TENANT-DATA-RETENTION-P03` 独立設計レビュー — encryption_keys拡張・R2 prefix分離・API契約・削除完全性テスト採番の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-TENANT-DATA-RETENTION-P04` テストファースト設計 — テナント分離・削除完全性・暗号化検証・R2使用量監視アラートのテスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-TENANT-DATA-RETENTION-P05` 実装 — tenant_data_objects API・R2封筒暗号化保管/取得/即時完全削除・R2使用量監視cron拡張の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-TENANT-DATA-RETENTION-P06` テスト実行 — テナント分離・削除完全性・暗号化検証・R2使用量監視アラートテストの実行

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-TENANT-DATA-RETENTION-P07` 受入 — テナント分離・削除完全性・暗号化検証の3件受入判定

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-TENANT-DATA-RETENTION-P08` リファクタリング/マイグレーション — encryption_keys.purpose=tenant_data追加DEK seed・R2バケット/prefix新設の既存基盤互換移行

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-TENANT-DATA-RETENTION-P09` 品質・セキュリティ・運用保証 — テナント越境読取防止(T14)・削除不完全対策(T15)・R2使用量監視運用確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-TENANT-DATA-RETENTION-P10` 独立最終レビュー — quality_constraints 6件・acceptance 3件の最終確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-TENANT-DATA-RETENTION-P11` 再現可能な証跡 — P06/P07/P09/P10の証跡集約と再現手順確立

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-TENANT-DATA-RETENTION-P12` 文書化・runbook・引き継ぎ — 業務データ保管/取得/削除手順・R2使用量監視runbook・鍵ローテーションrunbook拡張の文書化

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-TENANT-DATA-RETENTION-P13` リリース/デプロイ — encryption_keys DEK seed migration適用順序・wranglerロールアウト・rollback手順

