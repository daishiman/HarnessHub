# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **本質的な問題・課題**: dev-graph/beads (bd) のタスク優先度選定が品質・本質・再現性を先回りする基準に寄り、いちばん作りたい機能 (MVP) から離れて同じ基盤タスクを繰り返す停滞が起きている (qa-069)。判断軸を「目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの」の3軸へ組み替え、まず作って使って課題をあぶり出す build-use-learn の回転を取り戻す。
- **目的 (何をするか)**:
  - dev-graph/beads (bd) のタスク優先度選定が品質・本質・再現性を先回りする基準に寄り
  - いちばん作りたい機能 (MVP) から離れて同じ基盤タスクを繰り返す停滞が起きている (qa-069)判断軸を「目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの」の3軸へ組み替え
  - まず作って使って課題をあぶり出す build-use-learn の回転を取り戻す
- **背景・前提**:
  - dev-graph/beads (bd) のタスク優先度選定が品質・本質・再現性を先回りする基準に寄り
  - いちばん作りたい機能 (MVP) から離れて同じ基盤タスクを繰り返す停滞が起きている (qa-069)判断軸を「目的=何のために作るか / 背景=どういう経緯か / MVP=今必要な動くもの」の3軸へ組み替え
  - まず作って使って課題をあぶり出す build-use-learn の回転を取り戻す
- **到達状態 (Goal)**: next/schedule と bd ready の着手候補選定が MVP 適合 (今必要な動くものへの直結度) を第一ソートキーとして動作し、品質・再現性強化系タスクは MVP 成立後へ繰り延べられ、同一入力での選定結果が冪等に再現される状態 (既確定 CI/CD・quality gate 要件 qa-066 は維持)

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-MVP-FIRST-SCHEDULING-P01`、`SYS-MVP-FIRST-SCHEDULING-P02`、`SYS-MVP-FIRST-SCHEDULING-P03`、`SYS-MVP-FIRST-SCHEDULING-P04`、`SYS-MVP-FIRST-SCHEDULING-P05`、`SYS-MVP-FIRST-SCHEDULING-P06`、`SYS-MVP-FIRST-SCHEDULING-P07`、`SYS-MVP-FIRST-SCHEDULING-P08`、`SYS-MVP-FIRST-SCHEDULING-P09`、`SYS-MVP-FIRST-SCHEDULING-P10`、`SYS-MVP-FIRST-SCHEDULING-P11`、`SYS-MVP-FIRST-SCHEDULING-P12`、`SYS-MVP-FIRST-SCHEDULING-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-MVP-FIRST-SCHEDULING-P01` 要件ベースライン確定 — MVP ファースト化 3 軸判断基準 (目的・背景・MVP) の baseline 文書化

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-MVP-FIRST-SCHEDULING-P02` 設計 — MVP 適合軸メタデータ・schedule/next ソートキー・bd-bridge ready 整合・繰り延べ規則・選定 receipt の決定論設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-MVP-FIRST-SCHEDULING-P03` 設計レビュー — 単一 writer (schedule-graph.py)・後方互換・qa-066 非退行との整合検証

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-MVP-FIRST-SCHEDULING-P04` テスト設計 — MVP-first ソート・冪等性・後方互換・receipt 出力の回帰テスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-MVP-FIRST-SCHEDULING-P05` 実装 — MVP 適合軸メタデータ・schedule-graph.py ソートキー・bd-bridge ready 整合・選定 receipt 出力

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-MVP-FIRST-SCHEDULING-P06` テスト実行 — 回帰テスト全件と ready/next 実測の記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-MVP-FIRST-SCHEDULING-P07` 受入判定 — goal-spec acceptance 5 件の突合と未達の差し戻し

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-MVP-FIRST-SCHEDULING-P08` 移行 — 既存 task 資産一括書き換えを行わないことの互換性確認 (fallback 動作の実測記録)

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-MVP-FIRST-SCHEDULING-P09` 品質保証 — fail-closed 実効性の悪性ケース実測 (qa-066 非退行含む)

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-MVP-FIRST-SCHEDULING-P10` 最終レビュー — 全 phase 成果の横断整合確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-MVP-FIRST-SCHEDULING-P11` 証跡固定 — 実測ログと digest の evidence manifest 化

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-MVP-FIRST-SCHEDULING-P12` 運用文書化 — MVP 適合軸設定手順と選定 receipt の運用手順

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-MVP-FIRST-SCHEDULING-P13` リリース — main 反映と MVP-first 選定の実証・spec/architecture writeback

