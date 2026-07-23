---
graph_node_id: "SYS-HEARING-INTAKE-P10"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-hearing-intake"
domain: "quality"
tags: ["feat-hearing-intake","studio-extension","async-ai-queue","final-review"]
priority: null
start_date: null
target_date: null
iteration: null
title: "最終独立レビュー — feature 全体の confirmation 前最終点検"
owners: ["daishiman"]
created_at: "2026-07-19T14:14:59Z"
updated_at: "2026-07-19T14:14:59Z"
status: "active"
depends_on: ["SYS-HEARING-INTAKE-P09"]
related_nodes: ["feat-hearing-intake","arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/final-review-notes.md"]
purpose: "feat-hearing-intake の P10 を実行する: 最終独立レビュー — feature 全体の confirmation 前最終点検"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-hearing-intake/final-review-notes.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["final-review-notes.md に quality_constraints 10 件全件それぞれの充足判定と根拠成果物への参照が記載されている","現行feature context sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507のscope_in/acceptance全件をP10責務として追跡し、未割当0件である","Normative closure: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。 Evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data"]
parent_feature: "feat-hearing-intake"
feature_package_id: "feature-package/feat-hearing-intake"
phase_ref: "P10"
file_path: "tasks/feat-hearing-intake/sys-hearing-intake-p10.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:14:59Z","origin_kind":"system-dev-planner","source_digest":"61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5","source_path":".dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/task-specs/phase-10-final-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "feature-execution-package-contract.md §7 が定める最終独立レビューゲートに従い、quality_constraints 10 件全件を P01-P09 の成果物に照らして最終点検する P10 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-hearing-intake/sys-hearing-intake-p10.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-o2i.10","linked_at":"2026-07-18T01:45:08Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 最終独立レビュー — feature 全体の confirmation 前最終点検

> task projection (P10 / parent: feat-hearing-intake)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5`
- task spec: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/task-specs/phase-10-final-review.md`
- package digest: `sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5`
- task spec SHA-256: `sha256:eff05042cea82196d12a24aa9782e47590d64807a68250168ce7d722ec737cc7`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/dev-graph-registration-receipt.json`

## 依存

- `SYS-HEARING-INTAKE-P09`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hearing-intake` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
