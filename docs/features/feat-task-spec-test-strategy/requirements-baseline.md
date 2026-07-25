---
status: confirmed
layer: feature-design
task: SYS-TASK-SPEC-TEST-STRATEGY-P01
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
source: .dev-graph/plans/generations/feature-package-feat-task-spec-test-strategy/7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae/goal-spec.json
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
feature_context_digest: sha256:eafd046f7f71c3c44f48a69297d08e0ca160a3f503e243a99a8a11c7bd178df7
architecture_refs: [arch-harness-hub-testing-qa]
---

# feat-task-spec-test-strategy 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/background/goal/scope_in/scope_out/acceptance を**逐語転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

タスク仕様書がテストレベルの網羅やカバレッジ基準を明記しない、あるいは書き方が実行ごとにぶれるため、実装後に「結合が通らない」「既存機能が壊れた」を後追いで発見している状態 (qa-070/qa-073) を解消する。仕様生成の時点でテスト戦略 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を必須 section 化し、欠落を fail-closed (条件を満たさないときは通さずに止める) で機械的に拒否することで、何度実行しても同じ品質基準の仕様書が出る冪等 (べきとう=何回実行しても結果が同じ) な仕組みへ移す。あわせて、ボタン配置など見た目の微調整でテストが壊れる保守性崩壊 (qa-072) を、実装後の努力目標ではなく仕様段階の制約として先に封じる。

## 2. 背景 (background)

本 feature は、system-spec/testing-qa.md で確定した qa-070 (テストレベル4種網羅: 単体・結合・境界値・回帰)・qa-072 (層別テスト方針と behavior ベースの保守性要件)・qa-073 (テスト戦略のタスク仕様書への冪等組込、qa-075 で章反映) の内容を、system-dev-planner の task spec テンプレート契約へ機械的に反映するものである。qa-069 で確定した MVP ファースト方針は「品質・再現性強化系タスクは MVP 成立後へ繰り延べる」ことを求めるが、本 feature は Hub プロダクト本体の実装ではなく system-dev-planner の仕様生成契約 (P01..P13 テンプレート) という外側ループの改修であり、depends_on を持たず P01..P13 exact-13 契約自体も変更しないため、Hub 側 MVP 機能の着手を妨げず並行して進められる位置づけにある。

## 3. ゴール (goal)

system-dev-planner が生成する全 P01..P13 タスク仕様書がテスト戦略 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を必須 section として備え、欠落した仕様書は promotion 前に fail-closed で拒否され、同一 feature context からの再生成で section 構成 (項目集合・順序) が冪等に一致し、かつ既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行であることが検証された状態

## 4. スコープ

### 4.1 scope_in (7 件)

| # | 項目 (逐語) | 主担当 phase |
|---|---|---|
| SI-1 | タスク仕様書テスト戦略 section のスキーマ定義 (テストレベル選定・カバレッジ目標・層別方針・保守性制約の 4 項目) | P02 / P05 |
| SI-2 | system-dev-planner の task spec テンプレート (P01..P13) への必須 section 組込 | P02 / P05 |
| SI-3 | テスト戦略 section 欠落を promotion 前に非0終了で拒否する fail-closed validator | P02 / P05 / P09 |
| SI-4 | 変更内容の種別 (フロント/バックエンド/インフラ) からテストレベルと層別方針を導出する規則 | P02 / P05 |
| SI-5 | 層別テスト方針の明文化 (フロント= accessible role/ラベル選択の behavior ベース必須かつ pixel 位置・DOM 構造依存禁止、バックエンド= API 契約テスト+ビジネスロジック単体+DB 結合、インフラ= IaC/設定の静的検証+デプロイ後 smoke) | P02 / P05 / P12 |
| SI-6 | 「どこまで管理するか」の線引き (実装詳細への密結合となる過剰テストを作らない基準) の仕様記述 | P02 / P12 |
| SI-7 | 同一 feature context での再生成における section 構成の冪等性検証 | P04 / P06 |

未割当: **0 件**。

### 4.2 scope_out (7 件)

1. テスト実行基盤 (Vitest / Playwright / @testing-library/react) の scaffold・設定・CI 配線
2. カバレッジ計測と未達時マージブロックの CI 実装
3. flaky 検出・quarantine・再実行ポリシーの運用実装
4. pixel 位置・DOM 構造依存を検出する lint の実装 (本 feature は仕様上の制約明記までを範囲とする)
5. Hub プロダクト本体機能 (Web/API/DB) のテストケース追加
6. 既存タスク仕様書資産の一括再生成
7. P01..P13 exact-13 契約そのものの変更

## 5. 受入条件 (acceptance / 7 件)

| # | 受入条件 (逐語) | 対応 scope_in | 検証 phase |
|---|---|---|---|
| AC-1 | テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する | SI-3 | P06 / P09 |
| AC-2 | 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を全て持つ task spec が validator PASS する | SI-1 / SI-3 | P06 / P07 |
| AC-3 | 同一 feature context で仕様生成を二回実行し、テスト戦略 section の項目集合と順序が一致する | SI-7 | P06 |
| AC-4 | 生成された task spec のテストレベル選定が、変更内容の種別に対応する層別方針を含む | SI-4 / SI-5 | P06 / P07 |
| AC-5 | カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される | SI-1 / SI-5 | P06 / P07 |
| AC-6 | 保守性制約に pixel 位置・DOM 構造依存の禁止が明記される | SI-5 / SI-6 | P06 / P07 |
| AC-7 | 既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である | (制約: scope_out 7 の裏面) | P06 / P08 / P09 |

P04 がこの 7 件へ実行可能なテスト ID を割り当て、P06 が実行し、P07/P10 が実行済み証跡のみで判定する (trace rule)。

## 6. テスト戦略 4 項目が要求する粒度 (曖昧さの排除)

goal-spec が「4 項目」とだけ述べる部分を、機械検証可能な粒度へ落とす。P02 はここで固定した粒度を schema/検査点へ写像するだけで、粒度そのものを変更しない。

| 項目 | 必須内容 | 機械検証可能な最小条件 | 由来 |
|---|---|---|---|
| TS-1 テストレベル選定 | 単体・結合・境界値・回帰の 4 レベルについて、当該 task で追加/実行するものと適用外を判別できる記述 | 4 レベル名が全て出現し、各レベルに適用可否の判定語が伴う | qa-070 |
| TS-2 カバレッジ目標 | 既定 80% を数値で明示し、層別上書きが可能であることを記述 | `80%` の数値表現が存在する | qa-071 / qa-075 |
| TS-3 層別方針 | 当該 task が触る層 (フロント/バックエンド/インフラ) に対応する方針を明示。触らない層は適用外を明示 | Workstream applicability で applicable な層に対応する方針語が出現する | qa-072 |
| TS-4 保守性制約 | pixel 位置依存の禁止・DOM 構造依存の禁止・過剰テストを作らない線引きを明示 | `pixel` と `DOM` の禁止表現が存在する | qa-072 |

### 6.1 層別方針の確定内容 (qa-072 逐語由来)

- **フロント**: component 単体 + ユーザー操作フローの結合テスト。要素選択は accessible role / ラベルによる behavior ベースを必須とし、pixel 位置・DOM 構造への依存を禁止する。
- **バックエンド**: API 契約テスト + ビジネスロジック単体テスト + DB 結合テスト。
- **インフラ**: IaC / 設定の静的検証 + デプロイ後 smoke テスト。
- **線引き**: 実装詳細へ密結合する過剰なテストを作らない。どこまで管理するかは各層のテスト設計方針として仕様に明文化する。

## 7. qa 質疑との対応表

正本: `system-spec/testing-qa.md` (`sha256:fd302fb5f8f88147d8a01f02935ab31d335dafbd06cb6b391389bf2e6ab07b19`)。qa-071 は同正本の直接収録質疑ではなく、`architecture/harness-hub-testing-qa.md` の要点整理経由で参照する派生根拠として扱う。

| qa 回答の要素 | 出典 | scope_in | acceptance |
|---|---|---|---|
| テストレベル 4 種 (単体・結合・境界値・回帰) をタスク仕様書のテスト戦略セクションで必須明記する | qa-070 | SI-1 / SI-2 | AC-2 |
| テスト種別の選定はタスクの変更内容から導出する | qa-070 | SI-4 | AC-4 |
| 層別方針 (FE behavior ベース / BE API 契約+ロジック単体+DB 結合 / インフラ IaC 静的検証+smoke) を適用する | qa-072 | SI-5 | AC-4 |
| pixel 位置・DOM 構造依存を禁止し、UI 微修正でテストが壊れない設計に限定する | qa-072 | SI-5 | AC-6 |
| 過剰テスト (実装詳細への密結合) を作らない線引きを仕様へ明文化する | qa-072 | SI-6 | AC-6 |
| テスト戦略セクションをテンプレート必須項目として組み込み、冪等に再現する | qa-073 / qa-075 | SI-2 / SI-7 | AC-3 |
| 仕様生成パイプライン側で機械検証し、欠落を fail-closed で拒否する | qa-073 / qa-075 | SI-3 | AC-1 |
| カバレッジ基準 80% 以上を維持する | qa-071 (architecture 要点経由) / qa-075 | SI-1 | AC-5 |
| CI 実行=web 行 / 作者ローカル=desktop-windows・macos 行という platform 境界 | qa-074 | (scope_out 2 の前提) | — |

## 8. 転記元 lineage (digest 実測・2026-07-25 時点)

| path | sha256 | status |
|---|---|---|
| `features/feat-task-spec-test-strategy.context.json` | `eafd046f7f71c3c44f48a69297d08e0ca160a3f503e243a99a8a11c7bd178df7` | verified (goal-spec の feature_context_digest pin と一致) |
| `system-spec/testing-qa.md` | `fd302fb5f8f88147d8a01f02935ab31d335dafbd06cb6b391389bf2e6ab07b19` | verified (goal-spec lineage pin と一致) |
| `architecture/harness-hub-testing-qa.md` | `69767727ffb7185e7dc527908f7dd851d1beabbf33b8872a6c4e86ddb42185d8` | verified (goal-spec lineage pin と一致) |
| `features/feat-task-spec-test-strategy.md` | `b0b8b2a17dbda1c6636e7e70cab78ce2da3ff58a43cbc94b90a79204d68ad5c2` | **drift**: goal-spec lineage pin は `b93305ca2d7fb74a14ba25d6aa80f24b92420d7232bf16c515c0af88ab1a7761` |
| `specs/harness-hub-system-specification.md` | `326b75ad9b2f245662b498f51bb027f45bbb0757a3a9102f40bcde4e75d2cf29` | 実測 (第2参照。goal-spec lineage 非収録) |

### 8.1 drift の扱い (entry gate 有効性の判定)

`features/feat-task-spec-test-strategy.md` の digest が plan 実行時から変化しているが、これは C02 beads 投影が同ファイル frontmatter へ `beads_linkage` / `confirmation_status: confirmed` / `evaluation_status: pass` を書き戻したことによる**登録メタデータ差分**であり、purpose/goal/scope_in/scope_out/acceptance の本文合意事項は不変である。P01 spec の entry gate が束縛するのは machine-readable な `feature_context_digest` (= `.context.json` の `eafd046f…`) であり、こちらは一致しているため entry gate は有効に成立している。本 drift は P13 writeback の申し送り対象とする。

## 9. 実測ベースライン (2026-07-25 時点)

P02 以降の設計・検証はこの実測値を出発点とする。

| 指標 | 実測値 | 取得根拠 |
|---|---|---|
| 現行 task spec 必須 section | 15 件 (`Machine-readable registration fields` .. `参照情報`)。テスト戦略に相当する section は**存在しない** | `plugins/system-dev-planner/scripts/validate-system-plan.py` `REQUIRED_TASK_SPEC_SECTIONS` |
| section 検査の実装 | `task_spec_violations()` が欠落 / 重複 / 空本文の 3 コードを返し、`validate()` が violation を積んで exit 2 | 同上 |
| 既存 promoted 世代の検証結果 | `feature-package/feat-mvp-first-scheduling` = **pass** (digest `sha256:55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387`) | `validate-system-plan.py --feature-package …` 実測 |
| 本 package の検証結果 | `feature-package/feat-task-spec-test-strategy` = **pass** (digest `sha256:7d185f45…`) | 同上 |
| 既存テスト資産 | `plugins/system-dev-planner/tests` = 110 passed | `python3 -m pytest plugins/system-dev-planner/tests -q` 実測 |
| テンプレート正本 | `template_version: 1.1.0`。15 section を列挙し、末尾「task-spec validation (正本追記)」節が C12 の検査契約を宣言 | `plugins/system-dev-planner/references/system-task-spec-template.md` |

## 10. P02 で確定すべき据置事項 (5 件)

| id | 据置事項 | 確定先 |
|---|---|---|
| DEF-1 | テスト戦略 section の見出し名と 4 項目のラベル文字列・出現順序 (冪等性の判定単位そのもの) | P02 design.md §2 |
| DEF-2 | 必須化と既存 promoted 世代非破壊性の両立方式 — 無条件必須化は現在 PASS の `feat-mvp-first-scheduling` を FAIL に転落させるため、段階適用の判定キーを確定する | P02 design.md §3 |
| DEF-3 | 変更種別 (Workstream applicability) → 必須層別方針の導出規則の対応表 | P02 design.md §4 |
| DEF-4 | fail-closed が拒否すべき欠落パターンの列挙 (section 欠如 / 4 項目の一部欠落 / 見出し順序入替 / 空本文) と violation code 命名 | P02 design.md §5 |
| DEF-5 | schema ファイル (`task-spec-test-strategy.schema.json`) の役割 — validator が実際に読む対象か、契約の宣言のみか | P02 design.md §6 |

## 11. rollback

本 baseline が goal-spec と乖離した場合、本文書を編集せず `/system-dev-plan` の再実行で package を再生成し、P01 から再着手する。
