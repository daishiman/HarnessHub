---
status: confirmed
layer: feature-compatibility
task: SYS-TASK-SPEC-TEST-STRATEGY-P08
parent_feature: feat-task-spec-test-strategy
feature_package_id: feature-package/feat-task-spec-test-strategy
package_digest: sha256:7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae
consumes: [docs/features/feat-task-spec-test-strategy/acceptance-report.md, plugins/system-dev-planner/scripts/validate-system-plan.py]
verdict: NON-DESTRUCTIVE
---

# feat-task-spec-test-strategy 互換性実測

> **位置づけ**: P08 (リファクタリング/移行) の成果物。P03 design-review 観点 C が「設計上 PASS、実測は P08 の責務」として留保した非破壊性を、既存 promoted 世代に対する再検証の実測で確定する。

## 0. 判定

**NON-DESTRUCTIVE** — 既存 promoted 世代 2 件の status・validated_digest・violation 件数はいずれも導入前と同一。exact-13 契約と 13-node DAG 検査は非退行。

## 1. 既存 promoted 世代の再検証 (導入前後の比較)

| package | 導入前 status (P03 §3.3) | 導入後 status | 導入前 digest | 導入後 digest | violations | contract mode |
|---|---|---|---|---|---|---|
| `feature-package/feat-mvp-first-scheduling` | pass | **pass** | `sha256:55a34fe2…86387` | `sha256:55a34fe2…86387` | 0 | legacy |
| `feature-package/feat-task-spec-test-strategy` | pass | **pass** | `sha256:7d185f45…3bae` | `sha256:7d185f45…3bae` | 0 | legacy |

実行コマンド (世代非依存形):

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-mvp-first-scheduling
```

いずれも exit 0。全文は `eval-log/system-dev-planner/task-spec-test-strategy/test-run-p06.json` の `commands[1..2]` に記録済み。

## 2. digest 不変性の根拠 (実測 + 定義)

- **実測**: 上表のとおり `validated_digest` は導入前後で完全一致。
- **定義**: `canonical_digest` は staging/generation 配下の入力バイト列のみから決まる。本 feature は `plugins/system-dev-planner/` 配下と `docs/` `eval-log/` にしか書いておらず、`.dev-graph/plans/generations/` 配下の promoted artifact を 1 バイトも変更していない (`git diff --name-only .dev-graph/plans` が空)。したがって digest 変化は起こり得ない。

## 3. exact-13 契約・13-node DAG の非退行実測

| 契約要素 | 実測値 (mvp / test-strategy) | 期待 | 結果 |
|---|---|---|---|
| `task_count` | 13 / 13 | 13 | 非退行 |
| task spec ファイル数 | 13 / 13 | 13 | 非退行 |
| graph node 数 | 13 / 13 | 13 | 非退行 |
| depends_on edge 数 | 12 / 12 | 12 (P01→…→P13 の前方 chain) | 非退行 |
| `phase_refs` | P01..P13 順 | P01..P13 順 | 非退行 |
| `REQUIRED_TASK_SPEC_SECTIONS` 件数 | 15 | 15 (16 へ増やさない) | 非退行 (TS-A13) |
| 解決される契約 version | 1.1.0 / 1.1.0 (台帳登録済み) | legacy | 非退行 |

回帰スイート: `pytest plugins/system-dev-planner/tests -q` → **137 passed (exit 0)**。導入前の 110 件は全て pass のまま、新規 27 件が加わった数である。

## 4. 非破壊性を支える二重の無効化条件 (実装での確認)

既存世代が新検査の評価対象から外れる条件は独立に 2 つあり、片方が破れても非破壊性は残る。

| # | 条件 | 実装上の所在 | 実測 |
|---|---|---|---|
| 1 | canonical digest が台帳へ `1.1.0` で登録済み → `legacy` モードで section 欠落を violation にしない | `resolve_contract_version()` / `test_strategy_violations(enforced=False)` | 既存 2 世代とも登録済み (§3) |
| 2 | 本文に `## テスト戦略` 見出しが無い → strict-if-present の検査自体が発火しない | `parse_test_strategy()` が `(None, [])` を返す | 既存世代の task spec に当該見出しなし |

**緩めたのは「無いことを許すか」だけ**であり、書かれた内容の妥当性は legacy でも同じ厳格さで検査する (TS-A11)。これがないと「section を書いたが壊れている」世代を素通りさせ、fail-closed が形骸化する。

## 5. 移行手順 (既存 package を enforced へ上げるとき)

1. 13 件の task spec の `スコープ外` と `Verification and evidence` の間に `## テスト戦略` を追加し、4 項目をラベル固定順で埋める。
2. 台帳 `validation-contract-baseline.json` から当該 canonical digest の `1.1.0` 登録を外す。再生成すると digest 自体が変わるため、新 digest は未登録 = `1.2.0` へ自動的に解決される。
3. `staging-manifest.json` の digest を再計算し、C14 `build-system-handoff.py` を再実行する (handoff の source digest は入力バイト列に束縛されているため必須)。
4. `validate-system-plan.py --feature-package <id>` が exit 0 を返すことを確認する。report の `test_strategy_contract.mode` が `enforced` に変わることが移行完了の機械可読な証跡になる。

**既存 promoted 世代を遡って移行する必要はない**。移行は再計画 (再生成) の機会に行えばよく、それまで legacy として pass し続ける。

## 6. ロールバック

台帳 `validation-contract-baseline.json` へ当該 package の canonical digest を `1.1.0` で登録すれば、その世代は legacy へ戻る (validator 側の変更は不要)。検査自体を止める場合は `CONTRACT_VERSIONS["1.2.0"]["test_strategy"]` を `False` に戻せばよく、既存 15 section 契約とは疎結合である。
