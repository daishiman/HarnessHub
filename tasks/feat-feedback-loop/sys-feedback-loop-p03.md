---
graph_node_id: "SYS-FEEDBACK-LOOP-P03"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-feedback-loop"
domain: "quality"
tags: ["feat-feedback-loop","studio-extension","feedback-loop","design-review"]
priority: null
start_date: null
target_date: null
iteration: null
title: "独立設計レビュー — Feedback スキーマ・認可・AI キュー接続・通知/publish 接続の妥当性確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:14:11Z"
updated_at: "2026-07-19T14:14:11Z"
status: "active"
depends_on: ["SYS-FEEDBACK-LOOP-P02"]
related_nodes: ["feat-feedback-loop","arch-harness-hub-backend","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/design-review-notes.md"]
purpose: "feat-feedback-loop の P03 を実行する: 独立設計レビュー — Feedback スキーマ・認可・AI キュー接続・通知/publish 接続の妥当性確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-feedback-loop/design-review-notes.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["design-review-notes.md に承認可否と SEC2/SEC6/SEC7/SEC8/SEC9・qa-021/qa-022・D4/D5/D6・I2/I3 適合確認結果が明記されている","現行feature context sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3のscope_in/acceptance全件をP03責務として追跡し、未割当0件である","Normative closure: feedbacks は priority=high|medium|low を必須列/入力/DTO/migrationへ含める。AI queue pull は workspace-adminが自テナント、provider-adminが全テナント（越境はprovider.cross_tenant_access監査）を処理できる。provider-admin専用という旧記述は無効。POST feedback のsession/Bearer二経路、kind=feedback_response、status遷移、通知、既存PublishRequest接続を同じ資源で実装する。 Evidence: priority値域/round-trip、workspace-admin自tenant pull、provider-admin cross-tenant pull+audit、他tenant拒否、migration、P10/P11証跡対応表を必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-frontend"]
parent_feature: "feat-feedback-loop"
feature_package_id: "feature-package/feat-feedback-loop"
phase_ref: "P03"
file_path: "tasks/feat-feedback-loop/sys-feedback-loop-p03.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:14:11Z","origin_kind":"system-dev-planner","source_digest":"aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927","source_path":".dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/task-specs/phase-03-design-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.88
classification_reason: "P02 で確定した Feedback スキーマ・S14 画面構成・feedback API 契約・AI キュー連携・通知/publish 接続設計を、設計担当から独立した視点でレビューする P03 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-feedback-loop/sys-feedback-loop-p03.md","confidence":0.88}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1vb.3","linked_at":"2026-07-18T01:44:19Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 独立設計レビュー — Feedback スキーマ・認可・AI キュー接続・通知/publish 接続の妥当性確認

> task projection (P03 / parent: feat-feedback-loop)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927`
- task spec: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/task-specs/phase-03-design-review.md`
- package digest: `sha256:aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927`
- task spec SHA-256: `sha256:4e13533bb44452d5f8d54a0b2e3f7e8346ce1dfba3a5b782eb3ba9d4852155b4`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-feedback-loop/aef91f0231dbd92a359c36fe52de9defa3e85b99c9ad530b2173311cb6611927/dev-graph-registration-receipt.json`

## 依存

- `SYS-FEEDBACK-LOOP-P02`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
