---
graph_node_id: "SYS-HEARING-INTAKE-P04"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-hearing-intake"
domain: "quality"
tags: ["feat-hearing-intake","studio-extension","async-ai-queue","test-design"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テストファースト設計 — 受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y のテストスタブ作成"
owners: ["daishiman"]
created_at: "2026-07-19T14:14:59Z"
updated_at: "2026-07-19T14:14:59Z"
status: "active"
depends_on: ["SYS-HEARING-INTAKE-P03"]
related_nodes: ["feat-hearing-intake","arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data"]
resource_scope: ["apps/hub/src/app/api/v1/sheets/","apps/hub/src/features/hearing-intake/__tests__/","apps/hub/src/features/hearing-intake/ai-job-adapter/","apps/hub/src/features/hearing-intake/estimation-adapter/","docs/features/feat-hearing-intake/test-design.md"]
purpose: "feat-hearing-intake の P04 を実行する: テストファースト設計 — 受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y のテストスタブ作成"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/api/v1/sheets/","apps/hub/src/features/hearing-intake/__tests__/","apps/hub/src/features/hearing-intake/ai-job-adapter/","apps/hub/src/features/hearing-intake/estimation-adapter/","docs/features/feat-hearing-intake/test-design.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-design.md に受付番号発番・AI キュー認可・Markdown sanitize・試算表示サーバ計算限定・axe a11y の 5 テストカテゴリの合否基準が明記されている","現行feature context sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507のscope_in/acceptance全件をP04責務として追跡し、未割当0件である","Normative closure: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。 Evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data"]
parent_feature: "feat-hearing-intake"
feature_package_id: "feature-package/feat-hearing-intake"
phase_ref: "P04"
file_path: "tasks/feat-hearing-intake/sys-hearing-intake-p04.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:14:59Z","origin_kind":"system-dev-planner","source_digest":"61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5","source_path":".dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/task-specs/phase-04-test-design.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.88
classification_reason: "P03 で承認された設計に基づき P05 実装の受入契約となるテストスタブを作成する P04 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-hearing-intake/sys-hearing-intake-p04.md","confidence":0.88}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-o2i.4","linked_at":"2026-07-18T01:45:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# テストファースト設計 — 受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y のテストスタブ作成

> task projection (P04 / parent: feat-hearing-intake)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5`
- task spec: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/task-specs/phase-04-test-design.md`
- package digest: `sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5`
- task spec SHA-256: `sha256:8f8552b3c4e602daafeafc3e2379feff5b153fc3434ad3ca3afc6e9dd203fceb`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/dev-graph-registration-receipt.json`

## 依存

- `SYS-HEARING-INTAKE-P03`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
