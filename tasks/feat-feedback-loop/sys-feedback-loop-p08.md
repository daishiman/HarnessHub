---
graph_node_id: "SYS-FEEDBACK-LOOP-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-feedback-loop"
domain: "data"
tags: ["feat-feedback-loop","studio-extension","feedback-loop","migration"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リファクタリング/マイグレーション — feedbacks テーブルマイグレーション生成と後方互換性確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:14:11Z"
updated_at: "2026-07-19T14:14:11Z"
status: "active"
depends_on: ["SYS-FEEDBACK-LOOP-P07"]
related_nodes: ["feat-feedback-loop","arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/app/api/v1/feedback/","docs/features/feat-feedback-loop/refactoring-migration-note.md","packages/db/schema/feedback-loop/","packages/schemas/feedback-loop/"]
purpose: "feat-feedback-loop の P08 を実行する: リファクタリング/マイグレーション — feedbacks テーブルマイグレーション生成と後方互換性確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/api/v1/feedback/","docs/features/feat-feedback-loop/refactoring-migration-note.md","packages/db/schema/feedback-loop/","packages/schemas/feedback-loop/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["refactoring-migration-note.md に migration ファイル生成結果と後方互換性確認 (破壊的変更なし、ai_job_id は新規 FK のみ) の記録がある","現行feature context sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3のscope_in/acceptance全件をP08責務として追跡し、未割当0件である","Normative closure: feedbacks は priority=high|medium|low を必須列/入力/DTO/migrationへ含める。AI queue pull は workspace-adminが自テナント、provider-adminが全テナント（越境はprovider.cross_tenant_access監査）を処理できる。provider-admin専用という旧記述は無効。POST feedback のsession/Bearer二経路、kind=feedback_response、status遷移、通知、既存PublishRequest接続を同じ資源で実装する。 Evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。"]
architecture_refs: ["arch-harness-hub-backend"]
parent_feature: "feat-feedback-loop"
feature_package_id: "feature-package/feat-feedback-loop"
phase_ref: "P08"
file_path: "tasks/feat-feedback-loop/sys-feedback-loop-p08.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:14:11Z","origin_kind":"system-dev-planner","source_digest":"aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927","source_path":".dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P05 で packages/db/schema/feedback-loop/ に追加した feedbacks テーブル定義から migration ファイルを生成し既存スキーマ (ai_jobs/notifications/publish_requests 含む) への後方互換性を確認する P08 タスク (feature-execution-package-contract.md により P08 は常設される)"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-feedback-loop/sys-feedback-loop-p08.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1vb.8","linked_at":"2026-07-18T01:44:26Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リファクタリング/マイグレーション — feedbacks テーブルマイグレーション生成と後方互換性確認

> task projection (P08 / parent: feat-feedback-loop)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927`
- task spec: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/task-specs/phase-08-refactoring-migration.md`
- package digest: `sha256:aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927`
- task spec SHA-256: `sha256:2d5fcfaa18c297391ba3c3fcd3535d984ef5061ad80dcff4cf045069e31feb57`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/dev-graph-registration-receipt.json`

## 依存

- `SYS-FEEDBACK-LOOP-P07`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
