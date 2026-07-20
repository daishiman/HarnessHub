# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: Tenant→Workspace→Project→TargetChannel→Release(immutable) のドメインモデルを Drizzle スキーマとして確立し、D1 退避経路 (D2 ヘッジ) を保つ接続層を構築する
- **到達状態 (Goal)**: 全エンティティの CRUD が接続層越しに動作し、R2 immutable PackageRegistry と日次 export が稼働する状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-DOMAIN-MODEL-DB-P01`、`SYS-DOMAIN-MODEL-DB-P02`、`SYS-DOMAIN-MODEL-DB-P03`、`SYS-DOMAIN-MODEL-DB-P04`、`SYS-DOMAIN-MODEL-DB-P05`、`SYS-DOMAIN-MODEL-DB-P06`、`SYS-DOMAIN-MODEL-DB-P07`、`SYS-DOMAIN-MODEL-DB-P08`、`SYS-DOMAIN-MODEL-DB-P09`、`SYS-DOMAIN-MODEL-DB-P10`、`SYS-DOMAIN-MODEL-DB-P11`、`SYS-DOMAIN-MODEL-DB-P12`、`SYS-DOMAIN-MODEL-DB-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-DOMAIN-MODEL-DB-P01` ドメインモデル & control-plane DB (Turso + Drizzle + R2 registry) 要件ベースライン確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-DOMAIN-MODEL-DB-P02` アーキテクチャ設計 — コアドメイン 18 テーブル Drizzle スキーマ・接続層隔離・User 基底テーブル owner 確定・R2 registry 設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-DOMAIN-MODEL-DB-P03` 独立設計レビュー — スキーマ・接続層隔離・User 基底テーブル owner 判断の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-DOMAIN-MODEL-DB-P04` テストファースト設計 — D1 互換性・release immutable・tenant 分離・ULID/epoch・R2 content-addressing・backup/restore のテスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-DOMAIN-MODEL-DB-P05` 実装 — コアドメイン Drizzle スキーマ・接続層 (libSQL/D1)・リポジトリ層・R2 content-addressed registry の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-DOMAIN-MODEL-DB-P06` テスト実行 — D1 互換性・release immutable・tenant 分離・R2 registry・backup/restore テストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-DOMAIN-MODEL-DB-P07` 受入 — goal-spec acceptance 3 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-DOMAIN-MODEL-DB-P08` リファクタリング/マイグレーション — 初回ベースライン migration 生成と単一系統確立

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-DOMAIN-MODEL-DB-P09` 品質保証 — CI 品質ゲート (tenant 分離・接続層隔離・secret scan・schema-driven 分離テスト網羅) の確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-DOMAIN-MODEL-DB-P10` 最終独立レビュー — quality_constraints 9 件の充足判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-DOMAIN-MODEL-DB-P11` エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-DOMAIN-MODEL-DB-P12` ドキュメント/運用 — 日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーション運用手順の runbook 作成

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-DOMAIN-MODEL-DB-P13` リリース/デプロイ — 本番 Turso/D1・R2 registry 反映とスモークテスト

