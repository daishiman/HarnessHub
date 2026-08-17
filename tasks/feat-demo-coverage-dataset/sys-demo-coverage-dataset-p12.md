---
graph_node_id: "SYS-DEMO-COVERAGE-DATASET-P12"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-demo-coverage-dataset"
domain: "documentation"
tags: ["feat-demo-coverage-dataset","macro-feature","testing-qa","seed","coverage","documentation","operations"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ドキュメント/運用 — route×状態到達手順の runbook 作成"
owners: ["daishiman"]
created_at: "2026-08-14T13:38:08Z"
updated_at: "2026-08-15T01:40:46.663298Z"
status: "done"
depends_on: ["SYS-DEMO-COVERAGE-DATASET-P11"]
related_nodes: ["feat-demo-coverage-dataset","arch-harness-hub-data","arch-harness-hub-testing-qa"]
resource_scope: ["docs/features/feat-demo-coverage-dataset/runbook.md"]
purpose: "feat-demo-coverage-dataset の P12 を実行する: ドキュメント/運用 — route×状態到達手順の runbook 作成"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-demo-coverage-dataset/runbook.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["runbook.md に seed 実行手順・28 route 全件について 5 状態それぞれへ到達する手順・ローカル以外 URL 実行時の拒否確認手順の 3 項目が記載されている"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-testing-qa"]
parent_feature: "feat-demo-coverage-dataset"
feature_package_id: "feature-package/feat-demo-coverage-dataset"
phase_ref: "P12"
file_path: "tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p12.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-14T13:38:08Z","origin_kind":"system-dev-planner","source_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","source_path":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-12-documentation-operations.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.84
classification_reason: "P11 のエビデンスを踏まえ、seed 投入手順と seed 済み状態から特定 route の特定状態へ到達する手順を runbook 化する P12 タスク (feat-ui-integrity-audit-harness が本 runbook を前提データとして消費する)"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p12.md","confidence":0.84}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-e35q","linked_at":"2026-08-14T15:01:09Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-15T01:37:51Z","evidence_refs":["docs/features/feat-demo-coverage-dataset/runbook.md","docs/features/feat-demo-coverage-dataset/evidence/index.md","packages/db/scripts/demo-coverage/coverage-matrix.ts","packages/db/scripts/seed-coverage.ts","tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p12.md"],"policy":"manual","reconciled_at":"2026-08-15T01:38:20Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T13:10:00Z","missing_sections":[],"status":"complete"}
---

# ドキュメント/運用 — route×状態到達手順の runbook 作成

> task projection (P12 / parent: feat-demo-coverage-dataset)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-12-documentation-operations.md`
- package digest: `sha256:a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec SHA-256: `sha256:f39f5c2c51f9c72dd9cc70b1bdd1bed273aaaed7d91861aa2018a833efd08c81`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/dev-graph-registration-receipt.json`

## 依存

- `SYS-DEMO-COVERAGE-DATASET-P11` の完了を前提とする。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` を使い、current pointer から現行世代を再解決する。
- completion: Beads issue の close と default-branch reconciliation を満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
