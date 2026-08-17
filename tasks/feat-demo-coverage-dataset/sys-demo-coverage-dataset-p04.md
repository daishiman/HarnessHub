---
graph_node_id: "SYS-DEMO-COVERAGE-DATASET-P04"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-demo-coverage-dataset"
domain: "quality"
tags: ["feat-demo-coverage-dataset","macro-feature","testing-qa","seed","coverage","test-design"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テストファースト設計 — 網羅性検査・冪等性・ローカル専用ガードのテストスタブ作成"
owners: ["daishiman"]
created_at: "2026-08-14T13:38:08Z"
updated_at: "2026-08-14T23:40:28.661806Z"
status: "done"
depends_on: ["SYS-DEMO-COVERAGE-DATASET-P03"]
related_nodes: ["feat-demo-coverage-dataset","arch-harness-hub-data","arch-harness-hub-testing-qa"]
resource_scope: ["docs/features/feat-demo-coverage-dataset/test-design.md","packages/db/__tests__/seed-coverage/"]
purpose: "feat-demo-coverage-dataset の P04 を実行する: テストファースト設計 — 網羅性検査・冪等性・ローカル専用ガードのテストスタブ作成"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-demo-coverage-dataset/test-design.md","packages/db/__tests__/seed-coverage/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-design.md に route×状態網羅性検査・enum 全値網羅検査・冪等性 (2 回連続実行で状態一致)・ローカル以外 URL 拒否・長文折返し発生長・大量50件以上ページング境界の 6 テストカテゴリの合否基準が明記され、packages/db/__tests__/seed-coverage/ に対応するテストスタブが作成されている"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-testing-qa"]
parent_feature: "feat-demo-coverage-dataset"
feature_package_id: "feature-package/feat-demo-coverage-dataset"
phase_ref: "P04"
file_path: "tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p04.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-14T13:38:08Z","origin_kind":"system-dev-planner","source_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","source_path":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-04-test-design.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "P03 で承認された設計に基づき、P05 実装の受入契約となるテストスタブ (網羅性・冪等性・ローカル専用ガード拒否・長文折返し検出・大量ページング境界) を作成する P04 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p04.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-v0kv","linked_at":"2026-08-14T15:00:27Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-14T23:40:07Z","evidence_refs":["docs/features/feat-demo-coverage-dataset/test-design.md","packages/db/__tests__/seed-coverage/coverage-matrix.test.ts","packages/db/__tests__/seed-coverage/enum-coverage.test.ts","packages/db/__tests__/seed-coverage/idempotency.test.ts","packages/db/__tests__/seed-coverage/local-guard.test.ts","packages/db/__tests__/seed-coverage/long-text.test.ts","packages/db/__tests__/seed-coverage/bulk-boundary.test.ts","tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p04.md"],"policy":"manual","reconciled_at":"2026-08-15T00:45:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T13:10:00Z","missing_sections":[],"status":"complete"}
---

# テストファースト設計 — 網羅性検査・冪等性・ローカル専用ガードのテストスタブ作成

> task projection (P04 / parent: feat-demo-coverage-dataset)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-04-test-design.md`
- package digest: `sha256:a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec SHA-256: `sha256:1f5954675b6b32baf02d0c8fe522c1e521ed20b7972a2fb8319f7f6bb39fafed`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/dev-graph-registration-receipt.json`

## 依存

- `SYS-DEMO-COVERAGE-DATASET-P03` の完了を前提とする。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` を使い、current pointer から現行世代を再解決する。
- completion: Beads issue の close と default-branch reconciliation を満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
