# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**:
  - Stage 1 へ投資する前に
  - Skill 配布の成立経路 (URL 型 marketplace / npm source / Bootstrap Installer) と Windows 実機 E2E を検証し
  - 成立経路を確定する (仮説 H7)
- **到達状態 (Goal)**: 最小 artifact で 2 経路以上の配布検証が完了し、採用経路が根拠付きで記録された状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-STAGE0-DISTRIBUTION-GATE-P01`、`SYS-STAGE0-DISTRIBUTION-GATE-P02`、`SYS-STAGE0-DISTRIBUTION-GATE-P03`、`SYS-STAGE0-DISTRIBUTION-GATE-P04`、`SYS-STAGE0-DISTRIBUTION-GATE-P05`、`SYS-STAGE0-DISTRIBUTION-GATE-P06`、`SYS-STAGE0-DISTRIBUTION-GATE-P07`、`SYS-STAGE0-DISTRIBUTION-GATE-P08`、`SYS-STAGE0-DISTRIBUTION-GATE-P09`、`SYS-STAGE0-DISTRIBUTION-GATE-P10`、`SYS-STAGE0-DISTRIBUTION-GATE-P11`、`SYS-STAGE0-DISTRIBUTION-GATE-P12`、`SYS-STAGE0-DISTRIBUTION-GATE-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P01` 配布経路検証 (H7) 要件ベースライン確定 — URL 型 marketplace / npm source / Bootstrap Installer 2 経路以上実機検証・Windows E2E・decision record 登録

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P02` アーキテクチャ設計 — 3 経路検証方式・最小 artifact 構成・実機 E2E 手順・decision record 登録経路の確定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P03` 独立設計レビュー — 検証方式・artifact 構成・実機 E2E 手順の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P04` テストファースト設計 — quality_constraints 8 件・acceptance 3 件に対応する実機検証ケースの設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P05` 実装 — 最小 skill package・marketplace.json・Bootstrap Installer 試作の作成

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P06` テスト実行 — macOS/Windows 実機での URL 型 marketplace・npm source・Bootstrap Installer 検証実行

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P07` 受入 — 2 経路以上の実機検証記録と Windows E2E 成功の確認

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P08` リファクタリング/マイグレーション — 検証 prototype 資産の整理 (N/A 判断を含む)

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P09` 品質・セキュリティ・運用保証 — C1 (体制)・C2 (コストゼロ)・H7 fail-closed ゲートの充足確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P10` 独立最終レビュー — quality_constraints 8 件・acceptance 3 件の最終確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P11` 再現可能な証跡 — P06/P07/P09/P10 の証跡集約と再現手順の確立

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P12` 文書化・runbook・引き継ぎ — 採用経路の onboarding/更新導線/障害時対応手順の確立

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-STAGE0-DISTRIBUTION-GATE-P13` リリース/デプロイ — 採用経路の decision record 登録依頼 (C01 writer 経由) と Stage 1 開始条件判定

