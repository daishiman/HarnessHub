---
graph_node_id: "issue-devgraph-completion-event-ledger-gap-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","reconcile","design-gap","completion-event","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "C26 completion_event 台帳 emission の設計ギャップ (writer-consumer 不在で reconcile 完全経路が未実装)"
owners: ["daishiman"]
created_at: "2026-07-24T12:08:10Z"
updated_at: "2026-07-25T00:19:30Z"
status: "done"
depends_on: []
related_nodes: ["issue-mvp-first-scheduling-completion-projection-20260724"]
resource_scope: ["plugins/dev-graph/scripts/reconcile-github-lifecycle.py","plugins/dev-graph/scripts/upsert-node.py","plugins/dev-graph/tests/test_semantic_c26_completion.py","plugins/dev-graph/tests/test_runtime_coverage.py","plugins/dev-graph/tests/test_live_trial_fixture_builders.py","plugins/dev-graph/tests/fixtures/live_trial_shapes/shape_node.py","plugins/dev-graph/references/github-lifecycle-contract.md","plugins/dev-graph/references/git-worktree-contract.md","plugins/dev-graph/plugin-composition.yaml","plugin-plans/dev-graph/component-inventory.json","eval-log/dev-graph/run-dev-graph-node/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-sync/criteria-test/scenario-verdict.json"]
purpose: "reconcile-github-lifecycle.py は完了投影の際 --writer-consumer (apply-lifecycle-request handler) を呼んで C02 へ writer_request を適用し completion_event 台帳/transaction receipt を生成する設計だが、該当する writer-consumer スクリプトがリポジトリに存在せず SKILL にもハンドラが無い。このため MVP-first (xjv) / pipeline-improvement (PR#50) の完了投影は『C26 --mode check で PR merge 事実を検証 + C02 upsert-node.py で適用』の手動多段で確定しており、C26 の completion_event 台帳が emit されていない。"
goal: "reconcile の完全経路 (writer_request -> C02 apply -> writer-receipt 検証 -> completion_event/system_release/beads close) が単一コマンドで完走できる。もしくは already-done node に対する冪等 bless 経路で監査台帳を後追い生成できる。"
scope_in: ["writer-consumer (apply-lifecycle-request) のC02組み込み実装とreconcile既定統合","already-done nodeへの冪等completion_event後追いemission経路","MVP-first P01..P13のcompletion_event台帳とtransaction receipt後追い生成"]
scope_out: ["completion_evidenceの再投影 (既にdone・検証済み)","別ストリーム (doc-governance/qa070/render-out1) のOR-003解消","verified PR linkageを持たないmanual policy nodeへのmerge事実の補作"]
acceptance: ["reconcile-github-lifecycle.pyが外部writer-consumer指定なしでも完了投影を完走しcompletion_event台帳を生成できる","MVP-first P01..P13に対応するcompletion_eventがevents台帳に13件存在する","手動writer-receipt手書きなしで監査可能なtyped transaction receiptが13件すべてに残る"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-devgraph-completion-event-ledger-gap-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T12:08:10Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "reconcile writer-consumer 不在の設計ギャップを追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-devgraph-completion-event-ledger-gap-20260724.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-eg0","linked_at":"2026-07-24T12:12:22Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-24T12:44:42Z","evidence_refs":["plugins/dev-graph/tests/test_semantic_c26_completion.py","plugins/dev-graph/scripts/reconcile-github-lifecycle.py","plugins/dev-graph/scripts/upsert-node.py","eval-log/dev-graph/run-dev-graph-node/live-trial/20260724T224206Z-pj6-node-r4/verdict.json","eval-log/dev-graph/run-dev-graph-sync/live-trial/20260724T205545Z-pj6-sync-r2/verdict.json"],"policy":"manual","reconciled_at":"2026-07-25T00:19:30Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-24T12:08:10Z","missing_sections":[],"status":"incomplete"}
---

# 概要

reconcile-github-lifecycle.py の完全な完了投影経路と、既に完了済みのnodeへ監査台帳を後追いする経路を実装した。

## 背景と問題

従来のreconcileは`--writer-consumer`へ`apply-lifecycle-request`を要求する設計だったが、そのconsumerが存在せず、writer request生成後に処理が止まっていた。このため完了投影を手動で行ったnodeにはcompletion eventとtransaction receiptが残らなかった。

## 実装内容

- `upsert-node.py --operation apply-lifecycle-request`をC02の組み込みconsumerとして実装した。
- C26の通常reconcileはconsumer指定がなくてもC02を自動起動し、writer request、graph/task atomic更新、typed receipt検証、completion event生成まで進む。
- `--mode backfill-done`を追加し、既にdoneのnodeは保存済みmerge linkage、task Markdown、Beads closed状態、common-dir lease解放を再検証して監査台帳だけを補完する。
- `--writer-request-only`を診断用途として分離し、request生成だけを確認する経路を通常完了経路から切り離した。
- request digest、graph revision/sha、task artifact sha、許可fieldを検証し、古いrequestや手書きreceiptを拒否する。
- graph更新後かつreceipt作成前に中断した再試行は、要求後stateの完全一致時だけreceiptを復元する。

## 安全境界

- `backfill-done`はgraph/task/Beadsを変更せず、git common dirの監査台帳だけを更新する。
- active lease、未完了Beads task、未検証PR linkage、doneでないgraph/Markdownはfail-closedで拒否する。
- task completionとfeature rollupの同時patchは組み込みconsumerで拒否し、独立transactionへ分離する。
- 組み込みconsumerはrequestが自称するpathを信用せず、`git rev-parse --git-common-dir`から自分でcompletion-receipts権威dirを導出し、その直下以外のrequest/receiptを拒否する。

## スコープ

- In: writer-consumer実装、reconcile統合、already-done冪等emission、MVP-first P01..P13の台帳補完
- Out: 既にdoneのcompletion evidence再投影、別ストリームOR-003、manual policyだけのpipeline-improvement P01..P12へのPR事実の捏造

## 受入条件

- [x] reconcileが外部writer-consumer指定なしでも完了投影を完走し、completion eventを生成できる
- [x] MVP-first P01..P13に対応するcompletion eventがevents台帳に13件存在する
- [x] 手動writer receiptなしで、13件すべてにtyped transaction receiptが残る

## 検証証跡

- `python3 -m pytest -q plugins/dev-graph/tests/test_semantic_c26_completion.py`: 13 passed
- `python3 -m pytest -q plugins/dev-graph/tests`: 426 passed (最終レビュー時の全量再実行)
- `python3 scripts/validate-plugin-packages.py`: dev-graph clean、blocking failure 0
- `python3 plugins/dev-graph/scripts/validate-graph-schema.py --graph .dev-graph/state/graph.json --repo-root .`: valid=true、violations=[]
- governance lint 5種 (`lint-script-naming` / `lint-artifact-placement` / `lint-doc-line-limit` / `lint-content-review --all` / `lint-live-trial-verdict --all`) がいずれもexit 0
- 実台帳: MVP-first completion event 13件、unique node 13件、transaction receipt欠落0件
- 再実行: P01を再backfillしてもevent件数は13件のまま

## 品質証跡の鮮度

スクリプト変更によりC02/C03のlive-trial behavior closure digestが正当に更新された。機能テストの失敗ではなく、旧版を検証した実走証跡を現行版へ流用しないための鮮度gateである。receiptの手書き修正は行わず、HarnessHub-pj6として独立したlive trialを再取得した。

- C03 sync: run `20260724T205545Z-pj6-sync-r2` をfresh evaluatorがPASS判定。
- C02 node: r3がgoal evidence記録前のinputs/ mkdir mutationでFAILしたため、shape_node fixtureにtracked `inputs/.gitkeep` staging directoryを追加し、r4 `20260724T224206Z-pj6-node-r4` を再実走してPASS。
- 両criteria-test scenario-verdictの参照を現行runへ更新済みで、`lint-live-trial-verdict --all`と`test_skill_criteria_evidence.py`が緑。

## 残課題

- 本変更のscriptは`plugins/dev-graph/skills/run-dev-graph-{node,sync}`のbehavior closure内にあるため、以後の微修正でもlive-trial再取得がセットで必要になる。
- `_writer_request()`が組み立てる`graph_path`はcaller側でrepository相対へ上書きされる前提で、helper単体ではconsumerに拒否されるrequestを返す。closure鮮度を守るため本PRでは触らず、後続の整理対象とする。
