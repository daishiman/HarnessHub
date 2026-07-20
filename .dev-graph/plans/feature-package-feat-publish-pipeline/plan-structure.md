# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 作者の自己完結 publish (G1) の中核として、PublishRequest 状態機械 (§7.2)・検査 pipeline (static validation/secret scan/policy)・stable pointer promote/rollback を実装する
- **到達状態 (Goal)**: publish → 検査 → Ready → Publishing → Published が atomic に完走し、失敗時は旧 stable が無傷で残る状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-PUBLISH-PIPELINE-P01`、`SYS-PUBLISH-PIPELINE-P02`、`SYS-PUBLISH-PIPELINE-P03`、`SYS-PUBLISH-PIPELINE-P04`、`SYS-PUBLISH-PIPELINE-P05`、`SYS-PUBLISH-PIPELINE-P06`、`SYS-PUBLISH-PIPELINE-P07`、`SYS-PUBLISH-PIPELINE-P08`、`SYS-PUBLISH-PIPELINE-P09`、`SYS-PUBLISH-PIPELINE-P10`、`SYS-PUBLISH-PIPELINE-P11`、`SYS-PUBLISH-PIPELINE-P12`、`SYS-PUBLISH-PIPELINE-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-PUBLISH-PIPELINE-P01` PublishRequest 状態機械・検査 pipeline・promote/rollback 要件ベースライン確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-PUBLISH-PIPELINE-P02` アーキテクチャ設計 — PublishRequest 状態機械実装方式・検査 pipeline 共有パッケージ・R2/監査/認可 consumer 境界確定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-PUBLISH-PIPELINE-P03` 独立設計レビュー — スキーマ owner 境界・状態機械設計・検査 pipeline 設計の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-PUBLISH-PIPELINE-P04` テストファースト設計 — 状態機械 property test・検査 pipeline 挙動同値テスト・直列化/監査テスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-PUBLISH-PIPELINE-P05` 実装 — PublishRequest API・状態機械・検査 pipeline (packages/inspection)・R2 upload・promote/rollback・監査 event 記録

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-PUBLISH-PIPELINE-P06` テスト実行 — 状態機械 property test・検査 pipeline 挙動同値テスト・直列化/監査テストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-PUBLISH-PIPELINE-P07` 受入 — goal-spec acceptance 3 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-PUBLISH-PIPELINE-P08` リファクタリング/マイグレーション — Python→TypeScript 検査 pipeline 移植の最終整理と CI 恒久検査確立

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-PUBLISH-PIPELINE-P09` 品質・セキュリティ・運用保証 — レート制限・Idempotency-Key・tenant 分離・secret scan CI ゲート確立

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-PUBLISH-PIPELINE-P10` 独立最終レビュー — quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断の独立確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-PUBLISH-PIPELINE-P11` 再現可能な証跡 — P06/P07/P09/P10 の証跡集約と再現手順の確立

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-PUBLISH-PIPELINE-P12` 文書化・runbook・引き継ぎ — orphan_candidate 処理・rollback 手順・ポーリング監視の運用手順確立

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-PUBLISH-PIPELINE-P13` リリース/デプロイ — apps/hub publish endpoint 本番デプロイと full smoke test

