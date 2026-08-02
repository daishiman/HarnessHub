# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**:
  - ログインは成功するのに業務画面 (/sheets /catalog 系) が 403 missing_tenant_scope で開けない実装未結線を
  - 認可の判定順と deny-by-default を変えずに解消する原因はサインイン後の戻り先が / 固定であること
  - / が稼働確認しか表示しないこと
  - 通常のブラウザ遷移では認可が要求するテナント情報が付与されないことの 3 点であり
  - 利用者の操作誤りではない
- **到達状態 (Goal)**: scope の入力系統 2 系統 (明示ヘッダー / session の active tenant-workspace) とサインイン後の着地先解決が結線され、業務画面 6 種 (/sheets /sheets/new /sheets/{id} /catalog /catalog/releases /catalog/{projectId}) へ通常のブラウザ操作で到達できる状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-POST-SIGNIN-SCOPE-P01`、`SYS-POST-SIGNIN-SCOPE-P02`、`SYS-POST-SIGNIN-SCOPE-P03`、`SYS-POST-SIGNIN-SCOPE-P04`、`SYS-POST-SIGNIN-SCOPE-P05`、`SYS-POST-SIGNIN-SCOPE-P06`、`SYS-POST-SIGNIN-SCOPE-P07`、`SYS-POST-SIGNIN-SCOPE-P08`、`SYS-POST-SIGNIN-SCOPE-P09`、`SYS-POST-SIGNIN-SCOPE-P10`、`SYS-POST-SIGNIN-SCOPE-P11`、`SYS-POST-SIGNIN-SCOPE-P12`、`SYS-POST-SIGNIN-SCOPE-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-POST-SIGNIN-SCOPE-P01` 要件ベースライン確定 — scope 解決 2 系統・サインイン後着地先解決・open redirect 防止・deny-by-default 非退行の要件確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-POST-SIGNIN-SCOPE-P02` アーキテクチャ決定 — scope 解決の単一合流点・session への active workspace 束縛・着地先解決関数の配置と契約確定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-POST-SIGNIN-SCOPE-P03` 設計レビュー — 認可迂回路・open redirect・deny-by-default 退行の 3 リスクに対する設計妥当性審査

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-POST-SIGNIN-SCOPE-P04` テスト設計 — scope 解決の真理値表・着地先解決の入力分類・deny-by-default 非退行の実行可能テスト ID 定義

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-POST-SIGNIN-SCOPE-P05` 実装 — scope 解決への session 系統追加・active workspace 束縛・着地先解決関数の新設とサインイン後遷移の結線

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-POST-SIGNIN-SCOPE-P06` テスト実行 — P04 が定義したテスト ID の実行と結果証跡の収集

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-POST-SIGNIN-SCOPE-P07` 受入判定 — goal-spec acceptance 8 件の実測証跡による判定

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-POST-SIGNIN-SCOPE-P08` リファクタリングと移行 — scope 解決の二重実装排除と既定着地定数の集約

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-POST-SIGNIN-SCOPE-P09` 品質保証 — deny-by-default 非退行・open redirect 防止・所属検証の fail-closed 検査

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-POST-SIGNIN-SCOPE-P10` 最終レビュー — 実行済み証跡のみによるリリース可否判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-POST-SIGNIN-SCOPE-P11` 証跡固定 — source digest と再実行コマンドの保存

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-POST-SIGNIN-SCOPE-P12` ドキュメントと運用 — 画面遷移仕様の更新と scope 未解決時の運用手順整備

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-POST-SIGNIN-SCOPE-P13` リリースとデプロイ — 本番反映と確定仕様・アーキテクチャへの書き戻し
