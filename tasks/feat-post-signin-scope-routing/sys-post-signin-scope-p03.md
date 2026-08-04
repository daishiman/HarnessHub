---
graph_node_id: "SYS-POST-SIGNIN-SCOPE-P03"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-post-signin-scope-routing"
domain: "documentation"
tags: ["feat-post-signin-scope-routing","macro-feature","documentation","phase-p03"]
priority: null
start_date: null
target_date: null
iteration: null
title: "設計レビュー — 認可迂回路・open redirect・deny-by-default 退行の 3 リスクに対する設計妥当性審査"
owners: ["daishiman"]
created_at: "2026-08-02T12:47:00Z"
updated_at: "2026-08-04T03:51:14.089491Z"
status: "active"
depends_on: ["SYS-POST-SIGNIN-SCOPE-P02"]
related_nodes: ["feat-post-signin-scope-routing","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["docs/features/feat-post-signin-scope-routing/design-review.md"]
purpose: "feat-post-signin-scope-routing の P03 を実行する: 設計レビュー — 認可迂回路・open redirect・deny-by-default 退行の 3 リスクに対する設計妥当性審査"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-post-signin-scope-routing/design-review.md"]
scope_out: ["設計そのものの変更 (指摘は P02 へ差し戻す)","テスト ID の定義 (owner=P04)","実装コードの作成 (owner=P05)"]
acceptance: ["published task spec の Produced artifacts が実在する: docs/features/feat-post-signin-scope-routing/design-review.md (3 リスク観点の審査結果。指摘・結論・対応 phase を含む)","published task spec の Automated commands が全て PASS し、Required evidence が全件保存されている"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: "feat-post-signin-scope-routing"
feature_package_id: "feature-package/feat-post-signin-scope-routing"
phase_ref: "P03"
file_path: "tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p03.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-02T12:47:00Z","origin_kind":"system-dev-planner","source_digest":"ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa","source_path":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-03-design-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "goal-spec.json を入力に P03 の単一責務 (documentation) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p03.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-3sjj.3","linked_at":"2026-08-02T08:06:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-02T05:45:00Z","missing_sections":[],"status":"complete"}
---

# 設計レビュー — 認可迂回路・open redirect・deny-by-default 退行の 3 リスクに対する設計妥当性審査

> task projection (P03 / parent: feat-post-signin-scope-routing)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa`
- task spec: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-03-design-review.md`
- package digest: `sha256:ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa`
- task spec SHA-256: `sha256:a896f4dbe2b14ba73ae74c0c5254f238b6af9f0b7b56a47e8b2f933bd19d631a`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/dev-graph-registration-receipt.json`

## 依存

- `SYS-POST-SIGNIN-SCOPE-P02`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-post-signin-scope-routing` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
