# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend) を確立する (I14)
- **到達状態 (Goal)**: workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続された状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-USER-ORG-ADMIN-P01`、`SYS-USER-ORG-ADMIN-P02`、`SYS-USER-ORG-ADMIN-P03`、`SYS-USER-ORG-ADMIN-P04`、`SYS-USER-ORG-ADMIN-P05`、`SYS-USER-ORG-ADMIN-P06`、`SYS-USER-ORG-ADMIN-P07`、`SYS-USER-ORG-ADMIN-P08`、`SYS-USER-ORG-ADMIN-P09`、`SYS-USER-ORG-ADMIN-P10`、`SYS-USER-ORG-ADMIN-P11`、`SYS-USER-ORG-ADMIN-P12`、`SYS-USER-ORG-ADMIN-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-USER-ORG-ADMIN-P01` ユーザー管理・アカウント設定 要件ベースライン確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-USER-ORG-ADMIN-P02` アーキテクチャ設計 — User拡張/TenantCoefficient スキーマ・PII ガード/通知ディスパッチ接続点の設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-USER-ORG-ADMIN-P03` 独立設計レビュー — role統合・PIIガード・監査拡張の設計妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-USER-ORG-ADMIN-P04` テスト設計 — salary非露出分離テスト・監査記録テスト・axe a11yテストの設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-USER-ORG-ADMIN-P05` 実装 — S17/S18 画面, User拡張/TenantCoefficient API, PIIガード適用, 通知ディスパッチ接続

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-USER-ORG-ADMIN-P06` テスト実行 — 単体/結合/分離/a11yテストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-USER-ORG-ADMIN-P07` 受入 — goal-spec acceptance 3項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-USER-ORG-ADMIN-P08` リファクタリング/マイグレーション — 新規列・新規テーブルのmigration適用と後方互換性確認

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-USER-ORG-ADMIN-P09` 品質保証 — CI品質ゲート(axe/bundle/Tenant分離/検査pipeline)適合確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-USER-ORG-ADMIN-P10` 最終独立レビュー — feature全体のconfirmation前最終点検

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-USER-ORG-ADMIN-P11` エビデンス収集 — acceptance根拠・監査ログ・分離テスト結果の証跡集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-USER-ORG-ADMIN-P12` ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-USER-ORG-ADMIN-P13` リリース/デプロイ — S17/S18のCloudflare Workers本番反映とロールアウト確認

