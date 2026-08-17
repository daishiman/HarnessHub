# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**:
  - 画面を開いても空か 1 件しか無いため、大量件数での折返し・長文での横溢れ・エラー時の描画といった崩れが最も出やすい状態が一度も観測されていない。
  - UI 崩れの自動検査に食わせる状態を先に用意しないと、データが薄いことによる「崩れていない」という偽の合格が出る。
  - 網羅的な確認用データを正本として整備し、全画面・全状態を人も機械も同じ入力で再現できるようにする。
- **到達状態 (Goal)**: ローカル DB へ投入するだけで、対象 28 route のそれぞれについて 空 / 1 件 / 大量 (50 件以上) / 長文 / エラー の5 状態と、各ドメインの enum ステータス全値が画面上で再現でき、同じ seed を二度流しても結果が一致する状態。

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-DEMO-COVERAGE-DATASET-P01`、`SYS-DEMO-COVERAGE-DATASET-P02`、`SYS-DEMO-COVERAGE-DATASET-P03`、`SYS-DEMO-COVERAGE-DATASET-P04`、`SYS-DEMO-COVERAGE-DATASET-P05`、`SYS-DEMO-COVERAGE-DATASET-P06`、`SYS-DEMO-COVERAGE-DATASET-P07`、`SYS-DEMO-COVERAGE-DATASET-P08`、`SYS-DEMO-COVERAGE-DATASET-P09`、`SYS-DEMO-COVERAGE-DATASET-P10`、`SYS-DEMO-COVERAGE-DATASET-P11`、`SYS-DEMO-COVERAGE-DATASET-P12`、`SYS-DEMO-COVERAGE-DATASET-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-DEMO-COVERAGE-DATASET-P01` 確認用データセット要件ベースライン確定 — 28 route × 5 状態 × enum 全値の対応表確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-DEMO-COVERAGE-DATASET-P02` アーキテクチャ設計 — route×状態対応表・fixture データモデル・冪等 seed 契約の設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-DEMO-COVERAGE-DATASET-P03` 独立設計レビュー — 対応表網羅性・冪等性設計・ローカル専用ガードの妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-DEMO-COVERAGE-DATASET-P04` テストファースト設計 — 網羅性検査・冪等性・ローカル専用ガードのテストスタブ作成

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-DEMO-COVERAGE-DATASET-P05` 実装 — seed-coverage スクリプトと route×状態対応表・網羅性検査スクリプトの実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-DEMO-COVERAGE-DATASET-P06` テスト実行 — 冪等性・網羅性・ローカル専用ガード拒否テストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-DEMO-COVERAGE-DATASET-P07` 受入 — goal-spec acceptance 7 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-DEMO-COVERAGE-DATASET-P08` リファクタリング/マイグレーション — 既存 schema 変更要否の確認 (N/A 判定)

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-DEMO-COVERAGE-DATASET-P09` 品質保証 — 網羅性/冪等性/ローカル専用ガードの品質ゲート確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-DEMO-COVERAGE-DATASET-P10` 最終独立レビュー — quality_constraints の充足判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-DEMO-COVERAGE-DATASET-P11` エビデンス収集 — 再現可能な検証証跡の集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-DEMO-COVERAGE-DATASET-P12` ドキュメント/運用 — route×状態到達手順の runbook 作成

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-DEMO-COVERAGE-DATASET-P13` リリース/デプロイ — ローカル専用ツールの close-out (実デプロイなし)

