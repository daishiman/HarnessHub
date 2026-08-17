---
graph_node_id: "SYS-DEMO-COVERAGE-DATASET-P09"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-demo-coverage-dataset"
domain: "quality"
tags: ["feat-demo-coverage-dataset","macro-feature","testing-qa","seed","coverage","quality-assurance"]
priority: null
start_date: null
target_date: null
iteration: null
title: "品質保証 — 網羅性/冪等性/ローカル専用ガードの品質ゲート確認"
owners: ["daishiman"]
created_at: "2026-08-14T13:38:08Z"
updated_at: "2026-08-15T01:19:45.598707Z"
status: "done"
depends_on: ["SYS-DEMO-COVERAGE-DATASET-P08"]
related_nodes: ["feat-demo-coverage-dataset","arch-harness-hub-data","arch-harness-hub-testing-qa"]
resource_scope: ["docs/features/feat-demo-coverage-dataset/quality-assurance-report.md"]
purpose: "feat-demo-coverage-dataset の P09 を実行する: 品質保証 — 網羅性/冪等性/ローカル専用ガードの品質ゲート確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-demo-coverage-dataset/quality-assurance-report.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["quality-assurance-report.md に route×状態未カバー0件検査・enum全値網羅検査・冪等性検査・ローカル専用ガード拒否検査の 4 種の確認結果が記録されている"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-testing-qa"]
parent_feature: "feat-demo-coverage-dataset"
feature_package_id: "feature-package/feat-demo-coverage-dataset"
phase_ref: "P09"
file_path: "tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p09.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-14T13:38:08Z","origin_kind":"system-dev-planner","source_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","source_path":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-09-quality-assurance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P06 テスト結果と P08 migration 不要判定を踏まえ、品質ゲート (route×状態網羅性0未カバー・enum全値網羅・冪等性・ローカル専用ガード) の充足を確認する P09 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p09.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-4cpq","linked_at":"2026-08-14T15:00:57Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-15T01:18:43Z","evidence_refs":["docs/features/feat-demo-coverage-dataset/quality-assurance-report.md","docs/features/feat-demo-coverage-dataset/test-run-report.md","packages/db/scripts/verify-demo-coverage-matrix.ts","packages/db/vitest.config.ts","tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p09.md"],"policy":"manual","reconciled_at":"2026-08-15T01:19:10Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T13:10:00Z","missing_sections":[],"status":"complete"}
---

# 品質保証 — 網羅性/冪等性/ローカル専用ガードの品質ゲート確認

> task projection (P09 / parent: feat-demo-coverage-dataset)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-09-quality-assurance.md`
- package digest: `sha256:a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec SHA-256: `sha256:b317f2db59496651ea4c0fa36cf5802bb0fbf1819f581041a959bbdd39e1e8e4`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/dev-graph-registration-receipt.json`

## 依存

- `SYS-DEMO-COVERAGE-DATASET-P08` の完了を前提とする。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` を使い、current pointer から現行世代を再解決する。
- completion: Beads issue の close と default-branch reconciliation を満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
