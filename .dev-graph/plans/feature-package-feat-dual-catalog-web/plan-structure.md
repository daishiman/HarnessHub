# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **目的 (何をするか)**: 利用者・管理者が Skill/WebApp を発見・導入できる dual catalog UI と配布出口 (marketplace 出力 / Bootstrap Installer 連携) を、WCAG 2.2 AA + CWV good (qa-018) の品質で提供する
- **到達状態 (Goal)**: 2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)、a11y/速度の品質ゲートが CI で強制される状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-DUAL-CATALOG-WEB-P01`、`SYS-DUAL-CATALOG-WEB-P02`、`SYS-DUAL-CATALOG-WEB-P03`、`SYS-DUAL-CATALOG-WEB-P04`、`SYS-DUAL-CATALOG-WEB-P05`、`SYS-DUAL-CATALOG-WEB-P06`、`SYS-DUAL-CATALOG-WEB-P07`、`SYS-DUAL-CATALOG-WEB-P08`、`SYS-DUAL-CATALOG-WEB-P09`、`SYS-DUAL-CATALOG-WEB-P10`、`SYS-DUAL-CATALOG-WEB-P11`、`SYS-DUAL-CATALOG-WEB-P12`、`SYS-DUAL-CATALOG-WEB-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-DUAL-CATALOG-WEB-P01` 要件ベースライン確定 — dual catalog UI(Workspace Catalog)・publish状況表示ポーリング・marketplace.json出力・axe/CWV品質ゲートの要件確定

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-DUAL-CATALOG-WEB-P02` アーキテクチャ設計 — S01/S02/S03/S04画面構成・install descriptor取得・ポーリング契約・marketplace.json生成方式・CWVバンドル予算の決定

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-DUAL-CATALOG-WEB-P03` 独立設計レビュー — S01-S04画面構成・install descriptor契約・ポーリング設計・marketplace.json生成方式の妥当性確認

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-DUAL-CATALOG-WEB-P04` テストファースト設計 — axe自動検査・Playwright J1/J2ジャーニー×2 viewport・Lighthouse CWV予算・marketplace.jsonスキーマ検証・ポーリングbackoff契約のテスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-DUAL-CATALOG-WEB-P05` 実装 — S01/S02/S03/S04画面実装・marketplace.json出力パイプライン・配布経路連携・axe CI組込・CWVバンドル最適化・ポーリング実装

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-DUAL-CATALOG-WEB-P06` テスト実行 — Vitest部品テスト・Playwright E2E・axe自動チェック・Lighthouse CWV計測の実行

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-DUAL-CATALOG-WEB-P07` 受入 — axe検出可能違反0のCIゲート存在・CWV全指標good実測・Hub停止中の導入済みSkill動作継続の受入判定

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-DUAL-CATALOG-WEB-P08` リファクタリング/マイグレーション — mockup由来静的画面からshared-layers準拠の本番動的コンポーネント構成への移行

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-DUAL-CATALOG-WEB-P09` 品質・セキュリティ・運用保証 — テナント分離(deny-by-default)・§6.1縮退設計運用確認・SLOダッシュボード・WCAG/CWV最終確認

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-DUAL-CATALOG-WEB-P10` 独立最終レビュー — quality_constraints 7件・acceptance 3件の最終確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-DUAL-CATALOG-WEB-P11` 再現可能な証跡 — P06/P07/P09/P10の証跡集約と再現手順確立

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-DUAL-CATALOG-WEB-P12` 文書化・runbook・引き継ぎ — カタログ利用者/管理者向け手順・marketplace.json形式文書・障害時縮退runbook・更新通知導線の文書化

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-DUAL-CATALOG-WEB-P13` リリース/デプロイ — Cloudflare Workers(wrangler)へのロールアウト・rollback手順・Stage 1完了判定

