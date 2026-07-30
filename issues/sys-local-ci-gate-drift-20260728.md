---
graph_node_id: "issue-local-ci-gate-drift-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-workflow","ci","pre-push","proxy-metric","meta-check"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "run-ci-checks.sh が CI 同等を名乗りながら 19 件の検査を欠いている"
owners: ["daishiman"]
created_at: "2026-07-28T07:20:00Z"
updated_at: "2026-07-30T02:36:43Z"
status: "closed"
depends_on: []
related_nodes: ["issue-worktree-main-ref-desync-20260728","issue-desync-guard-bundle-untracked-20260728"]
resource_scope: [".github/workflows/governance-check.yml","Makefile","scripts/run-ci-checks.sh","scripts/lint-ci-local-check-parity.py","scripts/ci-local-check-allowlist.json","tests/scripts-root/test_root__lint_ci_local_check_parity.py","issues/sys-local-ci-gate-drift-20260728.md","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","docs/features/feat-dev-pipeline-improvement/local-ci-parity-spec-reflection-receipt.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p09.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p12.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13.md",".dev-graph/state/graph.json"]
purpose: "scripts/run-ci-checks.sh は冒頭に「CI と同等の機械チェックをローカルで一括実行する」と宣言し、pre-push hook はその結果を「All CI-equivalent checks passed」と表示する。しかし .github/workflows/*.yml が実行する scripts/*.py と run-ci-checks.sh が実行するものを機械的に突合すると、CI にあってローカルに無いものが 19 件ある。同等性は誰にも検査されていない。結果として開発者は「pre-push が緑なら CI も緑」という誤った事前確率を持ち、実際には CI で初めて落ちる。本リポジトリでは同型の事故が既に 2 回起きており (2026-07-02 / 2026-07-28)、いずれも当該 1〜2 件を手で追加して終わっている。"
goal: "CI が実行する検査集合とローカルゲートが実行する検査集合の差を機械検査し、意図的な除外だけを理由付き allowlist で許す状態にして、「pre-push 緑ならば CI 緑」を検査可能な命題にする"
scope_in: [".github/workflows/*.yml とscripts/run-ci-checks.sh の実行検査集合を突合する meta-lint の設計と実装","ローカル非実行を意図する検査の理由付き allowlist の定義","build 系 (作業ツリーへ書き込みうる) と読み取り専用検査の切り分け、および run-ci-checks.sh の宣言文の修正"]
scope_out: ["個々の lint の判定ロジック変更","CI workflow のジョブ分割やキャッシュ戦略の変更","pre-commit 側のゲート設計"]
acceptance: ["CI とローカルゲートの検査集合差が機械検査され、allowlist に無い差分で fail-closed に落ちること","判定が件数や比率ではなく set membership であること","突合の鍵が script 名だけでなく意味のある引数を含む呼び出し形であること","意図的なローカル非実行が理由とともに allowlist へ記載されており、run-ci-checks.sh の宣言文が実際の被覆範囲と一致していること"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-local-ci-gate-drift-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T07:20:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "CI とローカルゲートの被覆差というリポジトリ運用上の追跡課題であり、特定 feature の実装タスクではない"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-local-ci-gate-drift-20260728.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ml57","linked_at":"2026-07-30T02:24:26Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: [{"base_branch":"main","closing_reference_verified":false,"head_branch":"devgraph/issue-local-ci-gate-drift-20260728","linked_at":"2026-07-30T02:36:43Z","merge_commit_sha":null,"merged_at":null,"pr_number":608,"repo":"daishiman/HarnessHub","state":"open","url":"https://github.com/daishiman/HarnessHub/pull/608"}]
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-30T02:36:43Z","evidence_refs":["scripts/lint-ci-local-check-parity.py","scripts/ci-local-check-allowlist.json","tests/scripts-root/test_root__lint_ci_local_check_parity.py","docs/features/feat-dev-pipeline-improvement/local-ci-parity-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-07-30T02:36:43Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-28T07:20:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`scripts/run-ci-checks.sh` は「CI と同等」を名乗るが、実測で **19 件**の検査が CI にしか無い。この同等性を検査する機構が存在しない。

## 事実 (2026-07-28 実測)

突合方法:

```bash
grep -ohE "python3 scripts/[a-z0-9-]+\.py" .github/workflows/*.yml | sort -u > /tmp/ci.txt
grep -ohE "python3 scripts/[a-z0-9-]+\.py" scripts/run-ci-checks.sh | sort -u > /tmp/local.txt
comm -23 /tmp/ci.txt /tmp/local.txt
```

CI にあってローカルゲートに無いもの:

| script | ローカル bare 実行の結果 |
|---|---|
| `lint-readme-plugin-root-portability.py` | PASS (本 issue の起点。2026-07-28 に CI 赤の原因になった) |
| `lint-artifact-placement.py` | PASS |
| `lint-company-master-vendored-deps.py` | PASS |
| `lint-doc-line-limit.py` | PASS |
| `lint-knowledge-layout.py` | PASS |
| `lint-mechanism-knowledge-boundary.py` | PASS |
| `lint-notion-relations.py` | PASS |
| `lint-plugin-lint-coverage.py` | PASS |
| `lint-portability-knowledge-optin.py` | PASS |
| `lint-prompt-contract-drift.py` | PASS |
| `guard-change-category.py` | PASS |
| `contract-intake-enum-ssot.py` | PASS |
| `validate-harness-coverage.py` | PASS |
| `skill-fixture-runner.py` | PASS (CI 側は `\|\| true` で非ブロッキング) |
| `build-plugins-from-harness.py` | PASS。**ただし build 系のため作業ツリーへ書き込む可能性がある** |
| `build-yaml-spec-cache.py` | PASS。同上 |
| `lint-plugin-manifest.py` | 引数必須 (`--plugin-root .`)。scripts/ 直下に実体が無く、別 plugin の同名 script を指している可能性がある |
| `sync-notion-schema.py` | 引数必須 (`--check`) |
| `validate-plugin-packages.py` | bare で exit 1 (advisory 32 件)。CI での呼び出し形の確認が必要 → **3 例目として実際に CI を落とした (後述)** |

## なぜ有害か

この欠落そのものより、**「同等」という宣言が検査されていない**ことが問題である。pre-push が「All CI-equivalent checks passed」と表示するため、開発者もエージェントもそこで検証を打ち切る。実際 2026-07-28 の PR #592 は、この表示を信じて push した結果 CI で `lint-readme-plugin-root-portability` に落ちた。

`run-ci-checks.sh` の 60-64 行には同型事故の前例が記録されている。

> governance-check.yml と対称。この2つが run-ci-checks 非包含だと改名/skill 変更時に pre-push を素通りして CI で初めて露見する (2026-07-02 harness-creator 改名で criteria roster STALE を CI が検出・pre-push 緑だった事故の恒久対策)。

このときの対処は**当該 2 件を手で追加する**ことであり、集合の一致を検査する機構は作られなかった。だから 26 日後に同じことが起きた。個別パッチは次の 1 件を防がない。

## 既にある片側の器具

`scripts/lint-test-discovery-coverage.py` は「repo 全域の全 `test_*.py` が CI のテスト実行から 1 回以上到達すること」を fail-closed で検査している。設計コメントは判定を到達集合への set membership に限り、テスト数や coverage% と混ぜないことを明示している (Goodhart 回避)。

つまり本リポジトリは既に「集合 A が集合 B に覆われることを機械検査する」型の道具を持っている。**方向が片側にしか無い**だけである。

- ある: test → CI 到達被覆
- 無い: CI 検査 → ローカルゲート被覆

## 受入条件

1. `.github/workflows/*.yml` が実行する検査と `run-ci-checks.sh` が実行する検査の集合差を機械検査し、差があれば fail-closed で落ちること
2. 意図的にローカル非実行とするものは、**理由を書いた明示的な allowlist** に載せること。allowlist に無い差分は落とす
3. 差分検出の判定は set membership とし、件数や比率で緑にしないこと
4. 判定対象は script 名だけでなく**引数を含む呼び出し形**であること (`--check` の有無で意味が変わるため)

### 是正方針として検討すべき論点

- **`build-*` / `sync-*` 系をローカルゲートに含めるか**。これらは作業ツリーへ書き込みうるため、pre-push で走らせると副作用が出る。allowlist で除外するのが妥当だが、その場合「CI 同等」という宣言自体を「CI 同等の *読み取り専用* 検査」へ書き換えるべきである
- **突合の粒度**。`python3 scripts/X.py --flag` 全体を鍵にすると workflow の些細な整形で偽陽性が出る。script 名 + 意味のあるフラグ集合に正規化する必要がある
- **`|| true` で非ブロッキングな CI ステップの扱い**。`skill-fixture-runner.py` は CI 側で失敗を無視している。これをローカルで hard fail にすると CI より厳しくなり、逆向きの不一致になる

## 同日中に 2 例目が発生した (受入条件 4 の実証)

`lint-readme-plugin-root-portability` を追加した直後、**同じ PR の同じ CI 実行で 2 例目**が出た。`validate-harness-coverage.py --ratchet` である。

```
[harness-coverage] RATCHET FAIL: 1 軸が floor を下回った (回帰)
  - scripts/llm_eval: 62.8% < floor 63.1%
```

本 PR が新規 script を 1 本 (`plugins/dev-graph/scripts/build-merged-graph.py`) 追加したことで llm_eval 被覆率の分母が増え、floor を割った。`eval-log/coverage/scripts/` へ code-review verdict を追加して 63.0% へ回復させ解消した。

重要なのは、**この検査は上の表で「PASS」と記録されていた**ことである。

| 呼び出し形 | 結果 |
|---|---|
| `python3 scripts/validate-harness-coverage.py` (bare。上の表の実測) | PASS |
| `python3 scripts/validate-harness-coverage.py --ratchet` (CI の実形) | **FAIL** |

つまり script 名だけで CI とローカルを突合していれば「両方にある」と判定され、この乖離は検出できなかった。**受入条件 4 (突合の鍵は script 名だけでなく意味のある引数を含む呼び出し形であること) は、思考実験ではなく実測に裏付けられている。**

同時に、上の 19 件の表のうち bare 実行で PASS と記録した 14 件は、**CI と同じ引数形で走らせた結果ではない**ことも意味する。表の PASS は「ローカルで動くこと」の確認であって「CI と同じ判定になること」の確認ではない。

## 同日中に 3 例目が発生した (「確認が必要」と書いた行がそのまま落ちた)

2 例目の修正を push した直後、**同じ PR の同じ CI 実行で 3 例目**が出た。上の表の最終行、`validate-plugin-packages.py` である。

```
[plugin-package-check] blocking failure あり
  dev-graph                        FAIL (blocking): ['PKG-007']
```

原因は本 PR が追加した `plugins/dev-graph/scripts/build-merged-graph.py` の mode が `100644` で、同ディレクトリの他 30 本の `100755` と食い違っていたこと。PKG-007 は plugin-root `scripts/` 配下の shebang 付き script に実行ビットを要求する。`chmod +x` + `git update-index --chmod=+x` で解消した。

この事例が示すもの:

1. **「確認が必要」と書いた行は、確認されないまま事故になる。** 表の最終行には起票時点で「CI での呼び出し形の確認が必要」と書いてあった。それでも確認は行われず、6 時間後に同じ行が CI を落とした。未確認項目を表に残すことは対策ではない
2. **名前の近さが見落としを生む。** ローカルには `validate-plugin-completeness.py` があり、pre-push の出力に `OK: 22 plugin(s) complete` と出る。人間もエージェントも「plugin の検査は通っている」と読む。実際には別物 (完全性 vs package-contract) で、CI が落とした方はローカルに存在しなかった
3. **3 件とも「新規ファイルを 1 本足した」ことが引き金である。** README 追記・script 追加・script 追加。新規ファイルの追加は本リポジトリで最も頻度の高い操作であり、そこが最も検査から漏れている

## 既存課題との関係 (2026-07-28 マージ後に判明)

本 issue を起票した直後に main を取り込んだところ、**同じ問題の一部が既に別経路で扱われていた**ことが分かった。重複作業を避けるため関係を明示する。

- `HarnessHub-11qt` — メタ層 lint (`governance-check.yml`) に local 入口が無い件。上記表の `lint-artifact-placement` / `lint-doc-line-limit` はこちらの担当。両者は `--ratchet-base origin/main` を要するため local 入口の設計判断が別途要る、と `architecture/harness-hub-dev-workflow.md` に記録されている
- `HarnessHub-yhc3` — G7 / G7b / G9 に残る同型の未結線
- `HarnessHub-5u5k` — `governance-check.yml` の step gate が恒久 false だった件。その是正で `lint-workflow-step-guard` が CI と `run-ci-checks.sh` の**両方へ同時に**結線された。是正方針として正しい向きであり、本 issue が求める機械検査はこれを個別の心がけではなく強制にするもの

つまり「新設ゲートは CI とローカルへ同時に結線する」という方針は既に文書化されている。**方針があるのに 2026-07-28 に再発した**のだから、欠けているのは方針ではなくその遵守を検査する機構である。本 issue の主眼はそこにある。

## 暫定対応 (本 PR で実施済み)

`run-ci-checks.sh` へ 4 件を追加した。いずれも読み取り専用で pre-push に副作用が無いことを確認済みである。

| 追加した検査 | 契機 |
|---|---|
| `lint-readme-plugin-root-portability` | 1 例目。README の bash フェンス修正が CI で初めて落ちた |
| `validate-harness-coverage --ratchet` | 2 例目。新規 script 追加で llm_eval floor を割った。CI と同じ引数形で結線した |
| `validate-plugin-packages (PKG-*)` | 3 例目。新規 script の実行ビット欠落で PKG-007 が blocking FAIL |
| `contract-intake-enum-ssot` | 3 例目と同じ CI step に同居していたため同時に結線 |

加えて `check-scripts-drift.sh` (bash・上の 19 件の表とは別枠) も結線した。

**これは当該 4 件の再発しか防がない。**残り 15 件は未対応であり、さらに上記のとおり残り 15 件の「PASS」判定自体が CI と同じ引数形での確認ではない。上記の機械検査が入るまで「pre-push 緑 = CI 緑」は成立しない。

なお、この 3 件は**同じ PR の作業中に連続して発生**している。1 件ずつ手で足す運用が追いついていないことの直接の証拠である。3 度とも「push → CI 赤 → 1 件足す → push」を繰り返しており、1 サイクルあたり CI の実行時間 (verify で約 4 分) を消費している。

## 実装結果 (2026-07-30)

`scripts/lint-ci-local-check-parity.py` を追加し、CI blocking invocation が
local hard gate または理由付き exact allowlist に含まれることを set membership で
検査するようにした。比較 key は script path と正規化済み引数であり、
件数・比率や script 名だけでは合格にしない。

外部資格情報、working-tree write、CI non-blocking のため local で再実行しないものは
`scripts/ci-local-check-allowlist.json` に exact invocation と理由を記録する。
未被覆、理由欠落、stale allowlist、解析不能な実行位置は fail-closed で拒否する。
meta-lint 自体は governance CI、`make lint`、pre-push の 3 入口へ結線した。

仕様影響は repository development tooling に限定される。system-spec `qa-088`、
architecture、feature、P09/P12/P13 task spec への反映と中学生向け・技術者向け説明は
`docs/features/feat-dev-pipeline-improvement/local-ci-parity-spec-reflection-receipt.md`
を正とする。既存の schedule eval-log 2 ファイルは本 issue の実装差分ではないため
commit scope から除外する。
