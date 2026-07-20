---
graph_node_id: "SYS-BUILD-PIPELINE-BOARD-P06"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-build-pipeline-board"
domain: "quality"
tags: ["feat-build-pipeline-board","studio-extension","build-pipeline-board","test-run"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テスト実行 — 単体/結合/工程遷移認可/PublishRequest 整合/tenant 分離テストの実行と結果記録"
owners: ["daishiman"]
created_at: "2026-07-19T14:10:56Z"
updated_at: "2026-07-19T14:10:56Z"
status: "active"
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P05"]
related_nodes: ["feat-build-pipeline-board","arch-harness-hub-frontend","arch-harness-hub-backend"]
resource_scope: [".github/workflows/ci.yml","apps/hub/src/app/api/v1/builds/","apps/hub/src/features/build-pipeline-board/__tests__/","docs/features/feat-build-pipeline-board/test-run-report.md"]
purpose: "feat-build-pipeline-board の P06 を実行する: テスト実行 — 単体/結合/工程遷移認可/PublishRequest 整合/tenant 分離テストの実行と結果記録"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: [".github/workflows/ci.yml","apps/hub/src/app/api/v1/builds/","apps/hub/src/features/build-pipeline-board/__tests__/","docs/features/feat-build-pipeline-board/test-run-report.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-run-report.md に P04 定義の 5 テストカテゴリ全件の pass/fail 結果が記録されている","現行feature context sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441のscope_in/acceptance全件をP06責務として追跡し、未割当0件である","Normative closure: P04 は既存5カテゴリに axe detectable violations=0 と CWV LCP/INP/CLS=good を追加する。P05 は S13 UI/Build schema に加え、GET /api/v1/builds、GET /api/v1/builds/:id、POST /api/v1/builds（sheet_id xor feedback_id の手動復旧）、PATCH /api/v1/builds/:id、POST /api/v1/builds/:id/stage の正本5 endpointを route handler、zod contract、単一 authz middleware接続として実装する。P04/P06/P07 は5 endpoint（manual recoveryを含む）とaxe/CWVを実測し、P09 CI gate、P10最終判定、P11 evidence、P13 production smokeまで同じ測定IDを追跡する。 Evidence: 正本5 endpoint（POST manual recoveryのsheet_id xor feedback_idを含む）のrole/tenant/validation tests、stage transition tests、axe report、CWV report（LCP/INP/CLS各good）、CI job URLまたは再実行可能ログを必須証跡とする。"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: "feat-build-pipeline-board"
feature_package_id: "feature-package/feat-build-pipeline-board"
phase_ref: "P06"
file_path: "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p06.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:10:56Z","origin_kind":"system-dev-planner","source_digest":"e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9","source_path":".dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/task-specs/phase-06-test-run.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "P04 のテストスタブ (工程遷移 admin 限定/監査記録/PublishRequest 整合/tenant 分離/B9 共有認可表) を P05 実装に対して実行し結果を記録する P06 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-build-pipeline-board/sys-build-pipeline-board-p06.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9am.6","linked_at":"2026-07-18T01:42:31Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# テスト実行 — 単体/結合/工程遷移認可/PublishRequest 整合/tenant 分離テストの実行と結果記録

> task projection (P06 / parent: feat-build-pipeline-board)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9`
- task spec: `.dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/task-specs/phase-06-test-run.md`
- package digest: `sha256:e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9`
- task spec SHA-256: `sha256:98c5e5671a291c6029806ea6f966f36ea992f798da873f63a55956b976c3a060`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/dev-graph-registration-receipt.json`

## 依存

- `SYS-BUILD-PIPELINE-BOARD-P05`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
