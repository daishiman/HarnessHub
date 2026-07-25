---
status: confirmed
layer: feature-acceptance
task: SYS-TASK-SPEC-TEST-STRATEGY-P07
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [eval-log/system-dev-planner/task-spec-test-strategy/test-run-p06.json, docs/features/feat-task-spec-test-strategy/requirements-baseline.md]
verdict: ACCEPTED
---

# feat-task-spec-test-strategy 受入判定

> **位置づけ**: P07 (受入) の成果物。goal-spec の acceptance 7 件を、P06 が実行した証跡 (`test-run-p06.json`) の pass/fail だけを根拠に判定する (trace rule: 実装コードを再読して「たぶん動く」と判定しない)。

## 0. 判定

| 項目 | 値 |
|---|---|
| 判定 | **ACCEPTED (7/7 達成)** |
| 判定日時 | 2026-07-25 (UTC。正確な実行時刻は `test-run-p06.json.executed_at`) |
| 根拠証跡 | `eval-log/system-dev-planner/task-spec-test-strategy/test-run-p06.json` (27 results / 27 pass) |
| 差し戻し | なし |

## 1. acceptance 別判定

| # | 受入条件 (逐語) | 対応 test ID | 実測 | 判定 |
|---|---|---|---|---|
| AC-1 | テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する | TS-A02 / TS-A06 / TS-A14 | 3/3 pass。TS-A14 は `main()` の戻り値が **2** であることを直接検査 | **達成** |
| AC-2 | 4 項目を全て持つ task spec が validator PASS する | TS-A03 / TS-A12 | 2/2 pass。TS-A03 は 13 件全件に section を持つ enforced package が status=pass | **達成** |
| AC-3 | 同一 feature context で二回実行し、項目集合と順序が一致する | TS-A07 / TS-B06 / TS-B07 / TS-B12 | 4/4 pass。順序入替は violation、同一入力の parse/violation 列は完全一致 | **達成** |
| AC-4 | テストレベル選定が、変更内容の種別に対応する層別方針を含む | TS-B01 / TS-B02 / TS-B03 / TS-B04 / TS-B05 / TS-B11 | 6/6 pass。Frontend→`behavior`、Backend/API/Data→`API 契約`+`DB 結合`、Infrastructure→`IaC`+`smoke` の欠落を拒否 | **達成** |
| AC-5 | カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される | TS-A09 / TS-B08 | 2/2 pass。`80%` 欠落は `-content` violation。上書きは追記可 (pattern は既定値の存在のみを要求し追記を禁じない) | **達成** |
| AC-6 | 保守性制約に pixel 位置・DOM 構造依存の禁止が明記される | TS-A09 / TS-B08 | 2/2 pass。`pixel` / `DOM` の双方が必要 (lookahead により順不同・複数行可) | **達成** |
| AC-7 | 既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である | TS-A01 / TS-A13 / TS-B10 + 既存 137 件 | 全件 pass。`plugins/system-dev-planner/tests` 137 passed (exit 0)。実 promoted 世代 2 件も status=pass / digest 不変 | **達成** |

未達 acceptance: **0 件**。差し戻し先 phase: **該当なし**。

## 2. 証跡カテゴリ別の充足

| カテゴリ | 件数 | 結果 |
|---|---|---|
| section-missing-rejection | 10 | 全 pass |
| complete-pass | 10 | 全 pass |
| regeneration-idempotency | 5 | 全 pass |
| exact13-non-regression | 3 (+ 既存 137 件) | 全 pass |

## 3. コマンド実測 (test-run-p06.json.commands より)

| command | exit | 実測 |
|---|---|---|
| `pytest <2 新規 test ファイル> --junitxml=…` | 0 | 27 passed |
| `validate-system-plan.py --feature-package feature-package/feat-task-spec-test-strategy` | 0 | status=pass / violations=0 / mode=legacy |
| `validate-system-plan.py --feature-package feature-package/feat-mvp-first-scheduling` | 0 | status=pass / violations=0 / mode=legacy |
| `pytest plugins/system-dev-planner/tests -q` | 0 | 137 passed |
| `pytest plugins/dev-graph/tests -q` | 1 | 4 failed / 419 passed (**既存不合格**、下記) |

## 4. 判定に影響しない事象の明示

- **dev-graph の 4 件失敗** (`test_skill_criteria_evidence.py` の `stale behavior closure digest`): 帰属を実測で切り分けた結果、**3 件は本 feature の変更が原因**である。`run-dev-graph-decompose` / `-node` / `-requirements` は `package-contract.depends_on: system-dev-planner` を宣言しており、live-trial の behavior closure に `plugins/system-dev-planner/{scripts,schemas,agents,skills}` が含まれる (`live-trial-verdict.py` `behavior_closure_files`)。closure digest を HEAD の git object から再構成すると記録値と完全一致し、現作業ツリーでのみ不一致になることを確認した。残る `run-dev-graph-system-spec` の 1 件は closure 内の `plugins/system-spec-harness/…/doctrine-anchor-registry.json` (本 feature 着手前からの既存差分) が原因で、本 feature とは無関係。
  - **AC-7 への影響**: なし。AC-7 が要求するのは exact-13 契約と 13-node DAG 検査の非退行であり、live-trial verdict の鮮度はこれに含まれない。exact-13 側の実測 (`plugins/system-dev-planner/tests` 137 passed / 既存 promoted 世代 2 件 pass・digest 不変) は無変更である。
  - **性質**: 実装の誤りではなく**ガバナンス鮮度ゲート**である。landing 前に該当 3 skill の `run-skill-live-trial` 再実行と `verdict.json` 更新が必要であり、P13 release-receipt の landing 前提条件として記録する。
  - **訂正記録**: 本節の初版は 4 件すべてを「既存不合格・本 feature と無関係」と記載していた。closure が plugin 境界を越える事実を見落としたための誤りであり、実測に基づき訂正した。`git status --porcelain plugins/dev-graph` が空であることは無関係性の根拠にならない (依存元 plugin の変更が closure に入るため)。
- **承認済み scope 逸脱**: P05 は resource_scope 外の 3 ファイル (`references/system-task-spec-template.md` / `skills/run-system-dev-plan/prompts/R3-emit.md` / `schemas/feature-execution-package.schema.json`) を変更した。P03 design-review §4.1 の CONDITIONAL PASS による承認済み逸脱であり、`implementation-note.md` §2.2 に申告がある。未申告の逸脱は検出されなかった。
- **コマンド形の読み替え**: task spec の `--staging .` は実行不能な形であり、テンプレート正本が定める `--feature-package` 形へ読み替えて実行した (`implementation-note.md` §4)。読み替えの妥当性は P10 が横断整合で再確認する。
