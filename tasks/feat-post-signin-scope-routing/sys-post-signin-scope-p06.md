---
graph_node_id: "SYS-POST-SIGNIN-SCOPE-P06"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-post-signin-scope-routing"
domain: "quality"
tags: ["feat-post-signin-scope-routing","macro-feature","quality","phase-p06"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テスト実行 — P04 が定義したテスト ID の実行と結果証跡の収集"
owners: ["daishiman"]
created_at: "2026-08-02T06:25:14Z"
updated_at: "2026-08-02T08:16:25.622121Z"
status: "active"
depends_on: ["SYS-POST-SIGNIN-SCOPE-P05"]
related_nodes: ["feat-post-signin-scope-routing","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["docs/features/feat-post-signin-scope-routing/test-run-record.md","apps/hub/test/authz/scope-resolution.test.ts","apps/hub/test/routing/post-signin-landing.test.ts","apps/hub/test/auth/session-workspace-binding.test.ts"]
purpose: "feat-post-signin-scope-routing の P06 を実行する: テスト実行 — P04 が定義したテスト ID の実行と結果証跡の収集"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-post-signin-scope-routing/test-run-record.md","apps/hub/test/authz/scope-resolution.test.ts","apps/hub/test/routing/post-signin-landing.test.ts","apps/hub/test/auth/session-workspace-binding.test.ts"]
scope_out: ["本体実装の変更 (owner=P05。テスト実行で欠陥が判明した場合は P05 へ差し戻す)","受入判定 (owner=P07)","品質ゲートの fail-closed 化 (owner=P09)"]
acceptance: ["published task spec の Produced artifacts が実在する: docs/features/feat-post-signin-scope-routing/test-run-record.md (全テスト ID の実行結果と再実行コマンド)、および apps/hub/test 配下のテストコード","published task spec の Automated commands が全て PASS し、Required evidence が全件保存されている"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: "feat-post-signin-scope-routing"
feature_package_id: "feature-package/feat-post-signin-scope-routing"
phase_ref: "P06"
file_path: "tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p06.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-02T06:25:14Z","origin_kind":"system-dev-planner","source_digest":"f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6","source_path":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/task-specs/phase-06-test-run.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "goal-spec.json を入力に P06 の単一責務 (quality) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p06.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-3sjj.6","linked_at":"2026-08-02T08:06:23Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-02T05:45:00Z","missing_sections":[],"status":"complete"}
---

# テスト実行 — P04 が定義したテスト ID の実行と結果証跡の収集

> task projection (P06 / parent: feat-post-signin-scope-routing)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6`
- task spec: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/task-specs/phase-06-test-run.md`
- package digest: `sha256:f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6`
- task spec SHA-256: `sha256:b86b3d874f51b1a9ed611be9f0e5797d00d7e82265144096f35931930d307b49`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/f5f2a30f4f6828bf6ccaf1c30d387863f02b79f5f59950036f50784eb73f3cd6/dev-graph-registration-receipt.json`

## 依存

- `SYS-POST-SIGNIN-SCOPE-P05`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-post-signin-scope-routing` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
