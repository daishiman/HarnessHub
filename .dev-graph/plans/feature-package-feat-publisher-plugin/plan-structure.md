# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 作者が Claude Code / Codex から自己完結で publish できる操作面 (slash command + skill + スクリプト) を TypeScript で提供し、既存 Python 資産を挙動同値で移植する
- **到達状態 (Goal)**: 作者環境 (macOS/Windows) から初回 publish が 15 分以内 (O4/H8) に完了する状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-PUBLISHER-PLUGIN-P01`、`SYS-PUBLISHER-PLUGIN-P02`、`SYS-PUBLISHER-PLUGIN-P03`、`SYS-PUBLISHER-PLUGIN-P04`、`SYS-PUBLISHER-PLUGIN-P05`、`SYS-PUBLISHER-PLUGIN-P06`、`SYS-PUBLISHER-PLUGIN-P07`、`SYS-PUBLISHER-PLUGIN-P08`、`SYS-PUBLISHER-PLUGIN-P09`、`SYS-PUBLISHER-PLUGIN-P10`、`SYS-PUBLISHER-PLUGIN-P11`、`SYS-PUBLISHER-PLUGIN-P12`、`SYS-PUBLISHER-PLUGIN-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-PUBLISHER-PLUGIN-P01` 要件ベースライン確定 — TypeScript統一Publisher・Device Flow認証・検査ロジック共有・wranglerスクリプト実行・初回publish15分以内

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-PUBLISHER-PLUGIN-P02` アーキテクチャ設計 — apps/publisher (TS/Node/pnpm) 構成・packages/inspection消費境界・Device Flow token保存方式・wrangler実行方式の決定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-PUBLISHER-PLUGIN-P03` 独立設計レビュー — apps/publisher構成・packages/inspection消費境界・Device Flow token保存方式・wrangler実行方式の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-PUBLISHER-PLUGIN-P04` テストファースト設計 — quality_constraints 8件・acceptance 3件に対応する挙動同値性テスト・実機E2Eタイムボックス計測ケースの設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-PUBLISHER-PLUGIN-P05` 実装 — apps/publisher (CLI + Claude Code/Codex plugin)・Device Flow認証クライアント・wrangler実行ラッパーの実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-PUBLISHER-PLUGIN-P06` テスト実行 — 挙動同値性テスト・Device Flow単体テスト・macOS/Windows実機E2Eタイムボックス計測の実行

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-PUBLISHER-PLUGIN-P07` 受入 — macOS/Windows実機E2E成功・pre-checkとHub検査の判定同値・初回publish15分以内の受入判定

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-PUBLISHER-PLUGIN-P08` リファクタリング/マイグレーション — Python資産参照コメントの整理とpackages/inspection消費コードのクリーンアップ

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-PUBLISHER-PLUGIN-P09` 品質・セキュリティ・運用保証 — Device Flow数値契約遵守・OS資格情報域保存・scope最小権限・secret非保存の確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-PUBLISHER-PLUGIN-P10` 独立最終レビュー — quality_constraints 8件・acceptance 3件の最終確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-PUBLISHER-PLUGIN-P11` 再現可能な証跡 — P06/P07/P09/P10の証跡集約と再現手順の確立

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-PUBLISHER-PLUGIN-P12` 文書化・runbook・引き継ぎ — 作者向けpublish手順・token失効導線・障害時対応手順の確立

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-PUBLISHER-PLUGIN-P13` リリース/デプロイ — Claude Code/Codex marketplaceへのPublisher plugin配布登録依頼とStage1完了条件判定

