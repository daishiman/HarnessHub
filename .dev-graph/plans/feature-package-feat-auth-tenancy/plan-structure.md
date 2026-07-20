# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**:
  - テナント別 OIDC (Auth.js) と role 4 種
  - 全 API への Tenant/Workspace スコープ強制 (D4 row-level-scope)
  - Publisher 向け OAuth Device Flow を確立する
- **到達状態 (Goal)**: 2 テナント同時稼働で認可の越境が分離テストにより 0 件と証明され、Device Flow で token 取得・失効が動作する状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-AUTH-TENANCY-P01`、`SYS-AUTH-TENANCY-P02`、`SYS-AUTH-TENANCY-P03`、`SYS-AUTH-TENANCY-P04`、`SYS-AUTH-TENANCY-P05`、`SYS-AUTH-TENANCY-P06`、`SYS-AUTH-TENANCY-P07`、`SYS-AUTH-TENANCY-P08`、`SYS-AUTH-TENANCY-P09`、`SYS-AUTH-TENANCY-P10`、`SYS-AUTH-TENANCY-P11`、`SYS-AUTH-TENANCY-P12`、`SYS-AUTH-TENANCY-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-AUTH-TENANCY-P01` テナント別 OIDC (Auth.js)・role 4 種・OAuth Device Flow 要件ベースライン確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-AUTH-TENANCY-P02` アーキテクチャ設計 — Auth.js adapter 境界・単一認可ミドルウェア・Device Flow・session 管理設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-AUTH-TENANCY-P03` 独立設計レビュー — スキーマ owner 境界・role 分割線・単一ミドルウェア設計の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-AUTH-TENANCY-P04` テストファースト設計 — tenant 分離・role 4 種認可・Device Flow・OIDC 検証契約・session 失効のテスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-AUTH-TENANCY-P05` 実装 — Auth.js adapter・単一認可ミドルウェア・Device Flow API・session 管理の実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-AUTH-TENANCY-P06` テスト実行 — tenant 分離・role 4 種認可・Device Flow・OIDC 検証契約・session 失効テストの実行と結果記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-AUTH-TENANCY-P07` 受入 — goal-spec acceptance 3 項目の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-AUTH-TENANCY-P08` リファクタリング/マイグレーション — adapter 境界の最終整理・dev 専用 provider 非存在 CI 検査確立

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-AUTH-TENANCY-P09` 品質保証 — CI 品質ゲート (tenant 分離・adapter 境界隔離・dev provider 非存在・認可判定単一集約) の確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-AUTH-TENANCY-P10` 最終独立レビュー — quality_constraints 7 件の充足判定

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-AUTH-TENANCY-P11` エビデンス収集 — テスト結果・受入記録・最終レビュー記録の証跡集約

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-AUTH-TENANCY-P12` ドキュメント/運用 — 緊急失効・Device Flow token 監視・OIDC provider 追加の runbook 作成

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-AUTH-TENANCY-P13` リリース/デプロイ — 本番 OIDC provider 反映と Device Flow スモークテスト

