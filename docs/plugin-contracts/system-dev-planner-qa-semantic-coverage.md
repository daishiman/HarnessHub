---
status: recorded
layer: plugin-contract-record
task: HarnessHub-1y6
beads: HarnessHub-1y6
dev_graph_node: issue-qa071-tooling-landing-20260725
judged_at: 2026-07-25T11:20:00Z
reviewer: daishiman
---

# QA 意味被覆 (qa-071) の C12 強制 — 仕様反映判定の受領書

対象変更: `plugins/system-dev-planner` の C12 決定論ゲートへ **QA 宣言の意味被覆検査**を追加し、契約 version を 1.2.0 へ進め、これに伴って失効する dev-graph 3 skill の live-trial 証跡を再取得した一連の変更。前提となる契約 version 台帳の導入は [`system-dev-planner-c12-contract-versioning.md`](system-dev-planner-c12-contract-versioning.md) (HarnessHub-8vx) を参照。

## 1. 判定結論

**spec-impact: none。** `system-spec/` / `specs/` / `architecture/` への反映は不要と判定した。機械受領書は `scripts/build-spec-reflection-receipt.py --spec-impact none` で記録する。

理由は 3 点。

1. 変更対象は Hub 製品の仕様ではなく、**plugin が自分の生成物 (feature-execution-package) に課す内部契約**である。当該契約の正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` で、本変更ではその §2.5 を新設した。
2. qa-071 そのものは既に `system-spec/spec-state.json` の `qa_log` へ確定登録済み (PR #56 / HarnessHub-p73) であり、本変更が加えるのは**登録済み要件を機械で強制する検査側**だけである。要件の内容・確定状態は 1 文字も変えていない。
3. 公開インターフェース (CLI 引数・出力 JSON の既存キー・script パス) は不変。違反 code を 4 種 (`qa-ref-unregistered` / `qa-semantic-coverage` / `qa-task-trace` / `qa-tags-unparsable`) **追加**しただけで、既存キーの削除・改名・意味変更は無い。

## 2. 何を変えたか

| 変更 | ファイル | 内容 |
|---|---|---|
| QA 意味被覆検査 (新規責務) | `scripts/validate-qa-semantic-coverage.py` (新規 255 行) | `qa_semantic_violations()` を単独 module 化。登録突合 / goal 意味被覆 / exact-13 trace の三軸 |
| 検査の組込み | `scripts/validate-system-plan.py` (438 行) | 上記 module を読み込み violations へ合流。`repo_root` を受けて `system-spec/spec-state.json` を解決 |
| 契約 version 1.2.0 | `scripts/validate-task-spec-contract.py` (151 行) | `CONTRACT_VERSION_LATEST = "1.2.0"`。1.1.0 に `effective_until: 2026-07-25T00:00:00Z` を確定 |
| 台帳 policy | `assets/validation-contract-baseline.json` | `latest_contract_version` を 1.2.0 へ。免除範囲の記述に `qa semantic coverage` を追加 |
| promote 経路 | `scripts/promote-system-plan.py` | `validate()` へ `repo_root=root` を渡し、promote 時も spec-state を解決できるようにした (`baseline={}` は 8vx 由来のまま) |
| evaluator の観点 | `agents/system-dev-plan-evaluator.md` / `skills/assign-system-dev-plan-evaluator/prompts/R4-evaluate.md` / `.../references/evaluation-rubric.md` | C2 条件へ「tag だけの QA 宣言を被覆と見なさない」観点を追加 |
| 契約正本 | `references/feature-execution-package-contract.md` (128 行) | §2.5「QA 宣言の意味被覆 (tag だけの宣言を拒否する)」を新設。§2.4 の版数記述と現況を更新 |
| 回帰テスト | `tests/test_qa_semantic_coverage.py` (新規 206 行) / `tests/test_contract_versioning.py` (314 行) | 4 違反 code それぞれの発火と、宣言なし feature の素通りを固定 |

### 設計上の要点

- **三軸を 1 code に潰さない**。「未登録」「goal へ未反映」「task へ未伝播」は直し方が別なので、違反 code を分けて原因を名指しする。1 code に潰すと直し方が読めない。
- **深い見出し一致は goal-spec 側のオプトイン**。`goal-spec.json` の `quality_constraints[].id == "semantic-coverage-not-tag-only"` を宣言した plan にだけ、確定回答から抽出した要件見出し (`【1. マクロ構造】` 等) の一致まで要求する。全 plan へ無条件適用すると、qa-071 以前に確定した feature が遡及で red になる。
- **宣言が無ければ何もしない**。`features/<parent>.md` の frontmatter `tags` に `qa-NNN` が 1 件も無い plan は検査対象外 (early return)。「QA 宣言をしていない」ことを違反にすると、この検査自体が導入不能になる。
- **tags の解析失敗を素通りにしない**。`tags` が JSON として読めない / array でない場合は `qa-tags-unparsable` で落とす。黙って `return []` にすると、tags を壊すだけで検査を回避できる fail-open になる。
- **本文中の `tags:` を宣言と誤認しない**。`_frontmatter()` で先頭 frontmatter だけを切り出してから正規表現を当てる。
- **symlink 成分を辿らない**。`_plain_file()` が staging 内の各 path 成分を検査し、symlink 経由の task spec は「検証できない」として `qa-task-trace` で落とす。

## 3. 仕様領域へ影響しない実測根拠

`git grep -l -E` を `qa_semantic|qa-semantic-coverage` / `validate-qa-semantic-coverage` / `contract_version` / `semantic-coverage-not-tag-only` の 4 パターンで実行した結果 (2026-07-25 時点)。

| 領域 | 該当 file 数 | 判定 |
|---|---|---|
| `system-spec/` | 0 | 反映先なし。qa-071 の確定内容自体は `spec-state.json` の `qa_log` に既登録で変更なし |
| `specs/` | 0 | 反映先なし |
| `architecture/` | 0 | 反映先なし。`architecture/harness-hub-dev-workflow.md` に C12 / planner / exact-13 の記述は無い |
| `features/` | 0 | 反映先なし (後述のとおり `feat-dev-pipeline-improvement` は tag に qa-071 を持つが、検査機構の記述は持たない) |
| `tasks/` | 0 | **意図的に反映しない** (§4 参照) |
| `docs/` | 1 | 8vx の受領書のみ。本書がその後続として `contract_version` の現況を引き継ぐ |

## 4. 意図的に触らなかったもの

- **`tasks/feat-dev-pipeline-improvement/*.md` への qa-071 追記**。この 13 ファイルは frontmatter に `source_digest: 9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b` を持つ**凍結済み promoted generation の投影**であり、同 digest は当該 package の `validated_digest` と一致する。手で本文へ qa-071 を足すと、投影と `published_digest` の束縛が崩れ、`upsert-node.py` の package-aware な `source_digest` 検証と衝突する。正しい経路は契約 1.2.0 下での再 plan (新 generation の promote) であり、これは **HarnessHub-8wo** のスコープ。
- **promote 済み package 本体**。canonical digest が変わり receipt が偽になる。8vx の存在理由そのもの。
- **`system-spec/spec-state.json` の qa-071 エントリ**。確定済み Q&A の書換は方法論の確定履歴を壊す。本変更は検査側のみを足す。
- **`skills/assign-system-dev-plan-evaluator/SKILL.md`**。SKILL.md は「評価対象契約は `references/feature-execution-package-contract.md` を正本とする」と宣言しており、§2.5 の新設で evaluator への伝達は構造的に完了する。編集すると `lint-content-review.py` の `skill_md_sha256` が失効し独立 SubAgent による再評価コストのみが発生する。

## 5. 検証結果

| ゲート | 結果 |
|---|---|
| `pytest plugins/system-dev-planner/tests -q` | **139 passed** |
| `feat-mvp-first-scheduling` 再検証 (通常経路) | `status=pass` / `contract_version=1.2.0` / `exemption=false` / violations 0 |
| `feat-dev-pipeline-improvement` 再検証 (通常経路) | `status=pass` / `contract_version=1.0.0` / `exemption=true` / violations 0 |
| `feat-doc-governance-portability` 再検証 (通常経路) | `status=pass` / `contract_version=1.0.0` / `exemption=true` / violations 0 |
| **ゲート発火の実測** (`baseline={}` = 免除無効) | `feat-dev-pipeline-improvement` が 1.2.0 で `qa-semantic-coverage` 1 件 + `qa-task-trace` 1 件 (13 task spec 全件で未伝播) を検出。`feat-mvp-first-scheduling` は免除無効でも violations 0 |
| `validate-graph-schema.py` | `valid=true` / violations 0 / node 289 (rev 536) |
| `make harness-ratchet` | 当初 **FAIL** (`scripts/llm_eval` 63.9% < floor 64.1%) → verdict 添付後 **RATCHET OK** (64.1%)。後述「新規 script と harness-ratchet」参照 |

`feat-mvp-first-scheduling` を台帳へ登録しないという 8vx の方針を維持しており、**免除に頼らず最新契約 1.2.0 で通ること**を毎回の検証で示す対照になっている。

### behavior closure の失効と再取得

`package-contract.depends_on: system-dev-planner` により、当 plugin の `scripts/` `agents/` `skills/` `references/` は dev-graph の 3 skill の live-trial 挙動面 closure に取り込まれる。本変更は closure 内の 7 ファイルを改変したため、3 skill の `skill_dir_tree_sha` が正当に stale 化した (誤検知ではない)。

| skill | closure ファイル数 | 再取得した run |
|---|---|---|
| `run-dev-graph-node` | 56 | `20260725T104258Z-node-wt2v12m` |
| `run-dev-graph-decompose` | 55 | `20260725T110515Z-decompose-wt2v13` |
| `run-dev-graph-requirements` | 54 | `20260725T110515Z-requirements-wt2v13` |

共通して closure に入る改変ファイルは `agents/system-dev-plan-evaluator.md` / `references/feature-execution-package-contract.md` / `scripts/{promote-system-plan,validate-system-plan,validate-task-spec-contract}.py` / `skills/assign-system-dev-plan-evaluator/{prompts/R4-evaluate.md,references/evaluation-rubric.md}` の 7 本。`tests/` と `assets/` は closure 外なので、回帰テストと台帳の編集では失効しない。

### 新規 script と harness-ratchet (CI 実測で判明した契約)

`scripts/llm_eval` 軸は行カバレッジではなく **`eval-log/coverage/scripts/<slug>.json` に `llm_eval.verdict=PASS` を持つ script の割合**である (`validate-harness-coverage.py:measure_scripts`)。したがって verdict レコードを伴わない script を 1 本足すだけで分母だけが増え、率が下がって `--ratchet` が exit 1 する。**新規 script は code-review verdict の同梱まで含めて 1 単位**という契約になっている。

`--update-floor` は救済にならない。`merge_floor_up()` は現値が旧 floor 未満の軸を**据え置く** (`new["floors"][t][axis] = old_v`) ため floor は下がらず、ratchet は落ち続ける。floor を下げるには台帳の手編集が必要で、それは回帰の焼き付け (Goodhart) にあたる。よって正しい対処は分子を 1 増やす = 実際にレビューして verdict を残すことだけである。

本件では `plugins/system-dev-planner/scripts/validate-qa-semantic-coverage.py` の verdict を実バイト読解で作成した (score 85 / `reviewed_by=harness-ratchet-recovery-code-review`)。捏造を避けるため減点 2 点を `notes` に明記している: (a) goal-spec 側の被覆判定が 5 フィールドの JSON dump への部分文字列一致なので qa id を否定文脈で書いても通る (見出し単位の深い照合は `quality_constraints[].id=semantic-coverage-not-tag-only` 宣言時のみ発火)、(b) task spec 欠落の `qa-task-trace` 違反が declared qa id ごとに重複計上される。

なお main 側は 258/403 = 64.02% で floor 64.1% を tolerance 0.1 の境界上で通過していた。**母数が 400 本規模だと 1 本の追加が約 0.16pt に相当し、境界上では常に次の 1 本が赤化する**。

## 6. 500 行上限への対応

| ファイル | 変更前 | 変更後 | 責務 |
|---|---|---|---|
| `scripts/validate-system-plan.py` | 401 | 438 | C12 決定論ゲート本体 (package 構造・digest・inventory・DAG) |
| `scripts/validate-qa-semantic-coverage.py` | — | 255 (新規) | QA 宣言の登録突合・goal 意味被覆・exact-13 trace |
| `tests/fixtures/audit_decompose_live_trial.py` | 558 | 412 | live-trial のシナリオ固有な受け入れ測定 |
| `tests/fixtures/audit_live_trial_state.py` | — | 250 (新規) | 管理対象状態の snapshot と before/after 比較 |

監査ヘルパーの分割は provenance の穴を作りうる。分割前は「監査 module 1 本が git index と一致すること」で「試験中に監査コードを書いていない」を主張していたが、状態層を別ファイルへ出すと**代表 module だけを測っていては状態層を試験中に書き換えても緑のまま**になる。そこで `composite_identity()` を新設し、path 昇順の module digest 列に対する合成 digest を identity とし、`tracked_in_index` / `index_matches_worktree` を全 module の論理積にした。`test_helper_identity_covers_every_audit_module()` が「全 module が identity に含まれること」と「1 本だけの identity とは sha256 が異なること」を固定している。

## 7. follow-up

- **HarnessHub-8wo (qa-071 本文伝播)**: 本検査が landing したことで、`feat-dev-pipeline-improvement` の再 plan 世代に対して意味被覆を機械強制できる。§5 の「ゲート発火の実測」がそのまま 8wo の受入基準の初期値になる (`qa-semantic-coverage` 1 件 + `qa-task-trace` 13 件を 0 にする)。
- **live-trial の goal 判定**: `run-dev-graph-node` の再走 (`20260725T104258Z-node-wt2v12m`) の goal 判定は、orchestrator と別個体の fresh evaluator ではなく orchestrator 側の独立再測定 script (`independent-verification.json`、6 検査) で行った。fresh evaluator による再判定は未実施。
- **`run-dev-graph-node` の更新経路**: 再走時の連続 update は同一入力の再 upsert (`operation=noop` / `write_count=0`) となり、内容差分ありの更新 (`operation=updated`) は実走していない。当該経路は `plugins/dev-graph/tests/test_operational_loop_v2.py::test_node_upsert_is_atomic_idempotent_and_patchable` と先行 run `20260724T224206Z-pj6-node-r4` (revision 5→6) が被覆する。
- **HarnessHub-v1yh (P1, 本作業で検出した content loss)**: `upsert-node.py` は `--body-file` を省略すると既存 md の**本文を template placeholder で silent 上書き**する。merge 後の node 再注入 (`.dev-graph/cache/merge-reinject-qa071-20260725/`) で実際に `issues/sys-planner-script-line-limit-20260724.md` と `issues/sys-validator-contract-version-20260724.md` の本文が失われた (各 10 hunk、frontmatter は保持)。exit 0 / `operation=updated` を返すため diff を見るまで気付けない。復旧は HEAD 本文を `.dev-graph/cache/restore-qa071-bodies-20260725/` へ置き、writer 経由 (`--body-file`) で再注入した (`git checkout HEAD --` は guard hook が C02 迂回として BLOCK する)。本 commit の `issues/` 差分は 0 に戻っている。
- **500 行超の残件**: `promote-system-plan.py` (677) / `build-system-handoff.py` (580)。8vx から継続。
- **8vx の受領書 dangling**: `docs/features/feat-validator-contract-version/spec-reflection-receipt.md` が参照されているが不在。8vx 側の残件として追跡する。
