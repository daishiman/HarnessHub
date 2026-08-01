---
graph_node_id: "issue-c19-live-trial-task-fixture-contract-drift-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","live-trial","system-spec","follow-up"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "C19 live-trial の task 指示を fixture 契約から決定論生成し、前提ずれを防ぐ"
owners: ["daishiman"]
created_at: "2026-07-26T05:52:00Z"
updated_at: "2026-07-28T09:31:38.126210Z"
status: "closed"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","issue-guard-fix-closure-verdict-refresh-20260726","issue-guard-graph-schema-timeout-fail-open-20260725"]
resource_scope: ["plugins/dev-graph/tests/fixtures/live_trial_shapes/shape_system_spec.py","plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json","plugins/dev-graph/scripts/lint-live-trial-task-contract.py","plugins/dev-graph/lib/live_trial_task_contract.py","plugins/dev-graph/tests/test_live_trial_task_contract.py","plugins/dev-graph/references/live-trial-task-contract.md","docs/features/feat-dev-pipeline-improvement/c19-task-contract-spec-reflection.md","eval-log/coverage/scripts/plugins-dev-graph-scripts-lint-live-trial-task-contract.py.json","eval-log/harness-coverage.json","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/"]
purpose: "手作業で複製された C19 task の入力前提が deterministic fixture の正本契約からずれ、正規フローを実行不能にする再発を防ぐ"
goal: "C19 task の初期前提・必須 Skill・観測条件が scenario と fixture の正本から決定論的に生成または検証される"
scope_in: ["C19 task 前提と shape_system_spec.py 配置物の parity 検証","system-spec-harness 正規 4 entry point の Skill 呼出し要件","矛盾する旧前提を拒否する lint","fixture 再構築直後の fresh live-trial"]
scope_out: ["system-spec-harness 本体の仕様変更","他 scenario の task generator 全面再設計","今回取得済み verdict の再取得"]
acceptance: ["C19 task の初期前提が shape_system_spec.py の配置物と機械的に一致する","task が system-spec-harness の正規 4 entry point を Skill 経由で要求する","確定成果物を事前配置済みかつ正規フロー再実行禁止という旧前提を lint が拒否する","fixture 再構築直後の C19 fresh live-trial が人手の事前生成物なしで PASS する","scenario ID、task args、required observations、fixture contract の変更が 1 つの検証経路へ束ねられる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c19-live-trial-task-fixture-contract-drift-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T05:52:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "deterministic fixture rebuild 後の fresh C19 trial が、古い task の『確定成果物を事前配置済み』前提と実 fixture の requirements-brief.md のみという契約矛盾を再現した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c19-live-trial-task-fixture-contract-drift-20260726.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-768b","linked_at":"2026-07-26T05:50:27Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-28T08:02:52Z","evidence_refs":["plugins/dev-graph/tests/test_live_trial_task_contract.py","plugins/dev-graph/references/live-trial-task-contract.md","docs/features/feat-dev-pipeline-improvement/c19-task-contract-spec-reflection.md","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260726T050519Z-sysspec-final2/"],"policy":"manual","reconciled_at":"2026-07-28T08:30:41Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-26T05:52:00Z","missing_sections":[],"status":"complete"}
---

## 概要

C19 (`run-dev-graph-system-spec`) の deterministic fixture は
`system-spec/requirements-brief.md` だけを初期入力として置き、被験 skill が
system-spec-harness の正規 4 entry point を完走して仕様成果物を生成する契約である。

一方、過去の成功 trial から複製された `task.md` は、`spec-state.json`、確定章、
`fetched-references.json`、`completeness-report.json` が事前配置済みだと仮定し、
elicit / doc-fetch / compile の再実行を禁止していた。fixture を正本 generator から
再構築すると、この矛盾により C19 は正直に FAIL した。

今回の最終レビューでは task を fixture 契約へ合わせ、requirements brief だけの状態から
正規 4 Skill、完全性評価 PASS、C02 経由の specification / architecture node 登録まで
実走して PASS を再取得した。ただし task 指示の作成が手作業のままだと、将来も古い run
からの複製で同じずれが再発する。

## 目的

C19 の task 指示を scenario / fixture の正本から決定論的に生成または検証し、
「fixture が置く入力」と「task が仮定する入力」を常に一致させる。

## 受入条件

- C19 task の初期前提が `shape_system_spec.py` の配置物と機械的に一致する。
- task は system-spec-harness の正規 4 entry point を `Skill` 経由で完走するよう要求する。
- 「確定成果物を事前配置済み」と「正規フローを再実行禁止」の旧前提を lint が拒否する。
- fixture 再構築直後の C19 fresh live-trial が、人手による事前生成物なしで PASS する。
- scenario ID、task args、required observations、fixture contract の変更が 1 つの検証経路へ束ねられる。

## 今回の証跡

- 旧前提の FAIL:
  `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260726T040700Z-sysspec-final/`
- fixture 契約へ合わせた PASS:
  `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260726T050519Z-sysspec-final2/`

## 実装結果

- `shape_system_spec.py` に配置入力・未配置成果物・必須 entry point・観測条件を
  machine-readable な `TASK_CONTRACT` として定義した。
- scenario と fixture の契約を 16 桁 digest へ束ね、`--emit-premise` で task の入力前提
  block を決定論生成できるようにした。
- `LT-001..012` で scenario、配置物、旧前提、引数、被験 skill、entry point、
  required observations、digest、task 実体の drift を fail-closed に検出する。
- 650 行の lint を CLI／report と契約解析 module へ分け、双方を 500 行未満へ収束した。
- 技術契約を
  `plugins/dev-graph/references/live-trial-task-contract.md` に記録した。

## 最終品質ゲート

- focused pytest: 29 PASS
- `lint-live-trial-task-contract.py --all`: checked 1 / violation 0 / exit 0
- 旧 task 実物: `LT-004` / `LT-005` / `LT-008` / `LT-006` で拒否
- fresh PASS task 実物: violation 0
- fixture build: placed input 1 件、absent artifacts 4 件が契約と一致
- 受入条件 5 件: すべて PASS

## 仕様・設計への影響

Hub 製品の API、DB、認証、UI、deployment と、system-spec-harness の正規 4 entry point
自体には影響しない。変更は dev-graph plugin 内部の live-trial 指示・検査契約で閉じるため、
`system-spec/`、`specs/`、`architecture/` は変更しない。層別判断は
`docs/features/feat-dev-pipeline-improvement/c19-task-contract-spec-reflection.md`
に記録した。
