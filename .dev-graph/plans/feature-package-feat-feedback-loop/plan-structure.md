# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**:
  - 利用者の改善要望/レビュー依頼/バグ報告を CLI + Web (S14) の 2 経路で受け付け (B6)
  - D5 pull 型 AI キューで解析・修正案生成し
  - 修正版の publish → update 通知まで閉じる改善ループ (G5/I12, J5) を確立する
- **到達状態 (Goal)**: フィードバックが status 遷移 (未対応→対応中→対応済み) で管理され、AI 対応結果 (aiResponse) が S14 に反映され、修正版が publish パイプライン経由で利用者へ届く状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-FEEDBACK-LOOP-P01`、`SYS-FEEDBACK-LOOP-P02`、`SYS-FEEDBACK-LOOP-P03`、`SYS-FEEDBACK-LOOP-P04`、`SYS-FEEDBACK-LOOP-P05`、`SYS-FEEDBACK-LOOP-P06`、`SYS-FEEDBACK-LOOP-P07`、`SYS-FEEDBACK-LOOP-P08`、`SYS-FEEDBACK-LOOP-P09`、`SYS-FEEDBACK-LOOP-P10`、`SYS-FEEDBACK-LOOP-P11`、`SYS-FEEDBACK-LOOP-P12`、`SYS-FEEDBACK-LOOP-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-FEEDBACK-LOOP-P01` 改善要望フィードバックループ要件ベースライン確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-FEEDBACK-LOOP-P02` アーキテクチャ設計 — Feedback スキーマ・S14 画面構成・feedback/AI キュー API 契約・通知/publish 接続設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-FEEDBACK-LOOP-P03` 独立設計レビュー — Feedback スキーマ・認可・AI キュー接続・通知/publish 接続の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-FEEDBACK-LOOP-P04` テストファースト設計 — 2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離のテストスタブ作成

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-FEEDBACK-LOOP-P05` 実装 — S14 一覧+フォーム・feedbacks スキーマ・feedback API・AI キュー連携・通知/publish 接続の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-FEEDBACK-LOOP-P06` テスト実行 — 単体/結合/2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離テストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-FEEDBACK-LOOP-P07` 受入 — goal-spec acceptance 3 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-FEEDBACK-LOOP-P08` リファクタリング/マイグレーション — feedbacks テーブルマイグレーション生成と後方互換性確認

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-FEEDBACK-LOOP-P09` 品質保証 — CI 品質ゲート (axe/tenant 分離/認可/AI キュー lease/監査) の確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-FEEDBACK-LOOP-P10` 最終独立レビュー — quality_constraints 8 件の充足判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-FEEDBACK-LOOP-P11` エビデンス収集 — 再現可能な検証証跡の集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-FEEDBACK-LOOP-P12` ドキュメント/運用 — S14 運用手順・AI キュー運用・監査/通知運用の runbook 作成

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-FEEDBACK-LOOP-P13` リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

