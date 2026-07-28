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
updated_at: "2026-07-26T05:50:27Z"
status: "draft"
depends_on: []
related_nodes: ["issue-guard-fix-closure-verdict-refresh-20260726","issue-guard-graph-schema-timeout-fail-open-20260725"]
resource_scope: ["plugins/dev-graph/tests/fixtures/live_trial_shapes/shape_system_spec.py","plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json","eval-log/dev-graph/run-dev-graph-system-spec/live-trial/"]
purpose: "手作業で複製された C19 task の入力前提が deterministic fixture の正本契約からずれ、正規フローを実行不能にする再発を防ぐ"
goal: "C19 task の初期前提・必須 Skill・観測条件が scenario と fixture の正本から決定論的に生成または検証される"
scope_in: ["C19 task 前提と shape_system_spec.py 配置物の parity 検証","system-spec-harness 正規 4 entry point の Skill 呼出し要件","矛盾する旧前提を拒否する lint","fixture 再構築直後の fresh live-trial"]
scope_out: ["system-spec-harness 本体の仕様変更","他 scenario の task generator 全面再設計","今回取得済み verdict の再取得"]
acceptance: ["C19 task の初期前提が shape_system_spec.py の配置物と機械的に一致する","task が system-spec-harness の正規 4 entry point を Skill 経由で要求する","確定成果物を事前配置済みかつ正規フロー再実行禁止という旧前提を lint が拒否する","fixture 再構築直後の C19 fresh live-trial が人手の事前生成物なしで PASS する"]
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
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
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
