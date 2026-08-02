---
graph_node_id: "issue-task-spec-validate-command-unrunnable-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-dev-planner","task-spec","validator","quality-gate"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "R3-emit が生成する task spec の C12 検証コマンド --staging . が実行不能"
owners: ["daishiman"]
created_at: "2026-07-25T13:00:00Z"
updated_at: "2026-08-02T10:26:42Z"
status: "draft"
depends_on: []
related_nodes: ["feat-task-spec-test-strategy"]
resource_scope: ["architecture/harness-hub-testing-qa.md","docs/features/feat-task-spec-test-strategy/rerun-command-spec-reflection-receipt.md","eval-log/dev-graph/run-dev-graph-decompose/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T060000Z-wt31-qa121-decompose","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T063000Z-wt31-qa121-decompose-r2","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T071500Z-wt31-qa121-decompose-r3","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T083000Z-wt31-qa121-decompose-r4","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T091500Z-wt31-qa121-decompose-r5","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T094500Z-wt31-qa121-decompose-r6","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T101500Z-wt31-qa121-decompose-r7","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T104500Z-wt31-qa121-decompose-r8","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T121500Z-wt31-qa131-decompose-r9","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T171500Z-wt31-qa131-decompose-r10","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T184500Z-wt31-qa131-decompose-r11","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T190000Z-wt31-qa131-decompose-r12","eval-log/dev-graph/run-dev-graph-node/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T031500Z-wt31-qa121-node","eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T041500Z-wt31-qa121-node-r2","eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T053000Z-wt31-qa121-node-r3","eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T110000Z-wt31-qa131-node-r4","eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T113000Z-wt31-qa131-node-r5","eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T124500Z-wt31-qa131-node-r6","eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T141500Z-wt31-qa131-node-r7","eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T144500Z-wt31-qa131-node-r8","eval-log/dev-graph/run-dev-graph-requirements/content-review/elegance-verdict.json","eval-log/dev-graph/run-dev-graph-requirements/content-review/rubric-verdict.json","eval-log/dev-graph/run-dev-graph-requirements/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260802T031500Z-wt31-qa121-requirements","eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260802T041500Z-wt31-qa121-requirements-r2","eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260802T051500Z-wt31-qa121-requirements-r3","eval-log/llm-coverage.json","features/feat-task-spec-test-strategy.md","issues/sys-task-spec-validate-command-unrunnable-20260725.md","plugin-plans/dev-graph/component-inventory.json","plugin-plans/system-dev-planner/references/system-task-spec-template.md","plugins/dev-graph/skills/run-dev-graph-requirements/SKILL.md","plugins/dev-graph/skills/run-dev-graph-requirements/prompts/R2b-readiness.md","plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py","plugins/dev-graph/tests/fixtures/build_decompose_promotion_patch.py","plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json","plugins/dev-graph/tests/fixtures/live_trial_shapes/requirements_baseline.py","plugins/dev-graph/tests/fixtures/live_trial_shapes/shape_requirements.py","plugins/dev-graph/tests/test_decompose_live_trial_integrity.py","plugins/dev-graph/tests/test_live_trial_fixture_builders.py","plugins/dev-graph/tests/test_validate_source_digest.py","plugins/system-dev-planner/agents/system-dev-plan-architect.md","plugins/system-dev-planner/assets/validation-contract-baseline.json","plugins/system-dev-planner/references/feature-execution-package-contract.md","plugins/system-dev-planner/references/system-task-spec-template.md","plugins/system-dev-planner/scripts/validate-system-plan.py","plugins/system-dev-planner/scripts/validate-task-spec-contract.py","plugins/system-dev-planner/skills/run-system-dev-plan/prompts/R3-emit.md","plugins/system-dev-planner/tests/test_task_spec_rerun_command.py","plugins/system-dev-planner/tests/test_task_spec_test_strategy_derivation.py","specs/harness-hub-system-specification.md","system-spec/spec-state.json","system-spec/testing-qa.md","tasks/feat-task-spec-test-strategy/sys-task-spec-test-strategy-p13.md"]
purpose: "task spec に書かれた検証手順を promotion 後も無改変で再実行できるようにし、別 package を誤検証した成功を防ぐ"
goal: "新規 task spec の validate-system-plan 再実行コマンドが自 package の current pointer を使う世代非依存形になり、C12 が不正形を promotion 前に fail-closed で拒否する状態"
scope_in: ["R3-emit prompt と task spec template の再実行コマンド契約","C12 契約 v1.3.0 と staging・欠落・package 不一致の検査","旧 promoted package の digest 不変性と契約 version 免除","CommonMark backtick/tilde fence と inline code span の回帰検査"]
scope_out: ["既に promoted 済み task spec 本文の遡及書き換え","promotion 前の C12 staging 検証入口の廃止","P01..P13 exact-13 と 13-node DAG 契約の変更"]
acceptance: ["R3-emit と正本 template が promotion 後の再実行に --feature-package <自 package id> を要求し --staging を書かない","C12 契約 1.3.0 が --staging・--feature-package 欠落・他 package id を fenced/inline command から fail-closed で拒否する","promotion 前は C12 が --staging <実 generation path> を検証し、promotion 後は task spec の --feature-package が current pointer から同 package を検証する lifecycle 境界が証跡化される","1.2.0 以前に promote 済み package の canonical digest と再検証結果が不変である"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-task-spec-validate-command-unrunnable-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-23T13:51:02Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "feat-task-spec-test-strategy P10 の D-2 で実測された生成側欠陥を C12 promotion gate まで含めて解消する follow-up issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-task-spec-validate-command-unrunnable-20260725.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ji8y","linked_at":"2026-07-25T14:24:19Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-02T06:14:02Z","missing_sections":[],"status":"complete"}
---

## 背景

`feat-task-spec-test-strategy` の P05〜P13 実行時、生成済み task spec が
`validate-system-plan.py --repo-root . --staging .` を提示していた。
`--staging` は repository root ではなく、promotion 前の実 generation path を受け取る
C12 内部入口であるため、この記載をそのまま repository root から実行すると失敗する。

C11 は検証済み staging generation を content-addressed published path へ atomic rename
（一度に名前を切り替えること）する。promotion 後に staging path は残らないため、
task spec が長期的な再実行手順として `--staging` を保存する設計自体が不適切だった。

## lifecycle 境界

- promotion 前: planner が実 generation path を C12 の `--staging` へ渡して検証する。
- promotion 後: task spec の読者は `--feature-package <feature_package_id>` を実行し、
  feature 別 current pointer から現行 published generation を解決する。
- task spec に generation digest/path を直書きしない。再計画後に古い世代を指すためである。
- 自 package 以外の id も拒否する。別 package が緑でも対象 task の証拠にはならない。

この分離により、`--staging` 自体は C12 の正規入口として残しつつ、task spec の再実行契約だけを
世代非依存にできる。旧受入条件にあった「promotion 前後で同じ task spec コマンドを使う」は、
初回 promotion 前には current pointer が存在しないため撤回し、各段階の正しい入口を個別に証明する。

## 実装方針

1. `validate-task-spec-contract.py` を C12 本文契約の正本とし、契約 version `1.3.0` を追加する。
2. backtick/tilde fenced block と inline code span が提示する `validate-system-plan.py` command を抽出する。
3. `--staging`、`--feature-package` 欠落、他 package id を別 violation code で拒否する。
4. `validation-contract-baseline.json` により v1.2.0 以前の immutable package を免除し、
   旧 canonical digest を書き換えない。
5. R3-emit prompt、正本 template、package contract、plugin-plan mirror を同じ変更波で更新する。

## スコープ外

- 既に published 済み task spec 本文の遡及書き換え
- C12 の `--staging <実 generation path>` 入口の廃止
- exact-13、phase 順序、13-node DAG の変更
- Harness Hub 製品 API、DB、認証認可、UI、Cloudflare deploy unit の変更

## 受入条件

- [x] R3-emit と正本 template が、自 package の `--feature-package` 形だけを再実行手順として生成する。
- [x] C12 v1.3.0 が staging path、package flag 欠落、package id 不一致を fail-closed で拒否する。
- [x] CommonMark の backtick/tilde fence、未閉鎖 fence、inline code span で検査を迂回できない。
- [x] v1.2.0 以前の registered package は legacy mode で従来どおり再検証でき、digest は不変である。
- [x] 現行 package の C12、system-dev-planner 全回帰、task projection、仕様反映ゲートが通る。

## 検証証跡

- focused: `plugins/system-dev-planner/tests/test_task_spec_rerun_command.py`
- plugin regression: `python3 -m pytest -q plugins/system-dev-planner`
- task package: `validate-system-plan.py --repo-root . --feature-package feature-package/feat-task-spec-test-strategy`
- projection: `build-task-projection-rerun.py --repo-root . --feature-package feature-package/feat-task-spec-test-strategy --check`
- downstream C04: `run-dev-graph-requirements` が選択 feature、`architecture_refs`、P01..P13 の
  15-node closure を検証し、同じ `--feature-package` current pointer 契約を使う。
- downstream C14: paired beads/none live trial が schema、promotion digest、idempotent resend、
  run-binding audit、goal-seek evidence を独立評価込みで再確認する。
- 仕様反映受領書: `docs/features/feat-task-spec-test-strategy/rerun-command-spec-reflection-receipt.md`

## 関連

- Beads: `HarnessHub-ji8y`
- GitHub Issue: `#164`
- dev-graph node: `issue-task-spec-validate-command-unrunnable-20260725`
- 発見時記録: `docs/features/feat-task-spec-test-strategy/final-review.md` §7 D-2
