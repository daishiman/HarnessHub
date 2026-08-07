---
graph_node_id: "SYS-POST-SIGNIN-SCOPE-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-post-signin-scope-routing"
domain: "infrastructure"
tags: ["feat-post-signin-scope-routing","macro-feature","infrastructure","phase-p13"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リリースとデプロイ — 本番反映と確定仕様・アーキテクチャへの書き戻し"
owners: ["daishiman"]
created_at: "2026-08-02T12:47:00Z"
updated_at: "2026-08-04T00:40:02Z"
status: "active"
depends_on: []
related_nodes: ["feat-post-signin-scope-routing","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["apps/hub/src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts","docs/features/feat-post-signin-scope-routing/release-record.md","docs/features/feat-post-signin-scope-routing/spec-reflection-receipt.md","docs/features/feat-post-signin-scope-routing/test-run-record.md","system-spec/frontend.md","system-spec/security.md","specs/harness-hub-post-signin-workspace-scope-addendum.md","architecture/harness-hub-frontend.md","architecture/harness-hub-security.md","features/feat-post-signin-scope-routing.md","tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p13.md"]
purpose: "feat-post-signin-scope-routing の P13 を実行する: リリースとデプロイ — 本番反映と確定仕様・アーキテクチャへの書き戻し"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts","docs/features/feat-post-signin-scope-routing/release-record.md","docs/features/feat-post-signin-scope-routing/spec-reflection-receipt.md","docs/features/feat-post-signin-scope-routing/test-run-record.md","system-spec/frontend.md","system-spec/security.md","specs/harness-hub-post-signin-workspace-scope-addendum.md","architecture/harness-hub-frontend.md","architecture/harness-hub-security.md","features/feat-post-signin-scope-routing.md","tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p13.md"]
scope_out: ["新規機能の追加","authorize() の判定順・role 判定の変更 (owner=feat-auth-tenancy)","Workspace 選択画面の UI 実装 (owner=feat-workspace-switch-ux)"]
acceptance: ["published task spec の Produced artifacts が実在する: docs/features/feat-post-signin-scope-routing/release-record.md (本番実測結果と書き戻し照合記録) と docs/features/feat-post-signin-scope-routing/spec-reflection-receipt.md (仕様影響・反映先・no-change理由)、および system-spec/・specs/・architecture/・features/・tasks/ の反映または no-change 判断","published task spec の Automated commands が全て PASS し、Required evidence が全件保存されている","CI が検出した catalog hard-navigation 契約の更新後、単一 workspace session の到達・query string 非信頼・複数 workspace 未選択時の missing_tenant_scope を apps/hub/src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts で PASS させる"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: "feat-post-signin-scope-routing"
feature_package_id: "feature-package/feat-post-signin-scope-routing"
phase_ref: "P13"
file_path: "tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p13.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-02T12:47:00Z","origin_kind":"system-dev-planner","source_digest":"ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa","source_path":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "goal-spec.json を入力に P13 の単一責務 (infrastructure) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-post-signin-scope-routing/sys-post-signin-scope-p13.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-3sjj.13","linked_at":"2026-08-02T08:08:09Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-02T05:45:00Z","missing_sections":[],"status":"complete"}
---

# リリースとデプロイ — 本番反映と確定仕様・アーキテクチャへの書き戻し

> task projection (P13 / parent: feat-post-signin-scope-routing)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa`
- task spec: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa`
- task spec SHA-256: `sha256:b60f053ec854a0c8eae7002b89b489aa6a2008e47e9b7bdde8db566c05a8ecae`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/dev-graph-registration-receipt.json`

## 依存

- `SYS-POST-SIGNIN-SCOPE-P12`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-post-signin-scope-routing` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
- spec writeback: P13 は実行結果・判断・改善点を確定 system spec と architecture へ書き戻し、次回の外側ループへ引き継ぐ。
- 仕様反映受領書: `docs/features/feat-post-signin-scope-routing/spec-reflection-receipt.md` を正本とし、system-spec/・specs/・architecture/・features/・tasks/・docs/ の反映先または no-change の根拠を記録する。
