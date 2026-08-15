# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 強調したい箇所が絵文字で表現されていると、意味が字形の見た目に依存し、配色仕様書 v2 の semantic color token とも結びつかない。強調の意味を、色・形・可視ラベルの 3 つで一貫して担わせる。
- **到達状態 (Goal)**: callout と一覧・カードの状態表現が packages/ui 所有の inline SVG アイコンと semantic color token だけで表され、絵文字の混入が lint で検出されて入らない状態にする。

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-EMPHASIS-ICONS-P01`、`SYS-EMPHASIS-ICONS-P02`、`SYS-EMPHASIS-ICONS-P03`、`SYS-EMPHASIS-ICONS-P04`、`SYS-EMPHASIS-ICONS-P05`、`SYS-EMPHASIS-ICONS-P06`、`SYS-EMPHASIS-ICONS-P07`、`SYS-EMPHASIS-ICONS-P08`、`SYS-EMPHASIS-ICONS-P09`、`SYS-EMPHASIS-ICONS-P10`、`SYS-EMPHASIS-ICONS-P11`、`SYS-EMPHASIS-ICONS-P12`、`SYS-EMPHASIS-ICONS-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-EMPHASIS-ICONS-P01` 要件ベースライン確定 — 絵文字禁止 semantic token/icon 表現の要件確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-EMPHASIS-ICONS-P02` アーキテクチャ設計 — 既存 callout/icon/token 実装の再利用範囲と絵文字 lint の配置・CI 組込み位置の決定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-EMPHASIS-ICONS-P03` 独立設計レビュー — lint 検査対象範囲・所有境界・token 適用範囲の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-EMPHASIS-ICONS-P04` テストファースト設計 — 絵文字 lint・callout 描き分け・可視ラベル併置・ライトモード背景のテストスタブ作成

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-EMPHASIS-ICONS-P05` 実装 — 絵文字 lint script・CI fail-closed 組込み・一覧/カード状態表現の token 統一・可視ラベル併置の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-EMPHASIS-ICONS-P06` テスト実行 — 単体/lint/a11y/コントラストテストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-EMPHASIS-ICONS-P07` 受入 — goal-spec acceptance 5 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-EMPHASIS-ICONS-P08` リファクタリング/マイグレーション — N/A (DB schema 変更なし)

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-EMPHASIS-ICONS-P09` 品質保証 — CI 品質ゲート (絵文字 lint fail-closed/axe/コントラスト/VRT) の確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-EMPHASIS-ICONS-P10` 最終独立レビュー — quality_constraints 5 件の充足判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-EMPHASIS-ICONS-P11` エビデンス収集 — 再現可能な検証証跡の集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-EMPHASIS-ICONS-P12` ドキュメント/運用 — アイコン追加手順・絵文字 lint 運用・所有境界の runbook 作成

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-EMPHASIS-ICONS-P13` リリース判定と確定仕様・アーキテクチャへの書き戻し

