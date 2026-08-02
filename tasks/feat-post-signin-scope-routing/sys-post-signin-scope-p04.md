---
graph_node_id: "SYS-POST-SIGNIN-SCOPE-P04"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-post-signin-scope-routing"
domain: "quality"
tags: ["feat-post-signin-scope-routing","macro-feature","quality","phase-p04"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テスト設計 — scope 解決の真理値表・着地先解決の入力分類・deny-by-default 非退行の実行可能テスト ID 定義"
owners: ["daishiman"]
created_at: "2026-08-02T06:25:14Z"
updated_at: "2026-08-02T08:15:47.150363Z"
status: "active"
depends_on: ["SYS-POST-SIGNIN-SCOPE-P03"]
related_nodes: ["feat-post-signin-scope-routing","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["docs/features/feat-post-signin-scope-routing/test-design.md"]
purpose: "feat-post-signin-scope-routing の P04 を実行する: テスト設計 — scope 解決の真理値表・着地先解決の入力分類・deny-by-default 非退行の実行可能テスト ID 定義"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-post-signin-scope-routing/test-design.md"]
scope_out: ["テストコードの実装と実行 (owner=P06)","本体実装 (owner=P05)","受入判定 (owner=P07)"]
acceptance: ["published task spec の Produced artifacts が実在する: docs/features/feat-post-signin-scope-routing/test-design.md (scope 解決 4 組合せ・着地先 5 分類・acceptance 8 件との対応表を含むテスト設計書)","published task spec の Automated commands が全て PASS し、Required evidence が全件保存されている"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: "feat-post-signin-scope-routing"
feature_package_id: "feature-package/feat-post-signin-scope-routing"
phase_ref: "P04"
file_path: "tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p04.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-02T06:25:14Z","origin_kind":"system-dev-planner","source_digest":"f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6","source_path":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/task-specs/phase-04-test-design.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "goal-spec.json を入力に P04 の単一責務 (quality) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p04.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-3sjj.4","linked_at":"2026-08-02T08:06:05Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-02T05:45:00Z","missing_sections":[],"status":"complete"}
---

# テスト設計 — scope 解決の真理値表・着地先解決の入力分類・deny-by-default 非退行の実行可能テスト ID 定義

> task projection (P04 / parent: feat-post-signin-scope-routing)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6`
- task spec: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/task-specs/phase-04-test-design.md`
- package digest: `sha256:f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6`
- task spec SHA-256: `sha256:de65c8e211b912a4edb3a9233b00616500692d801eaf4f9bb7db38d1eec99148`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/dev-graph-registration-receipt.json`

## 依存

- `SYS-POST-SIGNIN-SCOPE-P03`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-post-signin-scope-routing` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
