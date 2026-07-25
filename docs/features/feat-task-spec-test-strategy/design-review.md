---
status: confirmed
layer: feature-design
task: SYS-TASK-SPEC-TEST-STRATEGY-P03
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [docs/features/feat-task-spec-test-strategy/design.md, docs/features/feat-task-spec-test-strategy/requirements-baseline.md]
verdict: PASS-with-findings
---

# feat-task-spec-test-strategy 設計レビュー

> **位置づけ**: P03 (設計レビュー) の成果物。P02 design.md を 3 観点 (単一 writer 境界 / exact-13 契約非退行 / 既存 promoted 世代への非破壊性) で検証し、finding の有無と判定を記録する。判定は実コードの読取り実測に基づく。

## 0. 総合判定

| 観点 | 判定 | finding |
|---|---|---|
| A. 単一 writer (validate-system-plan.py) 境界 | **PASS (要緩和策)** | F-1 |
| B. exact-13 契約非退行 | **PASS** | なし |
| C. 既存 promoted 世代への非破壊性 | **PASS (P08 実測を条件)** | なし |
| D. (追加観点) 実装境界と resource_scope の整合 | **CONDITIONAL PASS** | F-2 |

総合: **PASS-with-findings**。F-1 / F-2 の緩和策を P05 の実装対象へ組み込むことを条件に P04 へ進む。

## 1. 観点 A: 単一 writer (validate-system-plan.py) 境界

### 1.1 検証内容

P02 design.md §1-1 は「task spec 本文の検査は C12 だけが所有する」と述べる。これを実コードで照合した。

### 1.2 実測

| 実装 | 場所 | 内容 |
|---|---|---|
| C12 | `scripts/validate-system-plan.py:47-63, 205-233` | `REQUIRED_TASK_SPEC_SECTIONS` (15 件) + `task_spec_violations()` |
| C14 | `scripts/build-system-handoff.py:64-70, 279-298` | **同名定数と同名関数の独立コピー** |

### 1.3 finding F-1: 15 section 契約は既に二重実装されている

- **事実**: 単一 writer は本設計の導入以前から成立していない。C14 が handoff 生成時 (`:357`) に同じ 15 section 検査を独立実行する。両者を突き合わせる機構はない (`test_phase_name_parity.py` は PHASES / TASK_PATHS のみを対象とし section 定数を見ていない)。
- **影響**: 本 feature がテスト戦略検査を C12 のみへ足すこと自体は安全である。promotion authority は C12 (`main()` が exit 2 を返す唯一の gate) であり、C14 が素通りしても C12 が拒否するため fail-closed は破れない。危険なのは、将来 15 section 側の定数が片方だけ更新される既存の drift リスクである。
- **判定**: 本設計は境界を**悪化させない**。ただし本 feature が section 契約に触る以上、drift 検出機構を置かずに去るべきではない。
- **緩和策 (P05 必須)**: `tests/test_task_spec_test_strategy_sections.py` に C12 ↔ C14 の `REQUIRED_TASK_SPEC_SECTIONS` 同一性 parity test を追加する。テスト戦略検査を C14 へ複製することは**しない** (二重実装をさらに増やすため)。

## 2. 観点 B: exact-13 契約非退行

### 2.1 検証内容

P01..P13 の phase 数・依存 chain・見出し構成に変更が生じないことを設計から確認した。

### 2.2 実測と判定

| 契約要素 | 現行実装 | 本設計の変更 | 判定 |
|---|---|---|---|
| `PHASES` = P01..P13 | `validate-system-plan.py:27` | なし | 非退行 |
| `TASK_PATHS` 13 件 | 同 `:28-36` | なし | 非退行 |
| `package.task_count == 13` / `phase_refs` exact-set | 同 `:282-285` | なし | 非退行 |
| 13-node DAG 前方 edge 検査 | 同 `:398-411` | なし | 非退行 |
| `REQUIRED_TASK_SPEC_SECTIONS` 15 件 | 同 `:47-63` | **変更しない** | 非退行 |
| `canonical_digest` / manifest exact-set | 同 `:415-437` | なし | 非退行 |

**中心的な判断**: テスト戦略を `REQUIRED_TASK_SPEC_SECTIONS` へ追加**しない**こと。追加すれば 15→16 の必須集合変更となり、既存 promoted 世代を即座に FAIL へ転落させ、goal-spec scope_out 7 (「P01..P13 exact-13 契約そのものの変更」) にも抵触する。別関数による条件付き検査という P02 の選択は、この 2 つの制約を同時に満たす唯一の形である。

- **finding**: なし。

## 3. 観点 C: 既存 promoted 世代への非破壊性

### 3.1 検証内容

新規検査が optional な追加であり、既存生成済み世代の再検証結果 (status / validated_digest / violation 件数) を変えないことを確認した。

### 3.2 二重の無効化条件

既存世代が新検査の評価対象から外れる条件は独立に 2 つある。

1. `feature-package.json` に `spec_contract_version` が無い → `legacy` モード → 欠落を violation にしない
2. task spec 本文に `## テスト戦略` 見出しが無い → strict-if-present の検査も発火しない

片方が破れてももう片方が残るため、非破壊性は単一条件に依存しない。

### 3.3 実測ベースライン (P08 が同条件で再測定する)

| package | 導入前 status | 導入前 validated_digest |
|---|---|---|
| `feature-package/feat-mvp-first-scheduling` | pass | `sha256:55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387` |
| `feature-package/feat-task-spec-test-strategy` | pass | `sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae` |

- **判定**: 設計上 PASS。**実測による確認は P08 の責務**であり、本 review は設計の論証のみを承認する。
- **digest 不変性の補足**: 本 feature は plugin 側ファイルのみを変更し、`.dev-graph/plans/generations/` 配下の promoted artifact を書き換えない。したがって `canonical_digest` は入力バイト列が変わらない以上、定義上不変である。
- **finding**: なし。

## 4. 観点 D (追加): 実装境界と resource_scope の整合

### 4.1 finding F-2: P05 の resource_scope が scope_in SI-2 を満たすファイルを含んでいない

- **事実**: P05 task spec の `resource_scope` は 5 件 (schema 1 / validator / architect agent / tests 2)。一方 goal-spec scope_in SI-2 は「system-dev-planner の task spec テンプレート (P01..P13) への必須 section 組込」を要求する。テンプレート正本は `references/system-task-spec-template.md` であり、resource_scope に含まれていない。
- **追加の実測**: 生成側の指示正本 `skills/run-system-dev-plan/prompts/R3-emit.md` は「15 必須 section」「v1.1.0」を 4 箇所で明示している (`:43, 57, 66, 107, 144`)。テンプレートだけを 16 section へ更新して R3-emit を据え置くと、生成器は矛盾する 2 つの指示を受け、section を出力しない可能性が高い。
- **影響**: resource_scope を字義通りに守ると、validator は section を要求するが生成器は永久に出力しないという**空洞化した feature** になる。逆に無制限に広げると write scope 契約が形骸化する。
- **判定 (CONDITIONAL PASS)**: 次の 2 ファイルに限り、SI-2 を成立させるための不可分な付随変更として P05 の実装対象へ含めることを承認する。いずれも `plugins/system-dev-planner/` 内であり plugin 境界を越えない。

| 追加対象 | 根拠 |
|---|---|
| `references/system-task-spec-template.md` | scope_in SI-2 が名指しする「task spec テンプレート」の正本そのもの |
| `skills/run-system-dev-plan/prompts/R3-emit.md` | 上記テンプレートの section 数・版を宣言する生成側指示。据え置くと正本と矛盾する |
| `schemas/feature-execution-package.schema.json` | `spec_contract_version` の宣言先。schema なしでは additionalProperties=false により package が schema violation となる |

- **境界の上限**: `plugins/dev-graph/templates/system-task-spec.md` (draft コピー) は**変更しない**。テンプレート正本の冒頭注記が「P08/P12 で本正本への pointer 化予定」と述べており、本 feature の scope ではない。P13 の申し送り対象とする。
- **記録義務**: P05 は resource_scope 外の 3 ファイルを変更した事実と本 finding への参照を実装記録に残す。P07 / P10 はこの逸脱を承認済み逸脱として扱い、未申告の scope 逸脱と区別する。

## 5. P04 への引き渡し

P04 は次を満たすテスト設計を行う。

1. acceptance AC-1..AC-7 の全件に 1 件以上の test ID を割り当てる
2. P02 §5 の R-1..R-9 悪性パターンを網羅する
3. F-1 緩和策 (C12 ↔ C14 section 定数 parity) の test ID を含める
4. 既存 110 テストの非退行を回帰カテゴリとして明示する
