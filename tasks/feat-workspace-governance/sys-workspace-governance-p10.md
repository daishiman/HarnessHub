---
graph_node_id: "SYS-WORKSPACE-GOVERNANCE-P10"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-workspace-governance"
domain: "quality"
tags: ["feat-workspace-governance","macro-feature","quality","final-review"]
priority: null
start_date: null
target_date: null
iteration: null
title: "最終レビュー — goal-spec 6件quality_constraints・3件acceptanceの全件最終合否判定"
owners: ["daishiman"]
created_at: "2026-07-19T14:21:39Z"
updated_at: "2026-07-19T14:21:39Z"
status: "active"
depends_on: ["SYS-WORKSPACE-GOVERNANCE-P09"]
related_nodes: ["feat-workspace-governance"]
resource_scope: ["docs/features/feat-workspace-governance/final-review-decision.md"]
purpose: "feat-workspace-governance の P10 を実行する: 最終レビュー — goal-spec 6件quality_constraints・3件acceptanceの全件最終合否判定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-workspace-governance/final-review-decision.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["final-review-decision.md に acceptance 3件・quality_constraints 6件全件の最終合否(pass)と、feature境界順守(feat-dual-catalog-web/feat-auth-tenancy非コピー、feat-user-org-admin S17非変更、feat-publish-pipeline状態機械非変更)の確認結果が記載されている","現行feature context sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1のscope_in/acceptance全件をP10責務として追跡し、未割当0件である","Normative closure: P02で監査exportをGET /api/v1/audit-events/export（workspace-admin、自tenant、filter共通、streaming CSV、salary/secret/token値禁止、hash-chain検証結果付き）として設計し、P05でroute/schema/UI export actionを実装する。governance policyは共通PublishRequest engineの注入可能なpolicy evaluator seamを通じてReady→Approval Pending/Approvedを決定し、feat-publish-pipeline本体を複製せず実consumer wiringを同feature write scopeに含める。 Evidence: tenant-scoped export、PII/secret redaction、hash-chain、policy block/approval route、共通state-machine consumer wiring、RBAC/audit testsをP04/P06/P07/P12/P13まで追跡する。"]
architecture_refs: []
parent_feature: "feat-workspace-governance"
feature_package_id: "feature-package/feat-workspace-governance"
phase_ref: "P10"
file_path: "tasks/feat-workspace-governance/sys-workspace-governance-p10.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:21:39Z","origin_kind":"system-dev-planner","source_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","source_path":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/task-specs/phase-10-final-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P07受入・P09品質保証の結果を統合し、goal-spec quality_constraints 6件とacceptance 3件の全件最終合否をfeature全体として判定するP10タスク。feature境界順守(feat-dual-catalog-web/feat-auth-tenancy非コピー、feat-user-org-admin S17非変更、feat-publish-pipeline状態機械非変更)も併せて最終確認する"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-workspace-governance/sys-workspace-governance-p10.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5l3.10","linked_at":"2026-07-19T14:22:05Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 最終レビュー — goal-spec 6件quality_constraints・3件acceptanceの全件最終合否判定

> task projection (P10 / parent: feat-workspace-governance)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10`
- task spec: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/task-specs/phase-10-final-review.md`
- package digest: `sha256:b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10`
- task spec SHA-256: `sha256:c5b0f7fb767e8a3e11e06f5f98a95c3c5330ec64711b4ad03943516e953c0140`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/dev-graph-registration-receipt.json`

## 依存

- `SYS-WORKSPACE-GOVERNANCE-P09`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-workspace-governance` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
