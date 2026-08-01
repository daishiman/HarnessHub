# 実装要件定義書: feat-task-spec-test-strategy (タスク仕様書テスト戦略の必須 section 化)

- 生成: 2026-07-25T04:25:18Z / snapshot: `sha256:4420956c10cad812faf1efedfba74732f60924454e4be2a21b76d68ada0789e9` (graph_revision 622)
- handoff target: task-graph / package: `feature-package/feat-task-spec-test-strategy` (generation `7d185f453466…`)

## 要件の出所 (lineage)

- 確定仕様: `system-spec/testing-qa.md` qa-070/qa-072/qa-073/qa-074 (source_digest fd302fb5…) — タスク仕様書がテスト網羅を明記せず実行ごとに書き方がぶれるため、結合破綻・既存機能の退行を実装後に後追い発見している状態を、仕様生成時点の必須 section 化と機械的拒否で断つ。
- architecture: `architecture/harness-hub-testing-qa.md` (source_digest 69767727…・readiness complete)
- feature: `features/feat-task-spec-test-strategy.md` (confirmed/pass・plan evaluator C1..C4 PASS)
- specification: `specs/harness-hub-system-specification.md` (spec-harness-hub-requirements)

## 目的 (なぜ作るか)

タスク仕様書がテスト網羅を明記しない、あるいは書き方が実行ごとにぶれるため、実装後に「結合が通らない」「既存機能が壊れた」を後追いで発見している (qa-070/qa-073)。仕様生成の時点でテスト戦略を必須 section 化し欠落を機械的に拒否することで、何度実行しても同じ品質基準の仕様書が出る冪等な仕組みへ移す。あわせて、ボタン配置など見た目の微調整でテストが壊れる保守性崩壊 (qa-072) を、実装ではなく仕様段階の制約として先に封じる

## 完了状態 (goal)

system-dev-planner が生成する P01..P13 タスク仕様書が、テストレベル選定 (単体・結合・境界値・回帰)・カバレッジ目標 (既定 80%、層別上書き可)・層別方針 (フロント behavior ベース / バックエンド API 契約+ロジック単体+DB 結合 / インフラ IaC 静的検証+デプロイ後 smoke)・保守性制約 (pixel 位置・DOM 構造依存の禁止、過剰テストを作らない線引き) の 4 項目を必須 section として持ち、欠落した仕様書は promotion 前に fail-closed で拒否され、同一入力の再生成で section 構成が冪等に一致する状態

## 実装要件 (要約)

1. **テスト戦略 section スキーマ**: タスク仕様書のテスト戦略 section を「テストレベル選定 / カバレッジ目標 / 層別方針 / 保守性制約」の 4 項目で定義し、機械可読な schema として固定する。
2. **P01..P13 テンプレートへの必須 section 組込**: system-dev-planner の task spec テンプレート 13 種すべてに当該 section を必須化し、生成経路 (architect) が省略できない形にする。
3. **fail-closed validator**: テスト戦略 section を欠いた仕様書を promotion 前に非0終了で拒否する。警告どまりにせず exit code へ係留する。
4. **変更種別からの導出規則**: 変更内容の種別 (フロント / バックエンド / インフラ) から、適用すべきテストレベルと層別方針を決定論的に導出する規則を定義する。
5. **層別方針の明文化**: フロント= accessible role / ラベル選択の behavior ベースを必須とし pixel 位置・DOM 構造依存を禁止、バックエンド= API 契約テスト + ビジネスロジック単体 + DB 結合、インフラ= IaC/設定の静的検証 + デプロイ後 smoke。
6. **過剰テストの線引き**: 実装詳細への密結合となるテストを作らない基準を仕様として記述し、「どこまで管理するか」を曖昧にしない。
7. **冪等性**: 同一 feature context での再生成で、テスト戦略 section の項目集合と順序が一致する。

## スコープ外 (変更禁止)

- テスト実行基盤 (Vitest / Playwright / @testing-library/react) の scaffold・設定・CI 配線
- カバレッジ計測と未達時マージブロックの CI 実装
- flaky 検出・quarantine・再実行ポリシーの運用実装
- pixel 位置・DOM 構造依存を検出する lint の実装 (本 feature は仕様上の制約明記までを範囲とする)
- Hub プロダクト本体機能 (Web/API/DB) のテストケース追加
- 既存タスク仕様書資産の一括再生成
- P01..P13 exact-13 契約そのものの変更

## 実行単位

P01..P13 exact-13 package (`.dev-graph/plans/generations/feature-package-feat-task-spec-test-strategy/7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae`) の task projections:
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p01.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p02.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p03.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p04.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p05.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p06.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p07.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p08.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p09.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p10.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p11.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p12.md`
- `tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p13.md`

## 受入 (feature acceptance)

- テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する
- 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を全て持つ task spec が validator PASS する
- 同一 feature context で仕様生成を二回実行し、テスト戦略 section の項目集合と順序が一致する
- 生成された task spec のテストレベル選定が、変更内容の種別に対応する層別方針を含む
- カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される
- 保守性制約に pixel 位置・DOM 構造依存の禁止が明記される
- 既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である

## 品質ゲート

四 gate (C11 validate-graph-schema / C02 saved state / validate-source-digest / validate-system-plan) を同一 snapshot で PASS 済み。`validate-source-digest.py --registered` には feature・P01..P13・system specification・architecture の lineage closure 16 node を全件指定し、checked=16 / registered_mismatch=[] / exit 0 を確認した。実装フェーズは各 task spec の Automated commands・Required evidence・inner goal-seek (system-task-goal-seek/v1) に従う。本 skill は実装コードを生成しない (生成 code file 0 件)。
