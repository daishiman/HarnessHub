---
graph_node_id: "SYS-WORKSPACE-GOVERNANCE-P06"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-workspace-governance"
domain: "quality"
tags: ["feat-workspace-governance","macro-feature","quality","test-run"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テスト実行 — policy遮断・監査テナントスコープ検索・RBAC変更監査記録・T-1/T-1b/T-1c/T-6テストの実行"
owners: ["daishiman"]
created_at: "2026-07-19T14:21:39Z"
updated_at: "2026-07-19T14:21:39Z"
status: "active"
depends_on: ["SYS-WORKSPACE-GOVERNANCE-P05"]
related_nodes: ["feat-workspace-governance","arch-harness-hub-security"]
resource_scope: ["apps/hub/src/app/(dashboard)/audit-log/","apps/hub/src/app/api/v1/audit-events/export/","apps/hub/src/lib/publish/policy-adapters/governance.ts","docs/features/feat-workspace-governance/test-run-results.md","packages/db/src/__tests__/workspace-governance/","packages/schemas/governance/audit-export.ts"]
purpose: "feat-workspace-governance の P06 を実行する: テスト実行 — policy遮断・監査テナントスコープ検索・RBAC変更監査記録・T-1/T-1b/T-1c/T-6テストの実行"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/(dashboard)/audit-log/","apps/hub/src/app/api/v1/audit-events/export/","apps/hub/src/lib/publish/policy-adapters/governance.ts","docs/features/feat-workspace-governance/test-run-results.md","packages/db/src/__tests__/workspace-governance/","packages/schemas/governance/audit-export.ts"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-run-results.md に quality_constraints 6件全ての pass 結果(policy遮断・監査テナントスコープ検索・RBAC変更監査記録・T-1/T-1b/T-1c/T-6の実測結果を含む)が記録されている(fail が残る場合は差し戻し理由が明記されている)","現行feature context sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1のscope_in/acceptance全件をP06責務として追跡し、未割当0件である","Normative closure: P02で監査exportをGET /api/v1/audit-events/export（workspace-admin、自tenant、filter共通、streaming CSV、salary/secret/token値禁止、hash-chain検証結果付き）として設計し、P05でroute/schema/UI export actionを実装する。governance policyは共通PublishRequest engineの注入可能なpolicy evaluator seamを通じてReady→Approval Pending/Approvedを決定し、feat-publish-pipeline本体を複製せず実consumer wiringを同feature write scopeに含める。 Evidence: tenant-scoped export、PII/secret redaction、hash-chain、policy block/approval route、共通state-machine consumer wiring、RBAC/audit testsをP04/P06/P07/P12/P13まで追跡する。"]
architecture_refs: ["arch-harness-hub-security"]
parent_feature: "feat-workspace-governance"
feature_package_id: "feature-package/feat-workspace-governance"
phase_ref: "P06"
file_path: "tasks/feat-workspace-governance/sys-workspace-governance-p06.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:21:39Z","origin_kind":"system-dev-planner","source_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","source_path":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/task-specs/phase-06-test-run.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.84
classification_reason: "P04で設計したpolicy遮断テスト・監査ログテナントスコープ検索テスト・RBAC変更監査記録テスト・T-1/T-1b/T-1c/T-6適合確認テストを実行し結果を記録するP06テスト実行タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-workspace-governance/sys-workspace-governance-p06.md","confidence":0.84}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5l3.6","linked_at":"2026-07-19T14:21:56Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# テスト実行 — policy遮断・監査テナントスコープ検索・RBAC変更監査記録・T-1/T-1b/T-1c/T-6テストの実行

> task projection (P06 / parent: feat-workspace-governance)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10`
- task spec: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/task-specs/phase-06-test-run.md`
- package digest: `sha256:b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10`
- task spec SHA-256: `sha256:c4cfbe596fc7ee3577a53f55ab7453633d947e0d93cef510d79c240e2c79bed0`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/dev-graph-registration-receipt.json`

## 依存

- `SYS-WORKSPACE-GOVERNANCE-P05`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-workspace-governance` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
