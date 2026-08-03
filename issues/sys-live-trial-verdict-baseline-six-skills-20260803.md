---
graph_node_id: "issue-live-trial-verdict-baseline-six-skills-20260803"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","live-trial","evidence","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "live-trial: repository-wide 6 skill の verdict 不在を解消する"
owners: ["daishiman"]
created_at: "2026-08-03T10:15:00Z"
updated_at: "2026-08-03T10:16:37.658382Z"
status: "draft"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","issue-guard-graph-schema-inline-python-variable-path-20260726"]
resource_scope: ["eval-log/skill-intake/run-intake-option-catalog/","eval-log/spec-drift-guardian/run-rubric-sync/","eval-log/system-dev-planner/run-system-dev-plan/","eval-log/system-spec-harness/run-system-spec-elicit/","eval-log/ubm-goal-setting/run-ubm-consult/","eval-log/ubm-goal-setting/run-ubm-goal-setting/"]
purpose: "origin/main に既存の repository-wide live-trial verdict 不在 6 件を、今回変更の品質判定から分離して追跡する"
goal: "6 skill の current behavior closure に一致する独立検証済み verdict を取得し、lint-live-trial-verdict.py --all --enforce を PASS にする"
scope_in: ["対象 6 skill の fresh live-trial と独立 evaluator","verdict lineage と behavior closure の検証","repository-wide verdict lint の再実行"]
scope_out: ["HarnessHub-f84o の 9 Dev Graph skill 証跡","対象 skill の機能仕様変更","Harness Hub 製品 runtime の変更"]
acceptance: ["対象 6 skill に current behavior closure と一致する verdict.json がある","各 verdict が nudge_count=0 / gate_count=0 と独立評価を満たす","python3 scripts/lint-live-trial-verdict.py --all --enforce が PASS する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-verdict-baseline-six-skills-20260803.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-03T10:15:00Z","origin_kind":"generated","source_digest":"491effc86e609461d97aef1133f77cbfbeac4d2f88f893aa89d61f7b2b38693e","source_path":"docs/features/feat-dev-pipeline-improvement/f84o-inline-python-guard-spec-reflection-receipt.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 1
classification_reason: "f84o 最終レビューで origin/main にも再現する repository-wide verdict 不在 6 件を検出し、本変更と分離して追跡する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-verdict-baseline-six-skills-20260803.md","confidence":1}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-pjcb","linked_at":"2026-08-03T10:16:18.942006Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-03T10:15:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`lint-live-trial-verdict.py --all --enforce` が、`origin/main` に既存の 6 skill について
`verdict.json` 不在を報告する。`HarnessHub-f84o` の対象 9 skill はすべて verified であるため、
今回変更の合否と混ぜず repository-wide の証跡整備として追跡する。

## 対象

- `skill-intake/run-intake-option-catalog`
- `spec-drift-guardian/run-rubric-sync`
- `system-dev-planner/run-system-dev-plan`
- `system-spec-harness/run-system-spec-elicit`
- `ubm-goal-setting/run-ubm-consult`
- `ubm-goal-setting/run-ubm-goal-setting`

## 完了条件

6 skill の current behavior closure に一致する fresh live-trial と独立評価を取得し、
repository-wide verdict lint を PASS にする。製品 runtime と f84o 実装は変更しない。
