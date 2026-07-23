# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: qa-070 (appr-008 承認) で確定したドキュメント規約 2 件 — 仕組みとナレッジのオン・オフ分離・1 文書 300 行上限 — を機械的に強制する検査群を実装し、G1 (仕組みの持ち出しによる配布・運用効率)・G4 (fail-closed 品質ゲート)・G5 (ドキュメント管理の持続性) を支える
- **到達状態 (Goal)**: 3 検査 (300 行 lint・仕組み-ナレッジ境界検査・移植導線 opt-in 検査) が CI で fail-closed に動作し、既存超過 6 文書の allowlist は縮小のみ許す ratchet で管理され、再実行しても同じ結果 (冪等) になる状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-DOC-GOVERNANCE-PORTABILITY-P01`、`SYS-DOC-GOVERNANCE-PORTABILITY-P02`、`SYS-DOC-GOVERNANCE-PORTABILITY-P03`、`SYS-DOC-GOVERNANCE-PORTABILITY-P04`、`SYS-DOC-GOVERNANCE-PORTABILITY-P05`、`SYS-DOC-GOVERNANCE-PORTABILITY-P06`、`SYS-DOC-GOVERNANCE-PORTABILITY-P07`、`SYS-DOC-GOVERNANCE-PORTABILITY-P08`、`SYS-DOC-GOVERNANCE-PORTABILITY-P09`、`SYS-DOC-GOVERNANCE-PORTABILITY-P10`、`SYS-DOC-GOVERNANCE-PORTABILITY-P11`、`SYS-DOC-GOVERNANCE-PORTABILITY-P12`、`SYS-DOC-GOVERNANCE-PORTABILITY-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P01` 要件ベースライン確定 — qa-070 ドキュメント規約 2 件・3 検査スコープの baseline 文書化

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P02` 検査設計 — 300 行 lint・仕組み-ナレッジ境界検査・移植 opt-in 検査の入出力契約確定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P03` 設計レビュー — fail-closed・冪等・digest 不変・境界非複製との整合検証

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P04` テスト設計 — 3 検査の MUST_DETECT/MUST_PASS fixture とテスト ID 確定

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P05` 実装 — lint script 3 本・allowlist schema・回帰テスト・governance-check.yml 配線

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P06` テスト実行 — 回帰テスト全件と 3 検査の実測記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P07` 受入判定 — 4 acceptance の突合と未達の差し戻し

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P08` 移行 — 既存超過 6 文書の allowlist baseline 遡及付与 (冪等・縮小のみ許す ratchet 初期化)

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P09` 品質保証 — fail-closed 実効性と境界突破 (迂回経路) の悪性ケース実測

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P10` 最終レビュー — 全 phase 成果の横断整合確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P11` 証跡固定 — 実測ログと成果物 digest の evidence manifest 化

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P12` 運用文書化 — allowlist ratchet 運用手順と誤検出トリアージ手順

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-DOC-GOVERNANCE-PORTABILITY-P13` リリース — main 反映と 3 検査の CI fail-closed 実効性の実証

