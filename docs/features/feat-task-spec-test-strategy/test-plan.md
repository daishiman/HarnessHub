---
status: confirmed
layer: feature-design
task: SYS-TASK-SPEC-TEST-STRATEGY-P04
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [docs/features/feat-task-spec-test-strategy/design.md, docs/features/feat-task-spec-test-strategy/design-review.md]
---

# feat-task-spec-test-strategy テスト設計

> **位置づけ**: P04 (テスト設計) の成果物。acceptance 7 件と P02 §5 の悪性パターン R-1..R-9 へ実行可能な test ID を割り当てる。P05 はここで定義した ID の実装だけを行い、P06 が実行、P07/P10 が実行済み証跡のみで判定する (trace rule)。

## 1. テストレベル選定 (本 feature 自身への適用)

本 feature は system-dev-planner の仕様生成契約の改修であり、Hub 本体の UI / API / DB を触らない。したがって適用するレベルは次のとおり。

| レベル | 適用 | 対象 |
|---|---|---|
| 単体 | 適用 | `parse_test_strategy()` / `test_strategy_violations()` / `derive_required_layers()` / schema 整合 |
| 結合 | 適用 | `validate()` 全体経路 + `main()` の exit code + 既存 promoted 世代の再検証 |
| 境界値 | 適用 | `spec_contract_version` の閾値 (1.1.0 / 1.2.0 / 2.0.0 / 不正形式)、項目 0 件・空文字 |
| 既存回帰 | 適用 | 既存 110 テストの全件 PASS 維持、C12↔C14 定数 parity |

- **カバレッジ目標**: 既定 80%。本 feature の実測対象は追加 Python 関数群 (`parse_test_strategy` / `test_strategy_violations` / `derive_required_layers`) とし、R-1..R-9 の全分岐に到達する test ID を割り当てることで分岐網羅として満たす。
- **層別方針**: 本 feature は dev-tooling 層のみ。フロント/バックエンド/インフラいずれの実行基盤も触らないため層別方針は `N/A` (scope_out 1)。
- **保守性制約**: テストは validator の**公開関数と violation code** に対して書き、内部の正規表現リテラルや行番号に依存しない。pixel 位置・DOM 構造依存は本 feature に存在しない (UI なし)。

## 2. test ファイル配置

| ファイル | 責務 |
|---|---|
| `plugins/system-dev-planner/tests/test_task_spec_test_strategy_sections.py` | section 構造・fail-closed 実効性・正本 parity |
| `plugins/system-dev-planner/tests/test_task_spec_test_strategy_derivation.py` | 導出規則・冪等性・契約版境界値 |

既存 `test_runtime.py` の `make_fixture()` / `task_spec_text()` を再利用し、fixture 生成器を新設しない (重複実装の回避)。

## 3. test ID 一覧 — sections

| test ID | メソッド名 | 検証内容 | 悪性/良性 | R- | P05 実装対象 |
|---|---|---|---|---|---|
| TS-A01 | `test_legacy_package_without_section_passes` | 版未宣言 + section 無し → violation 0 | 良性 | — | validator |
| TS-A02 | `test_enforced_package_without_section_is_rejected` | 版 1.2.0 + section 無し → `task-spec-test-strategy-missing` | 悪性 | R-1 | validator |
| TS-A03 | `test_enforced_package_with_complete_section_passes` | 版 1.2.0 + 4 項目完備 → violation 0 | 良性 | — | validator / template |
| TS-A04 | `test_malformed_duplicate_section_is_rejected` | section 2 個 → `…-duplicate` | 悪性 | R-2 | validator |
| TS-A05 | `test_malformed_empty_section_body_is_rejected` | section 本文空 → `…-empty` | 悪性 | R-3 | validator |
| TS-A06 | `test_malformed_partial_item_loss_is_rejected` | 4 項目のうち 1 件欠落 × 4 通り → `…-item-missing` | 悪性 | R-4 | validator |
| TS-A07 | `test_malformed_item_order_swap_is_rejected` | 項目順序入替 → `…-item-order` | 悪性 | R-5 | validator |
| TS-A08 | `test_malformed_empty_item_body_is_rejected` | 項目のラベルのみで本文空 → `…-item-empty` | 悪性 | R-6 | validator |
| TS-A09 | `test_malformed_missing_required_marker_is_rejected` | 4 レベル語 / `80%` / `pixel` / `DOM` の各欠落 → `…-content` | 悪性 | R-7 | validator / schema |
| TS-A10 | `test_malformed_section_placement_is_rejected` | 配置が スコープ外→Verification の間にない → `…-placement` | 悪性 | R-9 | validator |
| TS-A11 | `test_legacy_package_with_malformed_section_is_rejected` | 版未宣言でも section があれば 4 項目検査が発火 | 悪性 | R-3..R-8 | validator |
| TS-A12 | `test_template_reference_declares_section_and_items` | テンプレート正本に見出しと 4 ラベルが正順で存在 | 良性 | — | template |
| TS-A13 | `test_required_sections_parity_between_c12_and_c14` | C12 ↔ C14 の 15 section 定数が一致 (F-1 緩和) | 良性 | — | tests のみ |
| TS-A14 | `test_cli_exit_code_is_two_on_missing_section` | `main()` が exit 2 を返す (fail-closed 実効性) | 悪性 | R-1 | validator |
| TS-A15 | `test_report_declares_contract_mode` | report に `test_strategy_contract` が出力される (silent skip 禁止) | 良性 | — | validator |

## 4. test ID 一覧 — derivation

| test ID | メソッド名 | 検証内容 | 悪性/良性 | P05 実装対象 |
|---|---|---|---|---|
| TS-B01 | `test_frontend_applicable_requires_behavior_policy` | Frontend applicable で `behavior` 欠落 → `…-layer` | 悪性 | derivation rule |
| TS-B02 | `test_backend_applicable_requires_contract_and_db_policy` | Backend applicable で `API 契約`/`DB 結合` 欠落 → `…-layer` | 悪性 | derivation rule |
| TS-B03 | `test_infrastructure_applicable_requires_iac_and_smoke_policy` | Infrastructure applicable で `IaC`/`smoke` 欠落 → `…-layer` | 悪性 | derivation rule |
| TS-B04 | `test_api_or_data_alone_still_requires_backend_policy` | API のみ / Data のみでも backend 層が必須 (OR 結合) | 悪性 | derivation rule |
| TS-B05 | `test_all_layers_not_applicable_requires_explicit_na` | 全層 N/A のとき `N/A:` 明示で PASS・空文字で FAIL | 両方 | derivation rule |
| TS-B06 | `test_parse_is_idempotent_for_identical_input` | 同一本文を 2 回 parse して同一 dict (項目集合と順序) | 良性 | parser |
| TS-B07 | `test_violations_are_idempotent_for_identical_input` | 同一入力の violation 列が完全一致 | 良性 | validator |
| TS-B08 | `test_schema_required_matches_canonical_item_labels` | schema 正本の `required` が 4 項目と一致 (定数 drift 検出) | 良性 | schema |
| TS-B09 | `test_contract_version_threshold_boundaries` | 1.1.0→legacy / 1.2.0→enforced / 2.0.0→enforced / 不正形式→schema violation | 境界値 | validator / schema |
| TS-B10 | `test_existing_generation_shape_stays_passing` | 15 section のみの既存形状 package が pass のまま (AC-7 実装側根拠) | 良性 | validator |
| TS-B11 | `test_non_layer_workstreams_derive_no_layer` | Security/Quality/Documentation/Operations は層を導出しない | 良性 | derivation rule |
| TS-B12 | `test_layer_order_is_stable_for_multiple_applicable_workstreams` | 複数層 applicable でも導出順が固定 (violation 列決定性の前提) | 良性 | derivation rule |

> TS-B11 / TS-B12 は P05 実装中に追加した被覆。導出規則の「導出しない側」と「順序の安定性」は R-8 の裏面であり、P04 時点で未割当だったため実装と同時に追記した (P06 証跡・P10 横断整合の対象)。

## 5. acceptance ↔ test ID 対応表 (AC 7 件 × 1 件以上)

| acceptance | test ID |
|---|---|
| AC-1 テスト戦略 section を欠いた入力を非0終了で拒否 | TS-A02 / TS-A06 / TS-A14 |
| AC-2 4 項目完備の task spec が PASS | TS-A03 / TS-A12 |
| AC-3 再生成で項目集合と順序が一致 (冪等) | TS-A07 / TS-B06 / TS-B07 |
| AC-4 テストレベル選定が変更種別に対応する層別方針を含む | TS-B01 / TS-B02 / TS-B03 / TS-B04 / TS-B05 |
| AC-5 カバレッジ目標が既定 80% で層別上書き可能 | TS-A09 / TS-B08 |
| AC-6 保守性制約に pixel 位置・DOM 構造依存の禁止を明記 | TS-A09 / TS-B08 |
| AC-7 exact-13 契約と 13-node DAG 検査が非退行 | TS-A01 / TS-A13 / TS-B10 + 既存 110 テスト全件 |

未割当の acceptance: **0 件**。

## 6. P09 (悪性ケース QA) が選択する部分集合

P09 の automated command は `pytest … -k malformed` である。したがって**悪性ケースのメソッド名には `malformed` を含める**ことを P05 の実装制約とする。`-k malformed` で選択される集合は次のとおり。

| P09 が要求する悪性ケース | 選択される test ID |
|---|---|
| section 部分欠落 | TS-A06 (`test_malformed_partial_item_loss_is_rejected`) |
| 見出し順序入替 | TS-A07 (`test_malformed_item_order_swap_is_rejected`) / TS-A10 (`test_malformed_section_placement_is_rejected`) |
| 空本文 | TS-A05 (`test_malformed_empty_section_body_is_rejected`) / TS-A08 (`test_malformed_empty_item_body_is_rejected`) |
| (追加被覆) 重複 / マーカー欠落 / legacy strict-if-present | TS-A04 / TS-A09 / TS-A11 |

## 7. 回帰カテゴリ (exact-13 非退行)

| 対象 | 期待 | 実行 |
|---|---|---|
| `plugins/system-dev-planner/tests` 既存 110 テスト | 全件 PASS | P06 |
| `feature-package/feat-mvp-first-scheduling` 再検証 | status=pass / digest 不変 | P06 / P08 |
| `feature-package/feat-task-spec-test-strategy` 再検証 | status=pass / digest 不変 | P06 / P08 |
| `plugins/dev-graph/tests` (exact-13 fixture 利用) | 非退行 | P06 |

## 8. 証跡形式 (P06 への引き渡し)

`eval-log/system-dev-planner/task-spec-test-strategy/test-run-p06.json` に次を記録する。

```json
{
  "schema_version": "1.0.0",
  "executed_at": "<ISO8601>",
  "results": [{"test_id": "TS-A01", "name": "...", "category": "...", "status": "pass|fail"}],
  "categories": {"section-missing-rejection": "...", "complete-pass": "...",
                 "regeneration-idempotency": "...", "exact13-non-regression": "..."},
  "commands": [{"command": "...", "exit_code": 0}]
}
```

`results[].status` は `pass` / `fail` のみを取る (P07 の automated command がこの不変条件を検査する)。
