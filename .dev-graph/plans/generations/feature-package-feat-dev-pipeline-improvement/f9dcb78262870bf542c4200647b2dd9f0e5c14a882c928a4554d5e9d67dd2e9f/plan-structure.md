# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 開発管理パイプライン (dev-graph 11 verb・beads・plugin-plans・eval-log・成果物管理) の運用実態調査 (qa-067) で検出された整合性・肥大化・消化状態の課題を解消し、G1/G4/G5 を支える開発基盤の健全性を回復する
- **到達状態 (Goal)**: qa-067 の 8 要件が実装され、解決済み事象の open 残置・eval-log 直下残置・未消化 findings が決定論検査で 0 件に収束し、再実行しても同じ結果になる状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-DEV-PIPELINE-IMPROVEMENT-P01`、`SYS-DEV-PIPELINE-IMPROVEMENT-P02`、`SYS-DEV-PIPELINE-IMPROVEMENT-P03`、`SYS-DEV-PIPELINE-IMPROVEMENT-P04`、`SYS-DEV-PIPELINE-IMPROVEMENT-P05`、`SYS-DEV-PIPELINE-IMPROVEMENT-P06`、`SYS-DEV-PIPELINE-IMPROVEMENT-P07`、`SYS-DEV-PIPELINE-IMPROVEMENT-P08`、`SYS-DEV-PIPELINE-IMPROVEMENT-P09`、`SYS-DEV-PIPELINE-IMPROVEMENT-P10`、`SYS-DEV-PIPELINE-IMPROVEMENT-P11`、`SYS-DEV-PIPELINE-IMPROVEMENT-P12`、`SYS-DEV-PIPELINE-IMPROVEMENT-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P01` 要件ベースライン確定 — 開発管理パイプライン改善 8 要件の baseline 文書化

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P02` 検査・規約・schema 設計 — open 残置検出 / eval-log 配置 lint / handoff disposition / close-gate 配線 / 棚卸し GC の決定論設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P03` 設計レビュー — 単一 writer・choke-point・sync authority との整合検証

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P04` テスト設計 — lint script 群と冪等 migration の回帰テスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P05` 実装 — lint script 3 本・handoff schema・eval-log 規約・task template 追記・CI 配線

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P06` テスト実行 — 回帰テスト全件と lint 実測の記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P07` 受入判定 — 8 acceptance の突合と未達の差し戻し

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P08` 移行 — eval-log 再配置と 94 findings への disposition 遡及付与 (冪等)

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P09` 品質保証 — fail-closed 実効性の悪性ケース実測

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P10` 最終レビュー — 全 phase 成果の横断整合確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P11` 証跡固定 — 実測ログと digest の evidence manifest 化

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P12` 運用文書化 — 棚卸し GC と close-loop の sync 運用組込み手順

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-DEV-PIPELINE-IMPROVEMENT-P13` リリース — main 反映と issue/graph/beads 3 表現の close-loop 実証

