---
graph_node_id: "issue-c19-live-trial-rerun-task-contract-r2-20260803"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["dev-graph","live-trial","system-spec-harness","follow-up"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "C19 live-trial 再実行: scenario_id r2 bump 後の scenario-contract-superseded を解消し受領書を更新する"
owners: ["daishiman"]
created_at: "2026-08-03T08:42:04Z"
updated_at: "2026-08-03T09:14:42.732349Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json","plugins/dev-graph/tests/fixtures/live_trial_shapes/shape_system_spec.py","eval-log/dev-graph/run-dev-graph-system-spec/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/","docs/features/feat-dev-pipeline-improvement/c19-task-contract-r2-followup-spec-reflection-receipt.md","docs/features/feat-dev-pipeline-improvement/feat-dev-pipeline-improvement-changelog.md"]
purpose: "HarnessHub-eiky の恒久対策 (C19 scenario への task_contract 追加 + scenario_id bump) が stale にした既存受領書・task.md を解消する"
goal: "run-dev-graph-system-spec の C19-OUT1 live-trial を task_contract r2 条件下で再実行し、scenario-verdict.json / test_skill_criteria_evidence.py / test_live_trial_task_contract.py を green へ戻す"
scope_in: ["run-dev-graph-system-spec の新規 live-trial 実走 (doc-fetch 区間で実 WebFetch が発生することを transcript で確認)","eval-log/dev-graph/run-dev-graph-system-spec/criteria-test/scenario-verdict.json の OUT1 更新","test_skill_criteria_evidence.py / test_live_trial_task_contract.py の green 復帰確認"]
scope_out: ["validate-source-citation.py 側のゲート強化 (HarnessHub-p1ql のスコープ)","R2-fetch.md / build-fetched-references.py 本体の仕様変更"]
acceptance: ["新規 live-trial run で doc-fetch 区間に WebFetch 実行痕跡がある","scenario-verdict.json の OUT1 が新 run を参照する","test_skill_criteria_evidence.py と test_live_trial_task_contract.py が全て green"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c19-live-trial-rerun-task-contract-r2-20260803.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-03T08:42:04Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-eiky の task_contract 修正で C19 scenario_id を bump した結果、既存受領書/task.md が stale になった (scenario-contract-superseded)。追跡用 follow-up issue。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c19-live-trial-rerun-task-contract-r2-20260803.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-m0bd","linked_at":"2026-08-03T08:49:22Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-03T08:42:04Z","missing_sections":[],"status":"complete"}
---

# 概要

HarnessHub-eiky の恒久対策で C19 scenario の scenario_id を bump した結果、既存の live-trial 受領書・task.md が stale (scenario-contract-superseded) になった。実 live-trial を再実行して受領書を更新する。

## 背景と問題

`plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` の C19 scenario (`run-dev-graph-system-spec`) へ `task_contract` (required_fragments: `upsert-node.py` / `SYSTEM_SPEC_AUDIT_FORK_LEDGER` / `doc-fetch は公式ページを実取得して現行 version を記録する`) を追加し、`scenario_id` を `C19-OUT1-positive-system-spec-lineage` から `C19-OUT1-positive-system-spec-lineage-r2` へ bump した (HarnessHub-eiky)。`shape_system_spec.py` の突合キーも同時に更新済み。

## 現在の挙動

bump は設計通り fail-closed で以下を検出している:

- `plan-live-trials.py --plugin-dir plugins/dev-graph --skill run-dev-graph-system-spec` は `reason: scenario-contract-superseded` / `action: run` を返す。
- `test_skill_criteria_evidence.py::test_independent_scenario_receipt_covers_exact_criteria[C19-...]` が `receipt cites a stale scenario` で FAIL。
- `test_live_trial_task_contract.py::test_all_mode_passes_on_real_repo` / `test_fresh_real_task_passes` が LT-001 (scenario_id が task.md に明記されていない) で FAIL。

## 期待する挙動

新規 task_contract 条件を満たす task.md で live-trial を再実行し、受領書 (`eval-log/dev-graph/run-dev-graph-system-spec/criteria-test/scenario-verdict.json` の OUT1) が r2 scenario_id を指す状態になり、上記 3 テストが green に戻る。

## 再現手順またはユースケース

1. `python3 plugins/harness-creator/skills/run-skill-live-trial/scripts/plan-live-trials.py --plugin-dir plugins/dev-graph --skill run-dev-graph-system-spec --profile incremental` を実行し `reason: scenario-contract-superseded` を確認する。
2. `run-skill-live-trial` skill で `run-dev-graph-system-spec` を実走する。task.md には task_contract の 3 必須断片を含める。
3. doc-fetch 区間で実際に WebFetch が発生することを transcript から確認する。
4. 受領書を更新する。

## 影響と優先度

- 影響範囲: dev-graph C19 (`run-dev-graph-system-spec`) の criteria evidence / CI テスト
- 深刻度: medium (実装済み修正の後始末。放置すると CI が赤いまま)
- 緊急度: HarnessHub-eiky の修正が実運用で効いていることを証明するために必要

## スコープ

- In: run-dev-graph-system-spec の新規 live-trial 実走、受領書更新、3 テストの green 復帰
- Out: validate-source-citation.py 側のゲート強化 (HarnessHub-p1ql)、R2-fetch.md / build-fetched-references.py 本体の仕様変更

## 関連グラフ

- 原因/親ノード: (HarnessHub-eiky には未登録 graph node)
- 解決タスク: 本 node 自身

## 受入条件

- [ ] 新規 live-trial run で doc-fetch 区間に WebFetch 実行痕跡がある
- [ ] scenario-verdict.json の OUT1 が新 run を参照する
- [ ] test_skill_criteria_evidence.py と test_live_trial_task_contract.py が全て green

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py plugins/dev-graph/tests/test_live_trial_task_contract.py -q`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/<new-run>/`
