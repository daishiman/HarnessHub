---
graph_node_id: "issue-live-trial-closure-stale-mvp-first-20260723"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["live-trial","freshness-gate","follow-up","qa-069","mvp-first"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "MVP-first 実装 (P05) で stale 化した 9 skill の live-trial 証跡再取得"
owners: ["daishiman"]
created_at: "2026-07-23T13:51:02Z"
updated_at: "2026-07-23T13:55:28Z"
status: "draft"
depends_on: []
related_nodes: ["feat-mvp-first-scheduling"]
resource_scope: ["issues/sys-live-trial-closure-stale-mvp-first-20260723.md"]
purpose: "feat-mvp-first-scheduling P05 の実装 (schedule-graph.py / bd-bridge.py / graph-node.schema.json 変更) により、これらを behavior closure に含む dev-graph 9 skill の live-trial 証跡 digest が stale 化し、test_skill_criteria_evidence.py の鮮度ゲート 9 件が designed FAIL になった。証跡の再取得を追跡する"
goal: "C01/C02/C03/C04/C05/C14/C15/C18/C19 の live-trial を run-skill-live-trial で再取得し、python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py が全件 PASS になっている"
scope_in: ["dev-graph 9 skill (init/node/sync/requirements/render/decompose/schedule/status/system-spec) の live-trial 再実行","scenario-verdict.json / live-trial verdict.json の再生成","test_skill_criteria_evidence.py 全件 PASS の確認"]
scope_out: ["鮮度ゲート (test_skill_criteria_evidence.py) 自体の緩和・skip 追加","証跡 receipt の手書き修正 (受け入れ不可: 証跡改ざん)","P05 実装コードの変更"]
acceptance: ["test_skill_criteria_evidence.py の stale behavior closure digest 起因の FAIL が 0 件になる","各 verdict の skill_dir_tree_sha が現行 closure と一致する","live-trial は tier=live で取得され downgrade_reason が null である"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-closure-stale-mvp-first-20260723.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-23T13:51:02Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "P05 実装で stale 化した live-trial 証跡の再取得を追跡する follow-up issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-closure-stale-mvp-first-20260723.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-4y5","linked_at":"2026-07-23T13:55:28Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-23T13:51:02Z","missing_sections":[],"status":"incomplete"}
---

# 概要

feat-mvp-first-scheduling P05 (HarnessHub-6gl.5) の実装で `plugins/dev-graph/scripts/schedule-graph.py`・`plugins/dev-graph/scripts/bd-bridge.py`・`plugins/dev-graph/schemas/graph-node.schema.json` を変更した結果、これらを behavior closure (skill の振る舞いに影響するファイル集合) に含む dev-graph 9 skill の live-trial 証跡 digest が stale 化した。

## 実測

2026-07-23 `python3 -m pytest plugins/dev-graph/tests/ -q` で 406 passed / 9 failed。9 件は全て `test_skill_criteria_evidence.py::test_independent_scenario_receipt_covers_exact_criteria` の `stale behavior closure digest` assertion (C01/C02/C03/C04/C05/C14/C15/C18/C19 の OUT1)。実装 logic の退行ではなく、鮮度ゲートが設計どおり「振る舞い変更後の証跡再取得」を要求している状態。

## 対応方針

- `run-skill-live-trial` で 9 skill の live-trial を tier=live で再取得し、verdict.json / scenario-verdict.json を再生成する。
- 鮮度ゲート自体の緩和・skip 追加・receipt の手書き修正は行わない (証跡改ざんに該当)。
- 完了判定: `python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py` 全件 PASS。

## 根拠 refs

- eval-log/dev-graph/mvp-first-scheduling/test-run-p06.json (P06 実測記録)
- plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py `skill_dir_tree_sha`
