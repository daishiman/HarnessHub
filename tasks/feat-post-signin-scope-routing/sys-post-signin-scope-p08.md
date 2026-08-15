---
graph_node_id: "SYS-POST-SIGNIN-SCOPE-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-post-signin-scope-routing"
domain: "frontend"
tags: ["feat-post-signin-scope-routing","macro-feature","frontend","phase-p08"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リファクタリングと移行 — scope 解決の二重実装排除と既定着地定数の集約"
owners: ["daishiman"]
created_at: "2026-08-02T12:47:00Z"
updated_at: "2026-08-04T07:32:26Z"
status: "closed"
depends_on: ["SYS-POST-SIGNIN-SCOPE-P07"]
related_nodes: ["feat-post-signin-scope-routing","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["apps/hub/src/lib/authz/resource.ts","apps/hub/src/lib/authz/types.ts","apps/hub/src/middleware/authz.ts","apps/hub/src/lib/auth/session.ts","apps/hub/src/lib/routing/post-signin-landing.ts","apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx","apps/hub/src/app/page.tsx","docs/features/feat-post-signin-scope-routing/refactoring-record.md"]
purpose: "feat-post-signin-scope-routing の P08 を実行する: リファクタリングと移行 — scope 解決の二重実装排除と既定着地定数の集約"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/lib/authz/resource.ts","apps/hub/src/lib/authz/types.ts","apps/hub/src/middleware/authz.ts","apps/hub/src/lib/auth/session.ts","apps/hub/src/lib/routing/post-signin-landing.ts","apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx","apps/hub/src/app/page.tsx","docs/features/feat-post-signin-scope-routing/refactoring-record.md"]
scope_out: ["外部契約 (reason と status) の変更","新規機能の追加","仕様文書の更新 (owner=P12)"]
acceptance: ["published task spec の Produced artifacts が実在する: docs/features/feat-post-signin-scope-routing/refactoring-record.md (集約前後の構造と、テスト結果同一性の確認記録)、および実装ファイルの整理","published task spec の Automated commands が全て PASS し、Required evidence が全件保存されている"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: "feat-post-signin-scope-routing"
feature_package_id: "feature-package/feat-post-signin-scope-routing"
phase_ref: "P08"
file_path: "tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p08.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-02T12:47:00Z","origin_kind":"system-dev-planner","source_digest":"ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa","source_path":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "goal-spec.json を入力に P08 の単一責務 (frontend) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p08.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-3sjj.8","linked_at":"2026-08-02T08:07:02Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-02T05:45:00Z","missing_sections":[],"status":"complete"}
---

# リファクタリングと移行 — scope 解決の二重実装排除と既定着地定数の集約

> task projection (P08 / parent: feat-post-signin-scope-routing)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa`
- task spec: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-08-refactoring-migration.md`
- package digest: `sha256:ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa`
- task spec SHA-256: `sha256:12b30b959ce78e8ab43f5f4f98e75e05ddf3311a86577803163a12c5c2ba7d9f`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/dev-graph-registration-receipt.json`

## 依存

- `SYS-POST-SIGNIN-SCOPE-P07`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-post-signin-scope-routing` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
