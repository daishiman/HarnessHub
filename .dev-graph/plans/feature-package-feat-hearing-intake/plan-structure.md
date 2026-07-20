# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 業務課題から業務ツールが生まれる入口として、S10 の 4 ステップウィザード (削減試算付き)・受付番号採番・D5 pull 型 AI キューによるヒアリングシート生成・S11/S12 のシート管理を提供する (I11, J4)
- **到達状態 (Goal)**: 非エンジニアがウィザードで課題を登録すると受付番号が発番され、AI キュー (D5) 経由で生成されたシートが S11/S12 に反映され status 管理 (admin) できる状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-HEARING-INTAKE-P01`、`SYS-HEARING-INTAKE-P02`、`SYS-HEARING-INTAKE-P03`、`SYS-HEARING-INTAKE-P04`、`SYS-HEARING-INTAKE-P05`、`SYS-HEARING-INTAKE-P06`、`SYS-HEARING-INTAKE-P07`、`SYS-HEARING-INTAKE-P08`、`SYS-HEARING-INTAKE-P09`、`SYS-HEARING-INTAKE-P10`、`SYS-HEARING-INTAKE-P11`、`SYS-HEARING-INTAKE-P12`、`SYS-HEARING-INTAKE-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-HEARING-INTAKE-P01` ヒアリング intake 要件ベースライン確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-HEARING-INTAKE-P02` アーキテクチャ設計 — HearingSheet/FormData/AiJob(hearing kind) スキーマ・受付番号採番・AI キュー API 契約の設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-HEARING-INTAKE-P03` 独立設計レビュー — HearingSheet/FormData/AiJob(hearing kind) 設計・AI キュー認可・Markdown sanitize の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-HEARING-INTAKE-P04` テストファースト設計 — 受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y のテストスタブ作成

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-HEARING-INTAKE-P05` 実装 — S10 ウィザード/S11-S12 シート管理/受付番号採番/AI キュー API/Markdown sanitize の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-HEARING-INTAKE-P06` テスト実行 — 単体/結合/認可/a11y テストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-HEARING-INTAKE-P07` 受入 — goal-spec acceptance 3 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-HEARING-INTAKE-P08` リファクタリング/マイグレーション — HearingSheet/FormData/AiJob(hearing kind) 新規テーブルの migration 生成と後方互換性確認

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-HEARING-INTAKE-P09` 品質保証 — CI 品質ゲート (axe/Tenant 分離/AI キュー認可) 適合確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-HEARING-INTAKE-P10` 最終独立レビュー — feature 全体の confirmation 前最終点検

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-HEARING-INTAKE-P11` エビデンス収集 — acceptance 根拠・テスト結果・品質保証の証跡集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-HEARING-INTAKE-P12` ドキュメント/運用 — S10-S12 運用手順・AI キュー滞留監視・受付番号運用のドキュメント化

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-HEARING-INTAKE-P13` リリース/デプロイ — S10-S12 の Cloudflare Workers 本番反映とロールアウト確認

