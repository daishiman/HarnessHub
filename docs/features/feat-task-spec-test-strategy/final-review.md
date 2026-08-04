---
status: confirmed
layer: feature-review
task: SYS-TASK-SPEC-TEST-STRATEGY-P10
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [docs/features/feat-task-spec-test-strategy/requirements-baseline.md, docs/features/feat-task-spec-test-strategy/design.md, docs/features/feat-task-spec-test-strategy/design-review.md, docs/features/feat-task-spec-test-strategy/test-plan.md, docs/features/feat-task-spec-test-strategy/implementation-note.md, eval-log/system-dev-planner/task-spec-test-strategy/test-run-p06.json, docs/features/feat-task-spec-test-strategy/acceptance-report.md, docs/features/feat-task-spec-test-strategy/compatibility-note.md, eval-log/system-dev-planner/task-spec-test-strategy/qa-fail-closed-report.json]
verdict: CONSISTENT-with-recorded-deviations
---

# feat-task-spec-test-strategy 最終レビュー (P01..P09 横断整合)

> **位置づけ**: P10 (最終レビュー) の成果物。P01..P09 の成果物を突き合わせ、テスト戦略 4 項目・fail-closed validator・再生成冪等性・exact-13 非退行の 4 観点で齟齬の有無を判定する。判定は各成果物の記載と実コード/実証跡の照合に基づき、実装を読み直して「たぶん整合している」とは書かない。

## 0. 総合判定

| 項目 | 値 |
|---|---|
| 判定 | **CONSISTENT-with-recorded-deviations** |
| 未解決の齟齬 (blocking) | **0 件** |
| 記録済み逸脱 (承認済み・申告あり) | 3 件 (D-1 / D-2 / D-3) |
| 表記 drift (実害なし・訂正済み or 申し送り) | 2 件 (N-1 / N-2) |
| 差し戻し先 phase | なし |

## 1. 成果物の存在と連鎖 (P01→P09)

| phase | 成果物 | 存在 | consumes 宣言が前 phase を指しているか |
|---|---|---|---|
| P01 | `docs/features/…/requirements-baseline.md` | あり | goal-spec (source) を明示 |
| P02 | `docs/features/…/design.md` | あり | P01 baseline |
| P03 | `docs/features/…/design-review.md` | あり | P02 design + P01 baseline |
| P04 | `docs/features/…/test-plan.md` | あり | P02 design + P03 review |
| P05 | `docs/features/…/implementation-note.md` | あり | P04 test-plan |
| P06 | `eval-log/…/test-run-p06.json` (+ `.xml`) | あり | P05 実装物 |
| P07 | `docs/features/…/acceptance-report.md` | あり | P06 証跡 + P01 baseline |
| P08 | `docs/features/…/compatibility-note.md` | あり | P07 + validator |
| P09 | `eval-log/…/qa-fail-closed-report.json` (+ `.xml`) | あり | schema + validator + P08 |

連鎖の切断: **なし**。各 phase が直前の成果物のみを根拠にしており、P07/P10 が実装コードを再読して判定する形にはなっていない (trace rule 遵守)。

## 2. 観点 1: テスト戦略 4 項目の一貫性

4 項目のラベル文字列と順序は冪等性の判定単位そのものなので、全成果物で一字一句一致していなければならない。

| 出所 | テストレベル選定 | カバレッジ目標 | 層別方針 | 保守性制約 | 順序 |
|---|---|---|---|---|---|
| P01 §6 (TS-1..TS-4) | ✓ | ✓ | ✓ | ✓ | 一致 |
| P02 §2.2 (DEF-1 確定) | ✓ | ✓ | ✓ | ✓ | 一致 |
| 実装 `TEST_STRATEGY_ITEMS` | ✓ | ✓ | ✓ | ✓ | 一致 |
| schema 正本 `required` | `test_levels` | `coverage_target` | `layer_policies` | `maintainability_constraints` | 一致 (対応写像) |
| テンプレート正本 `## テスト戦略` | ✓ | ✓ | ✓ | ✓ | 一致 |
| R3-emit.md §2.4 生成指示 | ✓ | ✓ | ✓ | ✓ | 一致 |

- ラベル ↔ schema キーの対応は `TEST_STRATEGY_ITEMS` が唯一の写像表であり、TS-B08 (`test_schema_required_matches_canonical_item_labels`) が drift を検出する。定数の二重定義は存在しない。
- 必須マーカーの一貫性: P01 §6 が要求した最小条件 (4 レベル語 / `80%` / `pixel`+`DOM`) は、P02 §2.3 → schema の `pattern` へそのまま写っている。**要求を弱めた箇所も、schema 独自に強めた箇所もない**。

**齟齬: なし。**

## 3. 観点 2: fail-closed validator (R-1..R-9 の全経路)

P02 §5 が列挙した 9 悪性パターンと、実装の violation code・テスト ID・実測を突き合わせた。

| R- | violation code | 実装位置 | test ID | P06 実測 | P09 exit code 実測 |
|---|---|---|---|---|---|
| R-1 | `…-missing` | `validate-system-plan.py:335` | TS-A02 / TS-A14 | pass | **2** (section-missing) |
| R-2 | `…-duplicate` | `:271` | TS-A04 | pass | **2** (duplicate-section) |
| R-3 | `…-empty` | `:281` | TS-A05 | pass | **2** (empty-section-body) |
| R-4 | `…-item-missing` | `:289` | TS-A06 / TS-A11 | pass | **2** (partial-item-loss / legacy-strict-if-present) |
| R-5 | `…-item-order` | `:292` | TS-A07 | pass | **2** (item-order-swap) |
| R-6 | `…-item-empty` | `:300` | TS-A08 | pass | **2** (empty-item-body) |
| R-7 | `…-content` | `:339` | TS-A09 | pass | **2** (missing-required-marker) |
| R-8 | `…-layer` | `:344` | TS-B01..B05 | pass | (P09 対象外。P06 で被覆) |
| R-9 | `…-placement` | `:277` | TS-A10 | pass | **2** (section-placement) |

- 未実装の R- パターン: **0 件**。未テストの violation code: **0 件**。
- P09 は 9 悪性ケース全件で `exit_code=2` かつ `sole_cause_is_test_strategy=true` を実測している。すなわち「別の violation のついでに落ちた」ケースは 1 件もない。
- 対照ケース `control-conformant` は同一経路で `exit_code=0` / violation 0 件。**「何を入れても赤い検査」ではない**ことが同じ証跡内で示されている。

**齟齬: なし。**

### 3.1 適用モードの表明 (silent skip 禁止)

P02 §1-4 の「適用モードを report へ必ず出力する」は `test_strategy_contract` として実装され、TS-A15 が検査し、P06/P08/P09 の全証跡がこのフィールドを記録している (`legacy` / `enforced` の別が証跡から常に読める)。**検査が走らなかったことが緑に見える経路は残っていない。**

## 4. 観点 3: 再生成冪等性 (AC-3)

| 主張 | 出所 | 裏付け |
|---|---|---|
| 項目集合と順序が判定単位 | P02 §2.2 | 順序入替は R-5 で violation (TS-A07) |
| 同一入力の parse が同一 dict | P04 TS-B06 | pass |
| 同一入力の violation 列が完全一致 | P04 TS-B07 | pass |
| 複数層 applicable でも導出順が固定 | TS-B12 (P05 追加) | pass |
| テンプレート正本が既定で section を出力 | P02 §3.3 bypass 対策 | TS-A12 pass / `template_version: 1.2.0` |

`derive_required_layers()` が `["frontend", "backend", "infrastructure"]` の固定順を返す設計は、violation 列の決定性 (= 同一入力なら同一証跡) の前提であり、TS-B12 がこれを固定している。**冪等性は「順序を検査する」ことと「順序を生成する」ことの両側で担保されている。**

**齟齬: なし。**

## 5. 観点 4: exact-13 契約・13-node DAG の非退行

| 測定 | 出所 | 値 |
|---|---|---|
| `REQUIRED_TASK_SPEC_SECTIONS` 件数 | 実装 / TS-A13 | 15 (16 へ増やしていない) |
| C12 ↔ C14 の 15 section parity | TS-A13 (F-1 緩和策) | 一致 |
| 既存 promoted 世代 2 件の status | P06 commands / P08 §1 | 双方 pass |
| 同 validated_digest | P03 §3.3 ↔ P08 §1 | 導入前後で一致 |
| task spec 13 / node 13 / edge 12 | P08 §3 / P09 `exact13_shape_invariance` | 全ケース一致 |
| 回帰スイート | P06 / P08 / P09 | 137 passed (exit 0) |

- P09 は **violation の有無と独立に** staging の実形状 (13 spec / 13 node / 12 edge / P01..P13 順) を数えており、「テスト戦略検査で早期に落ちたため 13 件契約の測定自体が抜けた」という測定漏れを排除している。
- 既存 110 件 + 新規 27 件 = 137 件。P01 §9 の実測ベースライン (110) と P06/P08/P09 の実測 (137) は整合する。

**齟齬: なし。**

## 6. P03 finding の消化状況

| finding | 要求された緩和策 | 実施 | 証跡 |
|---|---|---|---|
| F-1 (15 section 契約が C12/C14 で二重実装) | parity test を置く。テスト戦略検査を C14 へ**複製しない** | 実施 | TS-A13 pass。C14 (`build-system-handoff.py`) にテスト戦略検査は追加されていない (`git diff` に当該ファイルなし) |
| F-2 (P05 resource_scope が SI-2 を満たさない) | 3 ファイルに限り付随変更を承認、記録義務あり | 実施 | `implementation-note.md` §2.2 に申告。P07 §4 が承認済み逸脱として区別 |

**未消化の finding: 0 件。**

## 7. 記録済み逸脱 (D-1..D-3)

blocking ではないが、判定の透明性のため明示する。

### D-1: resource_scope 外 3 ファイルの変更 (承認済み)

| ファイル | 承認根拠 |
|---|---|
| `references/system-task-spec-template.md` | P03 §4.1 CONDITIONAL PASS (SI-2 が名指しする正本) |
| `skills/run-system-dev-plan/prompts/R3-emit.md` | 同上 (据え置くと正本と生成指示が矛盾) |
| `schemas/feature-execution-package.schema.json` | 同上 (`additionalProperties: false` のため schema 追加なしでは package が violation になる) |

**未申告の逸脱は検出されなかった** (`git status` の変更ファイルと implementation-note §2.1/§2.2 の申告が完全一致。`plugins/system-spec-harness/…/doctrine-anchor-registry.json` と `plugins/harness-creator/…/2026-07-25-rubric-update.md` は本 feature 着手前から HEAD 上に存在した既存の未コミット変更であり、本 feature は触れていない)。

### D-2: 実行コマンドの読み替え (`--staging .` → `--feature-package`)

P05..P13 の task spec が列挙する `--staging .` は staging generation を指さないため実行不能である。テンプレート正本が定める世代非依存形へ読み替え、P06/P08/P09 の全証跡にその形で記録した。

- **横断整合の確認結果**: 読み替えは P05 implementation-note §4 / P06 notes / P07 §4 / 本文書の 4 箇所で同一内容として記録されており、証跡ごとに異なるコマンドが使われた形跡はない。
- **判定**: 妥当。ただし task spec 生成側 (R3-emit) が実行不能なコマンドを出力し続ける点は本 feature の scope 外の欠陥であり、**P13 の改善 finding として申し送る**。

### D-3: P04 test-plan への事後追記 (TS-B11 / TS-B12)

P05 実装中に「導出しない側」と「順序の安定性」の被覆が未割当と判明したため 2 件追加し、test-plan.md §4 へ追記した (追記であり既存 ID の書き換えではない)。P06 が実行し、P07 が AC-3/AC-4 の根拠に算入している。

- **判定**: trace rule (P04 が定義し P06 が実行し P07 が判定する) の順序は保たれている。test-plan を更新せず実装だけ増やす形 (証跡と設計の乖離) は回避されている。

## 8. 表記 drift (N-1 / N-2)

| # | 内容 | 影響 | 対応 |
|---|---|---|---|
| N-1 | P02 design.md §6 が層別充足の担当を `test_strategy_layer_violations()` という関数名で記載しているが、実装は `test_strategy_violations()` 内で `derive_required_layers()` を呼ぶ形に統合されている | なし。**責務分界 (形状=schema / 文脈依存=Python) は設計どおり**であり、分割単位が 1 関数か 2 関数かの違いのみ。violation code `…-layer` も設計どおり | 設計文書は確定済み成果物のため書き換えず、本文書に記録。実装側の docstring が責務を明示している |
| N-2 | `features/feat-task-spec-test-strategy.md` の digest が goal-spec lineage pin と不一致 (P01 §8.1) | なし。C02 beads 投影による frontmatter メタデータ差分であり、entry gate が束縛する `.context.json` の `feature_context_digest` は一致 | P13 writeback の申し送り対象 (P01 §8.1 で既に宣言済み) |

## 9. 赤いままのゲート (帰属を実測で切り分け)

`plugins/dev-graph/tests` の 4 件失敗 (`test_skill_criteria_evidence.py` の `stale behavior closure digest`) と `scripts/lint-live-trial-verdict.py --all` の 4 violation は同一原因である。帰属は次のとおり **実測で切り分けた**。

| skill | closure 内で HEAD と異なるファイル | 帰属 |
|---|---|---|
| `dev-graph/run-dev-graph-decompose` | `system-dev-planner/{scripts/validate-system-plan.py, schemas/×2, agents/system-dev-plan-architect.md, skills/…/R3-emit.md}` (5 件) | **本 feature** |
| `dev-graph/run-dev-graph-node` | 同上 (5 件) | **本 feature** |
| `dev-graph/run-dev-graph-requirements` | 同上 (5 件) | **本 feature** |
| `dev-graph/run-dev-graph-system-spec` | `system-spec-harness/…/doctrine-anchor-registry.json` (1 件) | 既存差分 (本 feature 着手前から作業ツリーに存在) |

### 9.1 機構

`live-trial-verdict.py` の `behavior_closure_files()` は、skill が `package-contract.depends_on` で宣言した**依存 plugin の `scripts/` と `schemas/` をツリーごと closure へ取り込む**。上記 3 skill は `system-dev-planner` を依存宣言しているため、本 feature の plugin 側変更がそのまま closure digest を動かす。

**実測方法**: closure の各ファイルを `git show HEAD:<path>` のバイト列で置き換えて digest を再構成したところ、3 skill とも verdict.json の記録値と**完全一致**した。すなわち HEAD 時点では stale ではなく、現作業ツリーの未コミット変更でのみ stale 化している。

### 9.2 判定への影響

- **AC-7 (exact-13 契約・13-node DAG の非退行) への影響: なし**。AC-7 が束縛するのは exact-13 と DAG の検査であり、live-trial verdict の鮮度はその範囲外。exact-13 側の実測 (137 passed / 既存 promoted 世代 2 件 pass・digest 不変) は無変更。
- **性質**: 実装の欠陥ではなく**ガバナンス鮮度ゲート**である。「依存元 plugin の挙動面が変わったので、依存先 skill の実走証拠を取り直せ」という設計どおりの検出。
- **landing の前提条件**: 該当 3 skill に対する `run-skill-live-trial` の再実行と `verdict.json` 更新が必要。**これを行わずに commit/push すると PR gate と main push の双方で red になる**。P13 release-receipt の landing 前提条件として記録する。

### 9.3 訂正記録

本節および P06 notes / P07 §4 の初版は、4 件すべてを「既存不合格・本 feature と無関係」と記載していた。`git status --porcelain plugins/dev-graph` が空であることを無関係性の根拠にしたが、**closure は plugin 境界を越える**ため、この推論は成立しない。実測に基づき 3 件を本 feature 起因へ訂正した。P06 証跡・P07 判定・P11 manifest も同時に訂正済み。

## 10. P11 への引き渡し

P11 は本文書の判定を前提に、P06 (`test-run-p06.json` / `.xml`) と P09 (`qa-fail-closed-report.json` / `.xml`) を sha256 付きで固定し、世代非依存の再実行コマンドを併記する。**D-2 の読み替え後のコマンド形**を記録対象とすること (task spec 記載の `--staging .` をそのまま転記すると再実行不能な manifest になる)。
