---
graph_node_id: "SYS-DEMO-COVERAGE-DATASET-P06"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-demo-coverage-dataset"
domain: "quality"
tags: ["feat-demo-coverage-dataset","macro-feature","testing-qa","seed","coverage","test-run"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テスト実行 — 冪等性・網羅性・ローカル専用ガード拒否テストの実行と結果記録"
owners: ["daishiman"]
created_at: "2026-08-14T13:38:08Z"
updated_at: "2026-08-15T00:57:41.872795Z"
status: "done"
depends_on: ["SYS-DEMO-COVERAGE-DATASET-P05"]
related_nodes: ["feat-demo-coverage-dataset","arch-harness-hub-data","arch-harness-hub-testing-qa"]
resource_scope: ["docs/features/feat-demo-coverage-dataset/test-run-report.md"]
purpose: "feat-demo-coverage-dataset の P06 を実行する: テスト実行 — 冪等性・網羅性・ローカル専用ガード拒否テストの実行と結果記録"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-demo-coverage-dataset/test-run-report.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-run-report.md に P04 定義の 6 テストカテゴリ全件の pass/fail 結果と、同一 seed を連続 2 回実行した際の投入後状態が一致することの記録がある"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-testing-qa"]
parent_feature: "feat-demo-coverage-dataset"
feature_package_id: "feature-package/feat-demo-coverage-dataset"
phase_ref: "P06"
file_path: "tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p06.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-14T13:38:08Z","origin_kind":"system-dev-planner","source_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","source_path":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-06-test-run.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.86
classification_reason: "P04 のテストスタブ (網羅性・冪等性・ローカル専用ガード拒否・長文折返し・大量ページング境界) を P05 実装に対して実行し結果を記録する P06 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p06.md","confidence":0.86}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-khxe","linked_at":"2026-08-14T15:00:36Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-15T00:56:40Z","evidence_refs":["docs/features/feat-demo-coverage-dataset/test-run-report.md","packages/db/__tests__/seed-coverage/coverage-matrix.test.ts","packages/db/__tests__/seed-coverage/enum-coverage.test.ts","packages/db/__tests__/seed-coverage/idempotency.test.ts","packages/db/__tests__/seed-coverage/local-guard.test.ts","packages/db/__tests__/seed-coverage/long-text.test.ts","packages/db/__tests__/seed-coverage/bulk-boundary.test.ts","tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p06.md"],"policy":"manual","reconciled_at":"2026-08-15T00:57:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T13:10:00Z","missing_sections":[],"status":"complete"}
---

# テスト実行 — 冪等性・網羅性・ローカル専用ガード拒否テストの実行と結果記録

> task projection (P06 / parent: feat-demo-coverage-dataset)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-06-test-run.md`
- package digest: `sha256:a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec SHA-256: `sha256:68c9d512f676d83fcbfff17082348070ecd6266c54249eab0d9954e9675a56c7`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/dev-graph-registration-receipt.json`

## 依存

- `SYS-DEMO-COVERAGE-DATASET-P05` の完了を前提とする。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` を使い、current pointer から現行世代を再解決する。
- completion: Beads issue の close と default-branch reconciliation を満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
