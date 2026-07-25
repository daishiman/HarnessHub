---
status: recorded
layer: plugin-contract-record
task: HarnessHub-8vx
beads: HarnessHub-8vx
dev_graph_node: issue-validator-contract-version-20260724
judged_at: 2026-07-24T23:50:00Z
reviewer: daishiman
---

# C12 契約 version 化 — 仕様反映判定の受領書

対象変更: `plugins/system-dev-planner` の C12 決定論ゲート (`validate-system-plan.py`) に契約 version と台帳を導入し、promote 済み content-addressed package を promote 時点の契約で再検証できるようにした一連の変更。

## 1. 判定結論

**spec-impact: none。** `system-spec/` / `specs/` / `architecture/` への反映は不要と判定した。機械受領書は `scripts/build-spec-reflection-receipt.py --spec-impact none` で記録する。

理由は 3 点。

1. 変更対象は Hub 製品の仕様ではなく、**plugin が自分の生成物に課す内部契約**である。当該契約の正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` であり、本変更ではその §2.4 を更新した。
2. `system-spec/` / `specs/` / `architecture/` / `features/` は Hub 製品 (ヒアリング〜公開パイプライン) を記述しており、C12 validator の内部契約を記述していない。§3 の実測でも言及 0 件。
3. 公開インターフェース (CLI 引数・出力 JSON の既存キー・script パス) は不変。report に `contract_version` と `contract_baseline_exemption` を **追加** しただけで、既存キーの削除・改名・意味変更は無い。

## 2. 何を変えたか

| 変更 | ファイル | 内容 |
|---|---|---|
| 契約 version 定義と台帳解決 | `scripts/validate-task-spec-contract.py` (新規) | `CONTRACT_VERSIONS` (1.0.0 / 1.1.0)、`load_contract_baseline()`、`resolve_contract_version()`、`task_spec_violations()` |
| JSON Schema サブセット検証器 | `scripts/validate-json-schema-subset.py` (新規) | `schema_violations()` を責務分離。C14 が自前実装を保つ理由を docstring に明記 |
| 契約 version 解決の組込み | `scripts/validate-system-plan.py` | 実ファイルから再計算した canonical digest で契約 version を解決し、report に 2 キーを追加 |
| promote 経路の免除無効化 | `scripts/promote-system-plan.py` | 2 箇所の `validate()` 呼び出しへ `baseline={}` を渡す |
| 台帳 | `assets/validation-contract-baseline.json` (新規) | 既 promote 18 generation を `contract_version: 1.0.0` で登録。policy 節に解決規則を明文化 |
| 回帰テスト | `tests/test_contract_versioning.py` (新規) | 12 tests。promote 境界は AST 走査で機械検証 |
| 契約正本 | `references/feature-execution-package-contract.md` | §2.4「契約 version と promote 済み package の再検証」を追記 |

### 設計上の要点

- **免除の鍵は実ファイル群から再計算した digest**。`staging-manifest.json` の申告値は digest 対象集合の外にあり改ざん可能なので、申告値で免除を決めない。
- **fail-closed の倒れ方**。台帳未登録 digest・digest 計算不能対象 (symlink 成分を含む等)・台帳 asset の欠落/破損は、すべて最新契約 1.1.0 へ倒れる。台帳を消しても緩まない。
- **免除の粒度は「version 間で差のある検査」**。違反 code 単位で免除すると `task-spec-section-missing` が他節の欠落まで見逃す fail-open になるため、必須節の集合ごと差し替える。
- **promote 経路には免除を効かせない**。`baseline={}` を渡さないと、台帳へ digest を先回り登録するだけで旧契約 package を新規昇格できてしまう。

## 3. 仕様領域へ影響しない実測根拠

`validate-system-plan` / `validate-task-spec-contract` / `validate-json-schema-subset` / `validation-contract-baseline` を対象に `git grep -l` を実行した結果 (2026-07-24 時点)。

| 領域 | 該当 file 数 | 判定 |
|---|---|---|
| `system-spec/` | 0 | 反映先なし |
| `specs/` | 0 | 反映先なし |
| `architecture/` | 0 | 反映先なし |
| `features/` | 0 | 反映先なし |
| `tasks/` | 221 | 全件が `validate-system-plan.py` の**再実行コマンド定型文**への言及。script パスと CLI は不変ゆえ更新不要 |
| `docs/` | 作業記録のみ | design-review R-12 等の過去記録。過去時点の記述として正しく、書換不要 |

`tasks/` の 221 件は例えば次の形で、本変更後も同じコマンドがそのまま成立する。

```
- rerun: ... `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/<feature>`
```

## 4. 意図的に触らなかったもの

- **promote 済み package 本体**: canonical digest が変わり `published_digest` を記録済みの receipt が偽になる。本 issue の存在理由そのものなので編集しない。
- **C14 `build-system-handoff.py` の JSON Schema サブセット**: 同等実装が重複しているが、C14 は承認済み成果物を生成する立場として C12 へのビルド依存を持たない設計。統合すると依存の非対称性が壊れるため、DRY を意図的に諦めて重複を残し、理由を `validate-json-schema-subset.py` の docstring に明記した。
- **`skills/assign-system-dev-plan-evaluator/SKILL.md`**: SKILL.md 末尾が「評価対象契約は `references/feature-execution-package-contract.md` を正本とする」と宣言しており、§2.4 の追記で evaluator への伝達は構造的に完了している。加えて evaluator が評価するのは台帳未登録の新規 staging なので常に最新契約で検証され、手順自体が変わらない。SKILL.md を編集すると `lint-content-review.py` の `skill_md_sha256` が失効し (現在 75 skill 緑)、独立 SubAgent による genuine 再評価が必要になる純コストのみが生じる。
- **`references/package-contract.json`**: scripts の列挙を持たないため、新規 2 module の追加で更新は生じない。

## 5. 検証結果

| ゲート | 結果 |
|---|---|
| `pytest plugins/system-dev-planner/tests -q` | **122 passed** |
| `feat-doc-governance-portability` 再検証 | `status=pass` / `contract_version=1.0.0` / `exemption=true` / violations 0 |
| `feat-stage0-distribution-gate` 再検証 | `status=pass` / `contract_version=1.0.0` / `exemption=true` / violations 0 |
| `feat-mvp-first-scheduling` 再検証 | `status=pass` / `contract_version=1.1.0` / `exemption=false` / violations 0 |
| `lint-script-naming.py` | VIOLATION 3 (すべて `eval-log/task/08/**` の fixture。main 由来で本変更は 0 件) |
| `lint-artifact-placement.py` | exit 0 |
| `lint-content-review.py --all` | 75 skill verified |

`feat-mvp-first-scheduling` を台帳へ登録しなかったのは意図的で、**免除に頼らず最新契約で通ること**を毎回の検証で示すための対照になる。

## 6. 500 行上限への対応

`validate-system-plan.py` は機能追加で 601 行になったため、責務単位で 2 module へ分離し 402 行にした。

| ファイル | 行数 | 責務 |
|---|---|---|
| `validate-system-plan.py` | 401 | C12 決定論ゲート本体 (package 構造・digest・inventory・DAG) |
| `validate-task-spec-contract.py` | 140 | 契約 version 定義・台帳解決・task spec 本文契約 |
| `validate-json-schema-subset.py` | 143 | 同梱 runtime schema 用 JSON Schema サブセット検証器 |

`promote-system-plan.py` (677 行) と `build-system-handoff.py` (580 行) は本変更以前からの超過で、本変更での改変は前者 2 行のみ。分割は別 issue として起票する (§7)。

## 7. follow-up

- **dev-graph 3 skill の live-trial 再取得** (`run-dev-graph-{decompose,node,requirements}`): `package-contract.depends_on: system-dev-planner` 経由で当 plugin の scripts が behavior closure に取り込まれるため、`validate-system-plan.py` の改変で 3 件の `skill_dir_tree_sha` が正当に stale 化する (main は緑、本変更で 3 件 stale)。誤検知ではなく設計通りの検出。**HarnessHub-1y6** が同一の closure 問題を追跡しており、本変更もその再取得スコープに合流させる。
- **HarnessHub-1y6 との衝突可能性**: 1y6 は `qa_semantic_violations()` を `validate-system-plan.py` へ復元する予定。本変更で同 file を 601→402 行に再構成したため、復元時に patch 衝突が起きうる。一方で 402 行になったことで復元後も 500 行以内に収まる余地が生まれた。
- **500 行超の残件**: `promote-system-plan.py` (677) / `build-system-handoff.py` (580) の分割。既存の `HarnessHub-cza` (dev-graph) / `HarnessHub-4d8` (system-spec-harness) と同型。
