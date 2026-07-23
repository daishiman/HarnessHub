---
graph_node_id: "SYS-WORKSPACE-GOVERNANCE-P02"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-workspace-governance"
domain: "backend"
tags: ["feat-workspace-governance","macro-feature","backend","architecture-decision"]
priority: null
start_date: null
target_date: null
iteration: null
title: "アーキテクチャ設計 — governance_policies拡張ポイント・publish/:id/reject契約・RBAC権限マトリクスUI・監査ログUI・追加監査actionの決定"
owners: ["daishiman"]
created_at: "2026-07-19T14:21:39Z"
updated_at: "2026-07-19T14:21:39Z"
status: "active"
depends_on: ["SYS-WORKSPACE-GOVERNANCE-P01"]
related_nodes: ["feat-workspace-governance","arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-workspace-governance/architecture-decision-record.md"]
purpose: "feat-workspace-governance の P02 を実行する: アーキテクチャ設計 — governance_policies拡張ポイント・publish/:id/reject契約・RBAC権限マトリクスUI・監査ログUI・追加監査actionの決定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-workspace-governance/architecture-decision-record.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["architecture-decision-record.md に governance_policiesテーブル設計とpolicy hook接続方式、publish/:id/reject契約、RBAC権限マトリクスUI(S04拡張)設計、監査ログUI(S06)設計、統制ポリシー設定UI(S04拡張)設計、追加監査action governance.policy_changeの6系統すべてのarchitecture decisionと、GET /api/v1/publish詳細設計・PublishRequest状態機械本体をfeat-publish-pipeline所有として扱う明示的スコープ境界が記載されている","現行feature context sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1のscope_in/acceptance全件をP02責務として追跡し、未割当0件である","Normative closure: P02で監査exportをGET /api/v1/audit-events/export（workspace-admin、自tenant、filter共通、streaming CSV、salary/secret/token値禁止、hash-chain検証結果付き）として設計し、P05でroute/schema/UI export actionを実装する。governance policyは共通PublishRequest engineの注入可能なpolicy evaluator seamを通じてReady→Approval Pending/Approvedを決定し、feat-publish-pipeline本体を複製せず実consumer wiringを同feature write scopeに含める。 Evidence: tenant-scoped export、PII/secret redaction、hash-chain、policy block/approval route、共通state-machine consumer wiring、RBAC/audit testsをP04/P06/P07/P12/P13まで追跡する。"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-frontend"]
parent_feature: "feat-workspace-governance"
feature_package_id: "feature-package/feat-workspace-governance"
phase_ref: "P02"
file_path: "tasks/feat-workspace-governance/sys-workspace-governance-p02.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:21:39Z","origin_kind":"system-dev-planner","source_digest":"b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10","source_path":".dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/task-specs/phase-02-architecture.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P01が据え置いた(1) governance_policiesテナントスコープテーブルとPublishRequest状態機械へのpolicy hook接続方式、(2) 既存publish.reject監査actionに対応するPOST /api/v1/publish/:id/rejectエンドポイント契約、(3) RBAC権限マトリクス読み取り専用UI(S04拡張、既存users.role_change配線)、(4) 監査event閲覧・検索UI(S06、既存GET /api/v1/audit-events)、(5) 統制ポリシー設定UI(S04拡張)、(6) 追加監査action governance.policy_change、の6系統を確定するP02アーキテクチャ設計タスク。GET /api/v1/publish詳細設計とPublishRequest状態機械本体はfeat-publish-pipeline所有として明示的にスコープ外にする"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-workspace-governance/sys-workspace-governance-p02.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5l3.2","linked_at":"2026-07-19T14:21:47Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# アーキテクチャ設計 — governance_policies拡張ポイント・publish/:id/reject契約・RBAC権限マトリクスUI・監査ログUI・追加監査actionの決定

> task projection (P02 / parent: feat-workspace-governance)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10`
- task spec: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/task-specs/phase-02-architecture.md`
- package digest: `sha256:b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10`
- task spec SHA-256: `sha256:5fce587c8606ba586a5f7b2c167a1937ad248ace7f69c3fd58ab6edeb2b96aa3`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-workspace-governance/b9e6253a594b533507a73c4eb38c33f2b2fb08c8474e2ec0053aa4941e943b10/dev-graph-registration-receipt.json`

## 依存

- `SYS-WORKSPACE-GOVERNANCE-P01`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-workspace-governance` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
