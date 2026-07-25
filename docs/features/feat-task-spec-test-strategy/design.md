---
status: confirmed
layer: feature-design
task: SYS-TASK-SPEC-TEST-STRATEGY-P02
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [docs/features/feat-task-spec-test-strategy/requirements-baseline.md]
architecture_refs: [arch-harness-hub-testing-qa]
---

# feat-task-spec-test-strategy 設計

> **位置づけ**: P02 (設計) の成果物。P01 baseline の DEF-1..DEF-5 を決定論的に確定し、P05 が実装する対象を一意にする。本文書は「何をどこにどう書くか」を固定し、実装手段の裁量を残さない。

## 1. 設計原則

1. **単一 writer**: task spec 本文の検査は `validate-system-plan.py` (C12) だけが所有する。他 script / hook / agent が本文検査を持たない (既存契約の非拡張)。
2. **契約は JSON schema 正本に載せる**: 4 項目の構造は Python 定数ではなく `schemas/task-spec-test-strategy.schema.json` を正本とし、validator はそれを読んで検査する。
3. **非破壊の段階適用**: 既存 promoted 世代の再検証結果を変えない。新検査は契約バージョン宣言によって opt-in する optional な追加とする。
4. **silent skip の禁止**: 適用モードは validation report に必ず出力し、「検査されなかった」ことが緑に見えない状態にする。

## 2. DEF-1: section 見出しと 4 項目 (冪等性の判定単位)

### 2.1 見出しと組込位置

- 見出し: `## テスト戦略`
- 組込位置: `## スコープ外` の**直後**、`## Verification and evidence` の**直前**
- 根拠: scope (何を触るか) を受けてテスト範囲が決まり、その実行手段が Verification へ続く。読み順と依存順が一致する。

### 2.2 4 項目 (ラベル文字列と出現順序を固定)

| # | ラベル (行頭 `- ` + ラベル + `:`) | 由来 |
|---|---|---|
| 1 | `- テストレベル選定:` | qa-070 |
| 2 | `- カバレッジ目標:` | qa-071 / qa-075 |
| 3 | `- 層別方針:` | qa-072 |
| 4 | `- 保守性制約:` | qa-072 |

**この 4 ラベルの集合と順序が AC-3 (再生成冪等性) の判定単位**である。ラベル文字列・順序の変更は契約変更として `spec_contract_version` の minor 更新を要する。

### 2.3 各項目の必須内容 (機械検証可能な最小条件)

| 項目 | 必須マーカー | 判定 |
|---|---|---|
| テストレベル選定 | `単体` `結合` `境界値` `回帰` の 4 語 | 4 語すべてが本文に出現 |
| カバレッジ目標 | `80%` | 数値表現が出現 |
| 層別方針 | §4 の導出規則で必須化された層のマーカー | applicable な層すべてを充足 |
| 保守性制約 | `pixel` かつ `DOM` | 双方が出現 |

適用外の層・レベルは `N/A:` を伴う明示で表現する (`Workstream applicability` と同じ規約)。空欄による省略を許さない。

## 3. DEF-2: 必須化と既存世代非破壊性の両立方式

### 3.1 判定キー

`feature-package.json` に **optional** フィールド `spec_contract_version` (string, `^\d+\.\d+\.\d+$`) を追加する。

| 宣言値 | モード | テスト戦略 section の扱い |
|---|---|---|
| 未宣言 | `legacy` | 任意。ただし section が**存在する場合は** 4 項目検査を適用 (strict-if-present) |
| `>= 1.2.0` | `enforced` | 13 task spec 全件で必須。欠落は非0終了 |
| `< 1.2.0` | `legacy` | 同上 |

`1.2.0` を閾値とする根拠: テンプレート正本 `system-task-spec-template.md` の現行 `template_version: 1.1.0` の次 minor。テンプレートと package 契約を同一の数値で対応づけ、「どのテンプレートで生成されたか」を package 側から機械判定できるようにする。

### 3.2 非破壊性の論証

既存 promoted 世代 (`feature-package/feat-mvp-first-scheduling` 等) は

1. `spec_contract_version` を持たない → `legacy` モード
2. `## テスト戦略` 見出しを持たない → strict-if-present も発火しない

したがって新検査は violation を 1 件も追加せず、再検証結果 (status / validated_digest) は不変。**P08 がこれを実測で確認する**。

### 3.3 bypass 対策 (Goodhart 回避)

版宣言を省けば検査を回避できる構造なので、次の 3 点で封じる。

| 対策 | 実装先 | 効果 |
|---|---|---|
| テンプレート正本が section と 4 ラベルを含む | `references/system-task-spec-template.md` (`template_version: 1.2.0`) | 生成物が既定で section を持つ |
| 正本 ↔ validator 定数の parity test | `tests/test_task_spec_test_strategy_sections.py` | 正本から定数が drift したら赤くなる |
| 適用モードを report へ明示出力 | `validate()` 戻り値 `test_strategy_contract` | 未検査が緑に見えない |

architect agent (`system-dev-plan-architect.md`) の完了チェックリストへ「テスト戦略 section と `spec_contract_version` 宣言」を追加し、生成側の停止条件にも載せる。

## 4. DEF-3: 変更種別 → 必須層別方針の導出規則

入力は task spec の `## Workstream applicability` 節。各行が `- <Workstream>: N/A: <理由>` なら非適用、それ以外を applicable と判定する (既存テンプレート規約の再利用であり新規記法を導入しない)。

| Workstream | 導出される層 | 必須マーカー | 由来 |
|---|---|---|---|
| Frontend | `frontend` | `behavior` | qa-072 (accessible role/ラベル選択の behavior ベース) |
| Backend / API / Data | `backend` | `API 契約` かつ `DB 結合` | qa-072 |
| Infrastructure | `infrastructure` | `IaC` かつ `smoke` | qa-072 |
| Security / Quality / Documentation / Operations | (層を導出しない) | — | 層別テスト方針の対象外 |

- Backend / API / Data のいずれか 1 つ以上が applicable なら `backend` 層が必須になる (OR 結合)。
- 導出された層が 0 件の場合 (ドキュメント専業 task 等) は、`層別方針` に `N/A:` を伴う適用外理由を要求する。空文字は許さない。
- これが **AC-4 (テストレベル選定が変更内容の種別に対応する層別方針を含む)** の機械的裏付けとなる。

## 5. DEF-4: fail-closed が拒否すべき欠落パターン

| # | 悪性パターン | violation code | 適用モード |
|---|---|---|---|
| R-1 | `## テスト戦略` section 欠如 | `task-spec-test-strategy-missing` | enforced のみ |
| R-2 | section 重複 | `task-spec-test-strategy-duplicate` | 両モード |
| R-3 | section 本文が空 | `task-spec-test-strategy-empty` | 両モード (存在時) |
| R-4 | 4 項目の一部欠落 | `task-spec-test-strategy-item-missing` | 両モード (存在時) |
| R-5 | 4 項目の順序入替 | `task-spec-test-strategy-item-order` | 両モード (存在時) |
| R-6 | 項目本文が空 | `task-spec-test-strategy-item-empty` | 両モード (存在時) |
| R-7 | 必須マーカー欠落 (4 レベル語 / `80%` / `pixel`+`DOM`) | `task-spec-test-strategy-content` | 両モード (存在時) |
| R-8 | applicable な層に対応する層別方針の欠落 | `task-spec-test-strategy-layer` | 両モード (存在時) |
| R-9 | section 配置順が スコープ外 → Verification の間にない | `task-spec-test-strategy-placement` | 両モード (存在時) |

すべて既存 `violations` 配列へ追加され、1 件でも積まれれば `validate()` は `status=fail` を返し `main()` が **exit 2** で終了する (既存経路の再利用であり新規終了コードを導入しない)。

## 6. DEF-5: schema ファイルの役割

`plugins/system-dev-planner/schemas/task-spec-test-strategy.schema.json` は**実際に読まれる検査正本**とする。

処理の流れ:

```
task spec (Markdown)
  → parse_test_strategy(text)        # 見出し + 4 ラベルを構造化 dict へ写像
  → {"schema_version": "1.0.0", "test_levels": {...}, "coverage_target": {...},
     "layer_policies": {...}, "maintainability_constraints": {...}}
  → schema_violations(value, _load_schema("task-spec-test-strategy.schema.json"))
  → violations
```

既存の `schema_violations()` (JSON Schema サブセット実装) をそのまま再利用し、新しい検証エンジンを持ち込まない。schema には `required` / `pattern` / `minLength` / `enum` のみを使い、既存サブセットが対応する範囲に収める。

導出規則 (§4) の「applicable な層を充足しているか」は schema 単体では表現できない条件付き検査のため、Python 側の `test_strategy_layer_violations()` が担当する。**責務分界**: 形状 = schema、文脈依存の充足 = Python。

## 7. 実装対象一覧 (P05 への引き渡し)

| # | ファイル | 変更種別 | 内容 |
|---|---|---|---|
| I-1 | `schemas/task-spec-test-strategy.schema.json` | 新規 | §2.2/§2.3 の構造契約 |
| I-2 | `schemas/feature-execution-package.schema.json` | 変更 | optional `spec_contract_version` 追加 |
| I-3 | `scripts/validate-system-plan.py` | 変更 | parse / schema 検査 / 導出規則 / モード判定 / report 出力 |
| I-4 | `references/system-task-spec-template.md` | 変更 | section 組込・`template_version` 1.2.0 |
| I-5 | `agents/system-dev-plan-architect.md` | 変更 | 完了チェックリストへ section と版宣言を追加 |
| I-6 | `tests/test_task_spec_test_strategy_sections.py` | 新規 | R-1..R-9 と正本 parity |
| I-7 | `tests/test_task_spec_test_strategy_derivation.py` | 新規 | §4 導出規則と冪等性 |

> P05 の `resource_scope` は I-1 / I-3 / I-5 / I-6 / I-7 の 5 件。I-2 (同一 `schemas/` 配下の契約追加) と I-4 (テンプレート正本) は I-1/I-3 が宣言する契約の不可分な一部であり、同一 plugin 境界内の付随変更として扱う。P03 がこの境界判断を検証する。

## 8. exact-13 契約との非干渉

| 既存契約 | 本設計の影響 |
|---|---|
| `PHASES` = P01..P13 | 参照のみ。変更なし |
| `TASK_PATHS` 13 件 | 参照のみ。変更なし |
| `REQUIRED_TASK_SPEC_SECTIONS` 15 件 | **変更しない** (テスト戦略は別関数で条件付き検査) |
| 13-node DAG 検査 | 不変 |
| `canonical_digest` / manifest exact-set | 不変 (ファイル追加は staging 側でなく plugin 側) |

`REQUIRED_TASK_SPEC_SECTIONS` に足さないことが、非破壊性を成り立たせる中心的な判断である。

## 9. rollback

`spec_contract_version` の宣言を package 生成側から外せば全 task spec が legacy モードへ戻り、検査は section 非保持の世代に対して無効化される。schema / validator の追加コードはその状態で violation を生成しない。
