# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 顧客管理者が統制と安全性 (G2) を自律運用できるよう、承認キュー・RBAC 拡張・監査ログ閲覧を提供する
- **到達状態 (Goal)**: workspace-admin が承認/差し戻し/監査を Hub Web で完結でき、統制作業の提供者依存が解消された状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-WORKSPACE-GOVERNANCE-P01`、`SYS-WORKSPACE-GOVERNANCE-P02`、`SYS-WORKSPACE-GOVERNANCE-P03`、`SYS-WORKSPACE-GOVERNANCE-P04`、`SYS-WORKSPACE-GOVERNANCE-P05`、`SYS-WORKSPACE-GOVERNANCE-P06`、`SYS-WORKSPACE-GOVERNANCE-P07`、`SYS-WORKSPACE-GOVERNANCE-P08`、`SYS-WORKSPACE-GOVERNANCE-P09`、`SYS-WORKSPACE-GOVERNANCE-P10`、`SYS-WORKSPACE-GOVERNANCE-P11`、`SYS-WORKSPACE-GOVERNANCE-P12`、`SYS-WORKSPACE-GOVERNANCE-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-WORKSPACE-GOVERNANCE-P01` 要件ベースライン確定 — 承認キュー・RBAC細分化・監査ログ閲覧・統制ポリシー設定の要件確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-WORKSPACE-GOVERNANCE-P02` アーキテクチャ設計 — governance_policies拡張ポイント・publish/:id/reject契約・RBAC権限マトリクスUI・監査ログUI・追加監査actionの決定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-WORKSPACE-GOVERNANCE-P03` 独立設計レビュー — governance_policies拡張点・reject契約・RBAC/監査UI・feature境界遵守の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-WORKSPACE-GOVERNANCE-P04` テストファースト設計 — policy遮断・監査テナントスコープ検索・RBAC変更監査記録・T-1/T-1b/T-1c/T-6適用のテスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-WORKSPACE-GOVERNANCE-P05` 実装 — governance_policiesテーブル・publish/:id/reject API・RBAC権限マトリクスUI(S04拡張)・承認キューUI(S05)・監査ログUI(S06)の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-WORKSPACE-GOVERNANCE-P06` テスト実行 — policy遮断・監査テナントスコープ検索・RBAC変更監査記録・T-1/T-1b/T-1c/T-6テストの実行

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-WORKSPACE-GOVERNANCE-P07` 受入 — 承認フローpolicy遮断・監査ログテナントスコープ検索・RBAC変更監査記録の3件受入判定

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-WORKSPACE-GOVERNANCE-P08` リファクタリング/マイグレーション — governance_policies新設テーブル・audit_events追加action(governance.policy_change)の既存基盤互換移行

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-WORKSPACE-GOVERNANCE-P09` 品質保証 — ASVS L2アクセス制御/ログ到達目標・T-1/T-1b/T-1c/T-6・deny-by-default認可の横断確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-WORKSPACE-GOVERNANCE-P10` 最終レビュー — goal-spec 6件quality_constraints・3件acceptanceの全件最終合否判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-WORKSPACE-GOVERNANCE-P11` エビデンス集約 — P04〜P10成果物の証跡パッケージ化

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-WORKSPACE-GOVERNANCE-P12` ドキュメント/運用 — workspace-admin向け承認/監査/RBAC設定 運用手順書の整備

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-WORKSPACE-GOVERNANCE-P13` リリース/デプロイ — governance_policiesマイグレーション適用順序・wranglerロールアウト・rollback手順

