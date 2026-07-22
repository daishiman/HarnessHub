---
graph_node_id: "SYS-BUILD-PIPELINE-BOARD-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-build-pipeline-board"
domain: "data"
tags: ["feat-build-pipeline-board","studio-extension","build-pipeline-board","migration"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リファクタリング/マイグレーション — Build テーブルマイグレーション生成と後方互換性確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:10:56Z"
updated_at: "2026-07-19T14:10:56Z"
status: "active"
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P07"]
related_nodes: ["feat-build-pipeline-board","arch-harness-hub-frontend","arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-build-pipeline-board/refactoring-migration-note.md","packages/db/schema/build-pipeline/"]
purpose: "feat-build-pipeline-board の P08 を実行する: リファクタリング/マイグレーション — Build テーブルマイグレーション生成と後方互換性確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-build-pipeline-board/refactoring-migration-note.md","packages/db/schema/build-pipeline/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["refactoring-migration-note.md に migration ファイル生成結果と後方互換性確認 (破壊的変更なし、publish_request_id は新規 FK のみ) の記録がある","現行feature context sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441のscope_in/acceptance全件をP08責務として追跡し、未割当0件である"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: "feat-build-pipeline-board"
feature_package_id: "feature-package/feat-build-pipeline-board"
phase_ref: "P08"
file_path: "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p08.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:10:56Z","origin_kind":"system-dev-planner","source_digest":"e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9","source_path":".dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P05 で追加した Build スキーマ定義から migration ファイルを生成し既存 publish_requests テーブルへの FK 参照を含めて後方互換性を確認する P08 タスク (feature-execution-package-contract.md により P08 は N/A 判定時も常設される)"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-build-pipeline-board/sys-build-pipeline-board-p08.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9am.8","linked_at":"2026-07-18T01:42:33Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リファクタリング/マイグレーション — Build テーブルマイグレーション生成と後方互換性確認

> task projection (P08 / parent: feat-build-pipeline-board)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9`
- task spec: `.dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/task-specs/phase-08-refactoring-migration.md`
- package digest: `sha256:e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9`
- task spec SHA-256: `sha256:9431212a588f1bc52434ee66c0c2803e9ff8b13879389f5f31020be71d7e6ee6`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/dev-graph-registration-receipt.json`

## 依存

- `SYS-BUILD-PIPELINE-BOARD-P07`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-build-pipeline-board` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
