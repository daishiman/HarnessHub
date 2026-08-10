---
graph_node_id: "SYS-BUILD-IDENTITY-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-build-identity-deploy-freshness"
domain: "backend"
tags: ["feat-build-identity-deploy-freshness","macro-feature","backend","phase-p08"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リファクタリングと移行 — しきい値の単一定数化と既存 check 系列への整列"
owners: ["daishiman"]
created_at: "2026-08-07T12:10:05Z"
updated_at: "2026-08-07T14:13:51.467085Z"
status: "active"
depends_on: ["SYS-BUILD-IDENTITY-P07"]
related_nodes: ["feat-build-identity-deploy-freshness","arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
resource_scope: ["apps/hub/scripts/check-deploy-freshness.mjs","apps/hub/src/app/api/health"]
purpose: "feat-build-identity-deploy-freshness の P08 を実行する: リファクタリングと移行 — しきい値の単一定数化と既存 check 系列への整列"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollback を満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/scripts/check-deploy-freshness.mjs","apps/hub/src/app/api/health"]
scope_out: ["deploy そのものの実行 (運用操作であり本 feature の成果物ではない)","deploy pipeline の構成変更 (GitHub Actions 経由という既存経路を維持する)","認証を要する管理画面での表示 (認証なしで読めることが要件のため)"]
acceptance: ["しきい値が単一箇所から解決され、判定ロジック側に literal で散らばっていない","鮮度検査 script の呼出し規約と出力形式が既存 check-*.mjs 系列と揃っている","P06 のテスト ID が引き続き全件通る (回帰 0 件)"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
parent_feature: "feat-build-identity-deploy-freshness"
feature_package_id: "feature-package/feat-build-identity-deploy-freshness"
phase_ref: "P08"
file_path: "tasks/feat-build-identity-deploy-freshness/sys-build-identity-p08.md"
template_id: "task"
template_version: "1.1.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-build-identity-deploy-freshness/9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-07T12:10:05Z","origin_kind":"system-dev-planner","source_digest":"9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9","source_path":".dev-graph/plans/generations/feature-package-feat-build-identity-deploy-freshness/9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.92
classification_reason: "goal-spec.json を入力に P08 の単一責務 (backend) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-build-identity-deploy-freshness/sys-build-identity-p08.md","confidence":0.92}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dgkk","linked_at":"2026-08-07T13:44:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-07T11:35:00Z","missing_sections":[],"status":"complete"}
---

# リファクタリングと移行 — しきい値の単一定数化と既存 check 系列への整列

> task projection (P08 / parent: feat-build-identity-deploy-freshness)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-build-identity-deploy-freshness/9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9`
- task spec: `.dev-graph/plans/generations/feature-package-feat-build-identity-deploy-freshness/9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9/task-specs/phase-08-refactoring-migration.md`
- package digest: `sha256:9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9`
- task spec SHA-256: `sha256:f93c3568194fc1aa9751b6167bd2678e72deff9c2148919ffd07e31efe568294`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-build-identity-deploy-freshness/9a7908d1a6d1c1c92220f062e79a58c943a6dd02705ecb3302703a2b9e07a2a9/dev-graph-registration-receipt.json`

## 依存

- feature内依存: `SYS-BUILD-IDENTITY-P07` の完了後に着手する。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-build-identity-deploy-freshness` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
