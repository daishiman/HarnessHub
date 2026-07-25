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
| 1 | `- テストレベル選定:` | qa-076 |
| 2 | `- カバレッジ目標:` | qa-077 / qa-081 |
| 3 | `- 層別方針:` | qa-078 |
| 4 | `- 保守性制約:` | qa-078 |

**この 4 ラベルの集合と順序が AC-3 (再生成冪等性) の判定単位**である。ラベル文字列・順序の変更は契約変更として `CONTRACT_VERSION_LATEST` の minor 更新を要する (現行世代は台帳未登録ゆえ自動的に新契約で検証される)。

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

判定キーは **package の canonical digest** であり、package が自己申告する版ではない。契約 version
台帳 `plugins/system-dev-planner/assets/validation-contract-baseline.json` が
`canonical_digest → contract_version` の対応を持ち、`resolve_contract_version()` がこれを引く。

| digest の台帳登録 | 解決される契約 | テスト戦略 section の扱い |
|---|---|---|
| 未登録 (= 現行世代) | `CONTRACT_VERSION_LATEST` (`1.2.0`) | 13 task spec 全件で必須。欠落は非0終了 |
| `1.1.0` で登録済み | `1.1.0` | 任意。ただし section が**存在する場合は** 4 項目検査を適用 (strict-if-present) |
| `1.0.0` で登録済み | `1.0.0` | 同上 |
| digest 再計算不能 | `CONTRACT_VERSION_LATEST` | 必須 (fail-closed) |

**なぜ自己申告を採らないか**: `feature-package.json` の宣言値は digest 対象集合の外にあり改竄できる。
申告値で免除を決めると、台帳の fail-closed が「1 行足すだけ」で無効化される。加えて宣言の**省略**が
免除を意味する設計は fail-open であり、既定が緩い側に倒れる。台帳方式では未登録が最も厳格な
LATEST へ倒れるので、台帳の欠落・削除・改変はいずれも緩和経路にならない。

契約 version 間の差分 flag は台帳側 (`CONTRACT_VERSIONS`) に、本文検査の実装は validator 側に置く。
これは既存の `inner_goal_seek` / `p13_writeback` と同じ配置規則である。

### 3.2 非破壊性の論証

契約 `1.2.0` 導入前に promote された 2 世代を台帳へ `1.1.0` で登録する。

| canonical digest | package | promoted |
|---|---|---|
| `sha256:55a34fe2…` | `feature-package/feat-mvp-first-scheduling` | 2026-07-23T07:08:08Z |
| `sha256:7d185f45…` | `feature-package/feat-task-spec-test-strategy` | 2026-07-24T23:09:08Z |

2 件目は本 feature 自身の実行計画 package である。テスト戦略を必須化する実装より前に promote されて
おり (bootstrap)、content-addressed ゆえ遡及追記できないため当時の契約で再検証する。

両者とも `1.1.0` で残違反ゼロを実測確認済み (`status=pass` / `violations=0` /
`test_strategy_contract.mode=legacy`)。よって新検査は既存世代へ violation を 1 件も追加しない。
**P08 がこれを実測で確認する**。

### 3.3 bypass 対策 (Goodhart 回避)

| 対策 | 実装先 | 効果 |
|---|---|---|
| 免除キーを再計算 digest に固定 | `resolve_contract_version()` | manifest の申告値では免除を取れない |
| 未知 digest は LATEST へ倒す | 同上 | 台帳を消す/汚す方向は必ず厳格側へ倒れる |
| 台帳追加の受入条件を明文化 | `validation-contract-baseline.json` の `policy.amendment` | 現行契約で pass する package は登録しない |
| テンプレート正本が section と 4 ラベルを含む | `references/system-task-spec-template.md` (`template_version: 1.2.0`) | 生成物が既定で section を持つ |
| 正本 ↔ validator 定数の parity test | `tests/test_task_spec_test_strategy_sections.py` | 正本から定数が drift したら赤くなる |
| 適用モードを report へ常時出力 | `validate()` 戻り値 `test_strategy_contract` | 「検査した」と「素通りした」を証跡で区別でき、未検査が緑に見えない |

architect agent (`system-dev-plan-architect.md`) の完了チェックリストへ「テスト戦略 section の
4 項目充足」を追加し、生成側の停止条件にも載せる。package 側に宣言フィールドは持たせない。

## 4. DEF-3: 変更種別 → 必須層別方針の導出規則

入力は task spec の `## Workstream applicability` 節。各行が `- <Workstream>: N/A: <理由>` なら非適用、それ以外を applicable と判定する (既存テンプレート規約の再利用であり新規記法を導入しない)。

| Workstream | 導出される層 | 必須マーカー | 由来 |
|---|---|---|---|
| Frontend | `frontend` | `behavior` | qa-078 (accessible role/ラベル選択の behavior ベース) |
| Backend / API / Data | `backend` | `API 契約` かつ `DB 結合` | qa-078 |
| Infrastructure | `infrastructure` | `IaC` かつ `smoke` | qa-078 |
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
| I-2 | `assets/validation-contract-baseline.json` | 変更 | `1.2.0` 定義と bootstrap 2 世代の `1.1.0` 登録 |
| I-3 | `scripts/validate-system-plan.py` | 変更 | parse / schema 検査 / 導出規則 / モード判定 / report 出力 |
| I-4 | `references/system-task-spec-template.md` | 変更 | section 組込・`template_version` 1.2.0 |
| I-5 | `agents/system-dev-plan-architect.md` | 変更 | 完了チェックリストへ section 4 項目の充足を追加 |
| I-6 | `tests/test_task_spec_test_strategy_sections.py` | 新規 | R-1..R-9 と正本 parity |
| I-7 | `tests/test_task_spec_test_strategy_derivation.py` | 新規 | §4 導出規則と冪等性 |

> P05 の `resource_scope` は I-1 / I-3 / I-5 / I-6 / I-7 の 5 件。I-2 (契約 version 台帳) と I-4 (テンプレート正本) は I-1/I-3 が宣言する契約の不可分な一部であり、同一 plugin 境界内の付随変更として扱う。P03 がこの境界判断を検証する。

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

`CONTRACT_VERSIONS["1.2.0"]["test_strategy"]` を `False` に戻せば、契約 version の解決結果に関わらず section 必須化だけが無効化される (strict-if-present の本文検査は残る)。`CONTRACT_VERSION_LATEST` を `1.1.0` へ戻せば台帳登録済み世代も含めて完全に旧挙動へ戻る。いずれも台帳側 1 箇所の変更で完結し、validator の検査実装には触れない。
