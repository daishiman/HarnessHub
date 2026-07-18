# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する
- **到達状態 (Goal)**: ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-DOCS-CMS-P01`、`SYS-DOCS-CMS-P02`、`SYS-DOCS-CMS-P03`、`SYS-DOCS-CMS-P04`、`SYS-DOCS-CMS-P05`、`SYS-DOCS-CMS-P06`、`SYS-DOCS-CMS-P07`、`SYS-DOCS-CMS-P08`、`SYS-DOCS-CMS-P09`、`SYS-DOCS-CMS-P10`、`SYS-DOCS-CMS-P11`、`SYS-DOCS-CMS-P12`、`SYS-DOCS-CMS-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-DOCS-CMS-P01` ドキュメント CMS 要件ベースライン確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-DOCS-CMS-P02` アーキテクチャ設計 — Doc スキーマ・S15 画面構成・B7 API 契約・AI 下書きキュー契約の設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-DOCS-CMS-P03` 独立設計レビュー — Doc スキーマ・S15 認可・AI キュー契約・Markdown sanitize の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-DOCS-CMS-P04` テストファースト設計 — tenant 分離/admin 限定編集/Markdown sanitize/AI キュー認可/監査記録のテストスタブ作成

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-DOCS-CMS-P05` 実装 — S15 一覧/閲覧/編集・Doc スキーマ・B7 API・AI 下書きキュー・監査 event の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-DOCS-CMS-P06` テスト実行 — 単体/結合/tenant 分離/認可/sanitize テストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-DOCS-CMS-P07` 受入 — goal-spec acceptance 3 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-DOCS-CMS-P08` リファクタリング/マイグレーション — Doc テーブルマイグレーション生成と後方互換性確認

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-DOCS-CMS-P09` 品質保証 — CI 品質ゲート (axe/tenant 分離/AI キュー認可/XSS sanitize) の確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-DOCS-CMS-P10` 最終独立レビュー — quality_constraints 8 件の充足判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-DOCS-CMS-P11` エビデンス収集 — 再現可能な検証証跡の集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-DOCS-CMS-P12` ドキュメント/運用 — S15 運用手順・AI キュー滞留監視・監査運用の runbook 作成

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-DOCS-CMS-P13` リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

