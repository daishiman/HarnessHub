---
graph_node_id: "SYS-FEEDBACK-LOOP-P06"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-feedback-loop"
domain: "quality"
tags: ["feat-feedback-loop","studio-extension","feedback-loop","test-run"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テスト実行 — 単体/結合/2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離テストの実行と結果記録"
owners: ["daishiman"]
created_at: "2026-07-19T14:14:11Z"
updated_at: "2026-07-19T14:14:11Z"
status: "active"
depends_on: ["SYS-FEEDBACK-LOOP-P05"]
related_nodes: ["feat-feedback-loop","arch-harness-hub-backend","arch-harness-hub-frontend"]
resource_scope: ["apps/hub/src/app/api/v1/feedback/","docs/features/feat-feedback-loop/test-run-report.md","packages/db/schema/feedback-loop/","packages/schemas/feedback-loop/"]
purpose: "feat-feedback-loop の P06 を実行する: テスト実行 — 単体/結合/2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離テストの実行と結果記録"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/api/v1/feedback/","docs/features/feat-feedback-loop/test-run-report.md","packages/db/schema/feedback-loop/","packages/schemas/feedback-loop/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-run-report.md に P04 定義の 8 テストカテゴリ全件の pass/fail 結果が記録されている","現行feature context sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3のscope_in/acceptance全件をP06責務として追跡し、未割当0件である","Normative closure: feedbacks は priority=high|medium|low を必須列/入力/DTO/migrationへ含める。AI queue pull は workspace-adminが自テナント、provider-adminが全テナント（越境はprovider.cross_tenant_access監査）を処理できる。provider-admin専用という旧記述は無効。POST feedback のsession/Bearer二経路、kind=feedback_response、status遷移、通知、既存PublishRequest接続を同じ資源で実装する。 Evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-frontend"]
parent_feature: "feat-feedback-loop"
feature_package_id: "feature-package/feat-feedback-loop"
phase_ref: "P06"
file_path: "tasks/feat-feedback-loop/sys-feedback-loop-p06.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:14:11Z","origin_kind":"system-dev-planner","source_digest":"aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927","source_path":".dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/task-specs/phase-06-test-run.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "P04 のテストスタブ (2 経路正規化/status 遷移監査/AI pull キュー/通知/Markdown sanitize/tenant 分離/publish 接続/authz-mw の 8 カテゴリ) を P05 実装に対して実行し結果を記録する P06 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-feedback-loop/sys-feedback-loop-p06.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1vb.6","linked_at":"2026-07-18T01:44:23Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# テスト実行 — 単体/結合/2 経路正規化/status 遷移監査/AI pull キュー/通知/tenant 分離テストの実行と結果記録

> task projection (P06 / parent: feat-feedback-loop)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927`
- task spec: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/task-specs/phase-06-test-run.md`
- package digest: `sha256:aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927`
- task spec SHA-256: `sha256:4c7d05bfd4f7b928d49a0d067dbd9d3ae1420640b0eec23c7836a0fd0a6f298b`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/dev-graph-registration-receipt.json`

## 依存

- `SYS-FEEDBACK-LOOP-P05`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
