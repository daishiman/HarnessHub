---
graph_node_id: "SYS-DEMO-COVERAGE-DATASET-P02"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-demo-coverage-dataset"
domain: "data"
tags: ["feat-demo-coverage-dataset","macro-feature","testing-qa","seed","coverage","architecture"]
priority: null
start_date: null
target_date: null
iteration: null
title: "アーキテクチャ設計 — route×状態対応表・fixture データモデル・冪等 seed 契約の設計"
owners: ["daishiman"]
created_at: "2026-08-14T13:38:08Z"
updated_at: "2026-08-14T23:15:41.346025Z"
status: "done"
depends_on: ["SYS-DEMO-COVERAGE-DATASET-P01"]
related_nodes: ["feat-demo-coverage-dataset","arch-harness-hub-data","arch-harness-hub-testing-qa"]
resource_scope: ["docs/features/feat-demo-coverage-dataset/architecture-decision-record.md"]
purpose: "feat-demo-coverage-dataset の P02 を実行する: アーキテクチャ設計 — route×状態対応表・fixture データモデル・冪等 seed 契約の設計"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-demo-coverage-dataset/architecture-decision-record.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["architecture-decision-record.md に route×状態対応表のデータ構造・各ドメイン enum の全値一覧・長文/大量/エラー各パターンの生成規則・冪等性の実現方式 (削除→再作成)・ローカル専用ガード維持方針が明記されている"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-testing-qa"]
parent_feature: "feat-demo-coverage-dataset"
feature_package_id: "feature-package/feat-demo-coverage-dataset"
phase_ref: "P02"
file_path: "tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p02.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-14T13:38:08Z","origin_kind":"system-dev-planner","source_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","source_path":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-02-architecture.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.88
classification_reason: "既存 packages/db/scripts/seed-local.ts のローカル専用ガード (isLocalDatabaseUrl) と削除→再作成による冪等パターンを踏襲しつつ、28 route × 5 状態 × enum 全値を機械検証可能な対応表として設計する P02 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p02.md","confidence":0.88}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-d4rz","linked_at":"2026-08-14T15:00:20Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-14T23:15:32Z","evidence_refs":["docs/features/feat-demo-coverage-dataset/architecture-decision-record.md","tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p02.md"],"policy":"manual","reconciled_at":"2026-08-14T23:16:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T13:10:00Z","missing_sections":[],"status":"complete"}
---

# アーキテクチャ設計 — route×状態対応表・fixture データモデル・冪等 seed 契約の設計

> task projection (P02 / parent: feat-demo-coverage-dataset)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/task-specs/phase-02-architecture.md`
- package digest: `sha256:a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577`
- task spec SHA-256: `sha256:bb9110ae4f8e65bdd942f528ce09fba8b8ba40edc7ed29be08821f1f86fc2dc3`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/dev-graph-registration-receipt.json`

## 依存

- `SYS-DEMO-COVERAGE-DATASET-P01` の完了を前提とする。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset` を使い、current pointer から現行世代を再解決する。
- completion: Beads issue の close と default-branch reconciliation を満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
