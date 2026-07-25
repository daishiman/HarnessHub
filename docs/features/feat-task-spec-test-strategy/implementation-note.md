---
status: confirmed
layer: feature-implementation
task: SYS-TASK-SPEC-TEST-STRATEGY-P05
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [docs/features/feat-task-spec-test-strategy/design.md, docs/features/feat-task-spec-test-strategy/design-review.md, docs/features/feat-task-spec-test-strategy/test-plan.md]
---

# feat-task-spec-test-strategy 実装記録 (P05)

> **位置づけ**: P05 (実装) の実装記録。P03 design-review の finding F-2 が課した記録義務 (「P05 は resource_scope 外の 3 ファイルを変更した事実と本 finding への参照を実装記録に残す」) を果たす。P07 / P10 はここに申告された逸脱だけを「承認済み逸脱」として扱い、未申告の scope 逸脱と区別する。

## 1. 実装した検査経路

```
task spec (Markdown)
  → parse_test_strategy(text)              # 見出し・配置・4 項目の有無/順序/空を構造検査し dict へ写像
  → {"schema_version": "1.0.0", "test_levels": ..., "coverage_target": ...,
     "layer_policies": ..., "maintainability_constraints": ...}
  → schema_violations(value, task-spec-test-strategy.schema.json)   # 必須語 (内容) の検査
  → derive_required_layers(text) × LAYER_MARKERS                     # 文脈依存 (層別) の検査
  → violations
```

責務分界は P02 design.md §6 のとおり。**形 (shape) は schema**、**文脈 (context) は Python** が持つ。語彙の改訂は schema の pattern 変更だけで完結し、Python を触らない。

## 2. 変更ファイル一覧

### 2.1 P05 task spec の resource_scope 内 (5 件)

| ファイル | 変更 | 内容 |
|---|---|---|
| `plugins/system-dev-planner/schemas/task-spec-test-strategy.schema.json` | 新規 | 4 項目の `required` と必須語 `pattern` の正本 |
| `plugins/system-dev-planner/scripts/validate-system-plan.py` | 変更 | 定数群 / `_task_spec_sections` / `parse_test_strategy` / `derive_required_layers` / `test_strategy_violations` / `test_strategy_mode` / `validate()` への配線 / report への `test_strategy_contract` 出力 |
| `plugins/system-dev-planner/agents/system-dev-plan-architect.md` | 変更 | §5.3 完了チェックリストへ停止条件 1 件を追加 |
| `plugins/system-dev-planner/tests/test_task_spec_test_strategy_sections.py` | 新規 | TS-A01..A15 |
| `plugins/system-dev-planner/tests/test_task_spec_test_strategy_derivation.py` | 新規 | TS-B01..B10 |

### 2.2 承認済み逸脱 (F-2 / P03 §4.1 の CONDITIONAL PASS で承認された 3 件)

| ファイル | 変更 | 承認根拠 |
|---|---|---|
| `plugins/system-dev-planner/references/system-task-spec-template.md` | 変更 (`template_version` 1.1.0→1.2.0、`## テスト戦略` 追加、正本追記に契約説明を追加) | goal-spec scope_in SI-2 が名指しする「task spec テンプレート」の正本そのもの |
| `plugins/system-dev-planner/skills/run-system-dev-plan/prompts/R3-emit.md` | 変更 (制約 1 件・完了チェック 1 件・参照リソース 1 行を追加、v1.1.0→v1.2.0) | テンプレートの section 数と版を宣言する生成側指示。据え置くと正本と矛盾し、validator だけが要求して生成器が永久に出力しない空洞化を招く |
| `plugins/system-dev-planner/assets/validation-contract-baseline.json` | 変更 (`1.2.0` 契約の定義と bootstrap 2 世代の `1.1.0` 登録を追加) | 契約 version の解決正本。ここへ登録しない限り既存 promoted 世代が新契約で FAIL する |

### 2.3 記録目的の追加 (本ファイル)

| ファイル | 変更 | 根拠 |
|---|---|---|
| `docs/features/feat-task-spec-test-strategy/implementation-note.md` | 新規 | F-2 が課した記録義務そのもの。feature の docs namespace 内 |

### 2.4 境界の上限 (変更しなかったもの)

- `plugins/dev-graph/templates/system-task-spec.md` (draft コピー) は**変更していない**。P03 §4.1 が明示的に除外し、P13 の申し送り対象としたため。
- `plugins/system-dev-planner/scripts/build-system-handoff.py` (C14) へテスト戦略検査を**複製していない**。F-1 の緩和策は「複製を増やさず drift 検出機構を置く」であり、TS-A13 がその機構である。

## 3. 非破壊性の実装側実測 (P08 が同条件で再測定する)

| package | status | validated_digest | mode |
|---|---|---|---|
| `feature-package/feat-mvp-first-scheduling` | pass | `sha256:55a34fe2a62841c0175b568204b4a1fde8e1fd04d1c0496bb4e0444e3cf86387` | legacy |
| `feature-package/feat-task-spec-test-strategy` | pass | `sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae` | legacy |

いずれも P03 §3.3 に記録した導入前の値と一致する (violations 0 件)。

## 4. 実行コマンドの読み替え

P05..P13 の task spec が列挙する `validate-system-plan.py --repo-root . --staging .` は staging に repository root 自身を指す形であり、そのままでは実行できない (staging generation ではない)。テンプレート正本 §Verification and evidence が「plan validator の再実行は世代非依存の `--feature-package` を使う」と定めているため、本 feature の全 phase では次の形で実行し、証跡にもこの形で記録する。

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-task-spec-test-strategy
```

この読み替えは P10 final-review の横断整合確認対象とし、P13 の改善 finding として正本へ書き戻す。

## 5. 意図的に採らなかった選択肢

| 選択肢 | 不採用の理由 |
|---|---|
| `REQUIRED_TASK_SPEC_SECTIONS` へ 16 番目として追加 | 既 promoted 世代が即 FAIL へ転落し、acceptance 7 (exact-13 非退行) と scope_out 7 に抵触する |
| 契約版に関係なく無条件必須化 | 同上。段階適用の無効化条件を 1 つも持たない設計になる |
| 版未宣言なら section 内容も検査しない | 「書いたが壊れている」を素通りさせ fail-closed が形骸化する。strict-if-present を採用 |
| `layer_policies` の必須語を schema の `pattern` で表現 | どの層が必須かは `Workstream applicability` 依存であり、JSON Schema では文脈を参照できない |

## 6. 設計からの差分: 版の自己申告 → canonical digest 台帳

P02 設計は `feature-package.json` の optional な `spec_contract_version` を判定キーに置いていた。実装
時点でこれを **canonical digest → contract_version の台帳**
(`plugins/system-dev-planner/assets/validation-contract-baseline.json`) 方式へ差し替えている。

| 論点 | 自己申告方式 | 台帳方式 (採用) |
|---|---|---|
| 判定キーの改竄耐性 | 宣言値は digest 対象集合の外にあり、1 行足すだけで免除を取れる | digest は再計算値であり、書き換えれば digest 自体が変わって免除が外れる |
| 既定値の倒れる向き | 宣言の**省略**が免除を意味する = fail-open | 未登録が最厳格の `CONTRACT_VERSION_LATEST` = fail-closed |
| 台帳の欠落・削除 | — | すべて厳格側へ倒れる (緩和経路にならない) |
| package schema | optional プロパティの追加が必要 | package 側に追加フィールド不要 (`feature-execution-package.schema.json` は無変更) |

差し替えは AC / acceptance の文言を変えない。**「既存 promoted 世代の再検証結果を変えない」という
性質の実現手段を、Goodhart 耐性の高い側へ移しただけ**である。免除の受入条件は台帳の
`policy.amendment` に明文化し、「現行契約で pass する package は登録しない」を条件に置いた。

設計文書側の記述 (`design.md` §3、`design-review.md` §3.2、`operations.md` §4、
`compatibility-note.md` §4-§6、テンプレート正本、R3-emit、architect agent) は本方式へ同期済み。
凍結証跡 (`eval-log/system-dev-planner/task-spec-test-strategy/`) は当時の判断記録として
旧記述のまま残す。
