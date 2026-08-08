# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**:
  - 本番で動いているビルドが repository のどの commit に対応するかを知る手段が無いため、『コードは直っている』と『本番が直っている』を区別できず、1 回の GET で決まる事実の確定に 10 ラウンド以上を要した。
  - この観測不能状態を解消する。
  - 確定仕様の根拠は qa-198 (原因の確定) と qa-199 (是正範囲) である。
- **到達状態 (Goal)**: 稼働中の成果物から対応 commit を認証なしで確認でき、稼働ビルドが既定 branch の HEAD より古い状態が続くことを CI が検出する状態にする。

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-BUILD-IDENTITY-P01`、`SYS-BUILD-IDENTITY-P02`、`SYS-BUILD-IDENTITY-P03`、`SYS-BUILD-IDENTITY-P04`、`SYS-BUILD-IDENTITY-P05`、`SYS-BUILD-IDENTITY-P06`、`SYS-BUILD-IDENTITY-P07`、`SYS-BUILD-IDENTITY-P08`、`SYS-BUILD-IDENTITY-P09`、`SYS-BUILD-IDENTITY-P10`、`SYS-BUILD-IDENTITY-P11`、`SYS-BUILD-IDENTITY-P12`、`SYS-BUILD-IDENTITY-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-BUILD-IDENTITY-P01` 要件ベースライン確定 — 稼働ビルドの素性確認 (V6) と deploy 反映鮮度検出 (V7) の要件確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-BUILD-IDENTITY-P02` アーキテクチャ決定 — commit 識別子の埋込経路・公開読出経路・鮮度判定の所在

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-BUILD-IDENTITY-P03` 設計レビュー — 情報露出・deploy 直後の誤検出・CI 依存の 3 リスク検証

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-BUILD-IDENTITY-P04` テスト設計 — 埋込・公開読出・鮮度検出の実行可能テスト定義

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-BUILD-IDENTITY-P05` 実装 — build 時の commit 識別子埋込・認証なし読出経路・鮮度検査 script

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-BUILD-IDENTITY-P06` テスト実行 — P04 のテスト ID 実行と結果証跡の収集

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-BUILD-IDENTITY-P07` 受入判定 — goal-spec acceptance 5 件の実測証跡による判定

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-BUILD-IDENTITY-P08` リファクタリングと移行 — しきい値の単一定数化と既存 check 系列への整列

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-BUILD-IDENTITY-P09` 品質保証 — 露出範囲の非退行と検査の発火性の固定

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-BUILD-IDENTITY-P10` 最終レビュー — 実行済み証跡のみによるリリース可否判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-BUILD-IDENTITY-P11` 証跡固定 — source digest と再実行コマンドの保存

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-BUILD-IDENTITY-P12` ドキュメントと運用 — 稼働ビルドの確認手順と鮮度警告時の対応手順

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-BUILD-IDENTITY-P13` リリース判定と確定仕様・アーキテクチャへの書き戻し

