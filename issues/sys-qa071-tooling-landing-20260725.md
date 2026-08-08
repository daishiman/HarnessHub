---
graph_node_id: "issue-qa071-tooling-landing-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-dev-planner","c12-validation","qa-071","semantic-coverage","behavior-closure","live-trial"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "qa-071 enforcement tooling を landing (validator+evaluator+回帰テスト) + dev-graph 3 skill 再 live-trial"
owners: ["daishiman"]
created_at: "2026-07-25T11:09:07Z"
updated_at: "2026-07-28T04:10:48Z"
status: "closed"
depends_on: []
related_nodes: ["issue-planner-script-line-limit-20260724"]
resource_scope: ["plugins/system-dev-planner/scripts/validate-system-plan.py","plugins/system-dev-planner/scripts/validate-qa-semantic-coverage.py","plugins/system-dev-planner/scripts/validate-task-spec-contract.py","plugins/system-dev-planner/assets/validation-contract-baseline.json","plugins/system-dev-planner/references/feature-execution-package-contract.md","plugins/system-dev-planner/agents/system-dev-plan-evaluator.md","plugins/system-dev-planner/skills/assign-system-dev-plan-evaluator/prompts/R4-evaluate.md","plugins/system-dev-planner/skills/assign-system-dev-plan-evaluator/references/evaluation-rubric.md","plugins/system-dev-planner/tests/test_qa_semantic_coverage.py","plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py","plugins/dev-graph/tests/fixtures/audit_live_trial_state.py","eval-log/dev-graph/run-dev-graph-decompose/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-node/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-requirements/criteria-test/scenario-verdict.json"]
purpose: "PR #56 は qa-071 を system-spec/spec-state.json の qa_log へ登録しただけで、その中身が plan 成果物に届いているかを検査する enforcement は分離されたままだった。tag に qa-071 と書けば通る状態では、確定した QA 要件が goal-spec の purpose/goal/scope/acceptance にも 13 task spec にも降りていない plan が promote でき、qa_log が飾りになる。tag 宣言ではなく意味被覆を C12 決定論ゲートで要求し、宣言と中身の乖離を promote 前に落とす"
goal: "qa-071 を宣言する plan は登録済み qa_log との突合・goal-spec 5 項目の意味被覆・exact-13 task spec 全件への trace が揃わない限り promote できず、既 promote 済み package は digest を変えずに promote 時点の契約で pass を維持し、dev-graph 3 skill の live-trial verdict が現行 behavior closure と一致していること"
scope_in: ["qa 意味被覆検査の実装 (qa-ref-unregistered / qa-semantic-coverage / qa-task-trace / qa-tags-unparsable の 4 違反 code)","契約 version 1.2.0 の追加と 1.1.0 の effective_until 確定","意味被覆検査を version 差分 (免除対象) として台帳 policy へ明記","evaluator (agent / R4-evaluate prompt / evaluation-rubric) の C2 条件への意味被覆観点の追加","behavior closure が変わったことによる run-dev-graph-{node,decompose,requirements} の live-trial 再実走と scenario-verdict.json の更新","監査ヘルパーの 500 行超過に対する責務分割と合成 identity による provenance 維持"]
scope_out: ["qa-071 本文の feature/task ドキュメントへの伝播 (HarnessHub-8wo で追跡。本 issue は検査機構のみ)","promote 済み package 本体の編集 (digest 不変性を壊すため受け入れ不可)","semantic-coverage 宣言を持たない既存 feature への遡及適用 (quality_constraints でのオプトイン方式を維持)","promote-system-plan.py / build-system-handoff.py の 500 行超過分割 (別 issue)"]
acceptance: ["planner pytest が全件 PASS し、意味被覆の 4 違反 code それぞれに対する回帰テストが存在する","既 promote 済み package の再検証が digest 不変のまま status=pass を維持し、最新契約で検証される package も violations 0 で pass する","lint-live-trial-verdict.py --all が stale-sha 0 で exit 0、--check-provenance origin/main も exit 0","3 skill の scenario-verdict.json が現行 closure で取得した run を live_trial_verdict_ref に持つ","変更したファイルがいずれも 500 行以下である"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-qa071-tooling-landing-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T11:09:07Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "確定 QA 要件の宣言と中身の乖離を C12 で検出できない欠陥、およびその修正が引き起こす behavior closure 失効を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-qa071-tooling-landing-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1y6","linked_at":"2026-07-25T11:09:07Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T16:13:34Z","evidence_refs":["issues/sys-lint-open-residue-ci-red-20260725.md"],"policy":"manual","reconciled_at":"2026-07-26T01:19:20.811908Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T11:09:07Z","missing_sections":[],"status":"complete"}
---

# 概要

`system-spec/spec-state.json` の `qa_log` へ確定登録した QA 要件が、plan 成果物の本文へ降りていなくても promote できてしまう。宣言 (tag) と中身 (goal-spec / task spec) の乖離を C12 決定論ゲートが検出しない。

## 背景と問題

qa-071 は「QA 要件は tag だけの宣言では被覆したと見なさない」という方法論要件である。PR #56 (HarnessHub-p73) はこの要件を `qa_log` へ登録するところまでを landed したが、**登録内容が plan に反映されているかを検査する側**は分離された。分離の理由は closure 失効で、検査を実装する 4 ファイルが `plugins/system-dev-planner` の `scripts/` `agents/` `skills/` 配下にあり、`package-contract.depends_on: system-dev-planner` を持つ dev-graph の 3 skill の live-trial 挙動面 closure に取り込まれるためである。

結果として、`tags: ["...","qa-071"]` と書くだけで qa-071 を満たしたことになり、`purpose` / `goal` / `scope_in` / `scope_out` / `acceptance` のどこにも要件の内容が無く、exact-13 の task spec にも trace が無い plan が promote できる状態が残っていた。これは Goodhart 的な緑化 (測定対象を満たさずに測定値だけ満たす) であり、`qa_log` が運用上の飾りになる。

## 現在の挙動

`plugins/system-dev-planner/scripts/validate-system-plan.py` は package 構造・digest・inventory・DAG・task spec 必須節を検査するが、QA 宣言については何も見ない。`qa-071` を tag に含み goal-spec 本文に一切対応記述が無い staging を用意しても violations 0 で pass する。

## 期待する挙動

qa 参照を宣言する plan について、次の 3 軸すべてが揃わない限り fail-closed で落ちる。

1. **登録突合** — 宣言した qa-NNN が `system-spec/spec-state.json` の `qa_log` に存在する (`qa-ref-unregistered`)。
2. **意味被覆** — 当該 qa 要件の見出し語が goal-spec の `purpose` / `goal` / `scope_in` / `scope_out` / `acceptance` に現れる (`qa-semantic-coverage`)。
3. **task trace** — exact-13 の task spec 全件に qa 参照が trace されている (`qa-task-trace`)。

加えて `tags` が解析不能な形の場合は黙って素通りせず `qa-tags-unparsable` で落ちる。既 promote 済み package は台帳の契約 version で検証し、digest を変えずに pass を維持する。

## 再現手順またはユースケース

1. `qa-071` を tag に含むが goal-spec 本文で言及しない staging generation を作る。
2. `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging <generation>` を実行する。
3. 修正前は violations 0 の pass、修正後は `qa-semantic-coverage` / `qa-task-trace` で fail する。

## 影響と優先度

- 影響範囲: system / process — 確定 QA 要件の実効性そのもの。HarnessHub-8wo (本文伝播) は本検査が無いと強制できない。
- 深刻度: high
- 緊急度: 検査が無いまま plan 世代が増えるほど、後追いで意味被覆を要求したときの遡及コストが増える。

## スコープ

- In: 意味被覆検査の実装、契約 version 1.2.0 の追加、evaluator への観点追加、dev-graph 3 skill の live-trial 再取得、監査ヘルパーの責務分割
- Out: qa-071 本文の feature/task への伝播 (HarnessHub-8wo)、promote 済み package の編集、宣言なし feature への遡及適用、他 script の 500 行分割

## 関連グラフ

- 原因/親ノード: issue-validator-contract-version-20260724
- 関連仕様: なし — 本変更は plugin が自分の生成物に課す内部契約であり、正本は `plugins/system-dev-planner/references/feature-execution-package-contract.md` §2.5
- 関連アーキテクチャ: なし — 同上の理由により `architecture/` に対応ノードを持たない
- 解決タスク: 本 issue で直接実装 (HarnessHub-1y6)

## 受入条件

- [ ] planner pytest が全件 PASS し、4 違反 code それぞれに回帰テストがある
- [ ] 既 promote 済み package が digest 不変で status=pass、最新契約で検証される package も violations 0
- [ ] `lint-live-trial-verdict.py --all` が stale-sha 0 で exit 0、`--check-provenance origin/main` も exit 0
- [ ] 3 skill の `scenario-verdict.json` が現行 closure の run を参照している
- [ ] 変更ファイルが全て 500 行以下

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/system-dev-planner/tests -q` / `python3 -m pytest plugins/dev-graph/tests -q` / `python3 scripts/lint-live-trial-verdict.py --all` / `python3 scripts/lint-live-trial-verdict.py --check-provenance origin/main`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-{node,decompose,requirements}/live-trial/<run-id>/verdict.json`、`docs/plugin-contracts/system-dev-planner-qa-semantic-coverage.md`
