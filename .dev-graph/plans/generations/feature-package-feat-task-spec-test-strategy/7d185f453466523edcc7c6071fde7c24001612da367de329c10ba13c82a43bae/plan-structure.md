# task-progress (live 実行状態・派生ビュー)

> `project-task-status.py` 生成の派生ビュー。構造の正本は `task-graph.json`、状態の正本は build dir の `task-state.json`。手書き編集しない (再生成で上書き)。build 異常終了時は最後の 投影時点のスナップショットで stale の可能性がある (最新は再投影で得る)。

- 凡例: ✓=done / ▶=running / ✗=blocked / ☐=pending / ⏳=未処理の発見タスク (外ループ待ち)
- 完了率: **0%** (0/13)
- 状態内訳: done=0 / running=0 / blocked=0 / pending=13
- route-report 数: 0

## このタスクの目的と、導入で得られる価値

### 技術的な詳細 (エンジニア向け)
- **本質的な問題・課題**: 本 feature は、system-spec/testing-qa.md で確定した qa-070 (テストレベル4種網羅: 単体・結合・境界値・回帰)・qa-072 (層別テスト方針と behavior ベースの保守性要件)・qa-073 (テスト戦略のタスク仕様書への冪等組込、qa-075 で章反映) の内容を、system-dev-planner の task spec テンプレート契約へ機械的に反映するものである。qa-069 で確定した MVP ファースト方針は「品質・再現性強化系タスクは MVP 成立後へ繰り延べる」ことを求めるが、本 feature は Hub プロダクト本体の実装ではなく system-dev-planner の仕様生成契約 (P01..P13 テンプレート) という外側ループの改修であり、depends_on を持たず P01..P13 exact-13 契約自体も変更しないため、Hub 側 MVP 機能の着手を妨げず並行して進められる位置づけにある。
- **目的 (何をするか)**:
  - タスク仕様書がテストレベルの網羅やカバレッジ基準を明記しない、あるいは書き方が実行ごとにぶれるため、実装後に「結合が通らない」「既存機能が壊れた」を後追いで発見している状態 (qa-070/qa-073) を解消する。
  - 仕様生成の時点でテスト戦略 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を必須 section 化し、欠落を fail-closed (条件を満たさないときは通さずに止める) で機械的に拒否することで、何度実行しても同じ品質基準の仕様書が出る冪等 (べきとう=何回実行しても結果が同じ) な仕組みへ移す。
  - あわせて、ボタン配置など見た目の微調整でテストが壊れる保守性崩壊 (qa-072) を、実装後の努力目標ではなく仕様段階の制約として先に封じる。
- **背景・前提**:
  - 本 feature は
  - system-spec/testing-qa.md で確定した qa-070 (テストレベル4種網羅: 単体・結合・境界値・回帰)・qa-072 (層別テスト方針と behavior ベースの保守性要件)・qa-073 (テスト戦略のタスク仕様書への冪等組込
  - qa-075 で章反映) の内容を
  - system-dev-planner の task spec テンプレート契約へ機械的に反映するものであるqa-069 で確定した MVP ファースト方針は「品質・再現性強化系タスクは MVP 成立後へ繰り延べる」ことを求めるが
  - 本 feature は Hub プロダクト本体の実装ではなく system-dev-planner の仕様生成契約 (P01..P13 テンプレート) という外側ループの改修であり
  - depends_on を持たず P01..P13 exact-13 契約自体も変更しないため
  - Hub 側 MVP 機能の着手を妨げず並行して進められる位置づけにある
- **到達状態 (Goal)**: system-dev-planner が生成する全 P01..P13 タスク仕様書がテスト戦略 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を必須 section として備え、欠落した仕様書は promotion 前に fail-closed で拒否され、同一 feature context からの再生成で section 構成 (項目集合・順序) が冪等に一致し、かつ既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行であることが検証された状態

## タスクの依存関係 (何が何に依存して進むか)
> 全 13 タスク・0 依存エッジ。各フェーズの詳細は下記チェックリスト、完全な関係は HTML レポートを参照。
- 起点タスク (依存なしで最初に着手可能): `SYS-TASK-SPEC-TEST-STRATEGY-P01`、`SYS-TASK-SPEC-TEST-STRATEGY-P02`、`SYS-TASK-SPEC-TEST-STRATEGY-P03`、`SYS-TASK-SPEC-TEST-STRATEGY-P04`、`SYS-TASK-SPEC-TEST-STRATEGY-P05`、`SYS-TASK-SPEC-TEST-STRATEGY-P06`、`SYS-TASK-SPEC-TEST-STRATEGY-P07`、`SYS-TASK-SPEC-TEST-STRATEGY-P08`、`SYS-TASK-SPEC-TEST-STRATEGY-P09`、`SYS-TASK-SPEC-TEST-STRATEGY-P10`、`SYS-TASK-SPEC-TEST-STRATEGY-P11`、`SYS-TASK-SPEC-TEST-STRATEGY-P12`、`SYS-TASK-SPEC-TEST-STRATEGY-P13`

## P01
> 🎯 何のため: 何を作るか — 要件と作業方針を固める
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P01` 要件ベースライン確定 — テスト戦略 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) の要件ベースライン文書化

## P02
> 🎯 何のため: どう作るか — 構成・データ・依存を設計する
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P02` 設計 — テスト戦略 section スキーマ・変更種別からの導出規則・テンプレート組込位置・fail-closed 検査点の決定論設計

## P03
> 🎯 何のため: 設計を独立レビューで検証する
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P03` 設計レビュー — 単一 writer (validate-system-plan.py) 境界・exact-13 契約非退行・既存 promoted 世代への非破壊性の整合検証

## P04
> 🎯 何のため: 検証方法 (テスト) を先に設計する
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P04` テスト設計 — section 欠落拒否・完備 PASS・再生成冪等・exact-13 非退行の回帰テスト設計

## P05
> 🎯 何のため: 各部品を実際に作る (実装)
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P05` 実装 — テスト戦略 section スキーマ・task spec テンプレート必須 section 組込・fail-closed validator・層別導出規則

## P06
> 🎯 何のため: 作った部品を動かして検証する
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P06` テスト実行 — 回帰テスト全件実行と欠落拒否・冪等性の実測記録

## P07
> 🎯 何のため: 合格ライン (受け入れ基準) を定める
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P07` 受入判定 — goal-spec acceptance 7 件の突合と未達の差し戻し

## P08
> 🎯 何のため: 重複を整理し保守しやすくする
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P08` 移行 — 既存 promoted 世代を一括再生成しない互換性確認 (旧世代 digest 不変の実測記録)

## P09
> 🎯 何のため: 全体の品質ゲートを通す
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P09` 品質保証 — section 部分欠落・順序入替・空本文の悪性ケースに対する fail-closed 実効性の実測

## P10
> 🎯 何のため: 最終レビューで仕上がりを確認する
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P10` 最終レビュー — 全 phase 成果の横断整合確認

## P11
> 🎯 何のため: 検証した証拠を残す
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P11` 証跡固定 — 実測ログと digest の evidence manifest 化

## P12
> 🎯 何のため: 使い方・導入手順を文書化する
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P12` 運用文書化 — テスト戦略 section の記述手順と保守性制約 (pixel 位置・DOM 構造依存禁止) の運用ガイド

## P13
> 🎯 何のため: リリースしてよいか判定する
- ☐ `SYS-TASK-SPEC-TEST-STRATEGY-P13` リリース — main 反映と確定 system spec/architecture への writeback
