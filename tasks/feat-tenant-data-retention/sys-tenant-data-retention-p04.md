---
graph_node_id: "SYS-TENANT-DATA-RETENTION-P04"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-tenant-data-retention"
domain: "quality"
tags: ["feat-tenant-data-retention","macro-feature","quality","test-design"]
priority: null
start_date: null
target_date: null
iteration: null
title: "テストファースト設計 — テナント分離・削除完全性・暗号化検証・R2使用量監視アラートのテスト設計"
owners: ["daishiman"]
created_at: "2026-07-19T14:19:56Z"
updated_at: "2026-07-19T14:19:56Z"
status: "active"
depends_on: ["SYS-TENANT-DATA-RETENTION-P03"]
related_nodes: ["feat-tenant-data-retention","arch-harness-hub-security"]
resource_scope: ["apps/hub/src/lib/scheduled/usage-monitor.ts","docs/features/feat-tenant-data-retention/test-design.md","packages/db/migrations/","packages/db/src/__tests__/tenant-data/","packages/db/src/backup/tenant-data-tombstones.ts","packages/db/src/repository/tenant-deks.ts","packages/db/src/schema/encryption-keys.ts"]
purpose: "feat-tenant-data-retention の P04 を実行する: テストファースト設計 — テナント分離・削除完全性・暗号化検証・R2使用量監視アラートのテスト設計"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/lib/scheduled/usage-monitor.ts","docs/features/feat-tenant-data-retention/test-design.md","packages/db/migrations/","packages/db/src/__tests__/tenant-data/","packages/db/src/backup/tenant-data-tombstones.ts","packages/db/src/repository/tenant-deks.ts","packages/db/src/schema/encryption-keys.ts"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["test-design.md に acceptance 3件と quality_constraints 6件全てに対応するテストケースが記載され、packages/db/src/__tests__/tenant-data/ にスタブが作成されている","現行feature context sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327のscope_in/acceptance全件をP04責務として追跡し、未割当0件である","Normative closure: tenant_data DEKはテナント別とし、encryption_keysへtenant_id nullable（既存global用途互換）を追加して tenant_data は UNIQUE(tenant_id,purpose,key_version)、tenant/purposeごとactive=1、lookup/rotation/deletionを実装する。削除はR2 blob・live DB rowに加え、日次exportの対象object/tombstone manifestを同一deletion transaction/workflowで更新し、過去backupからrestoreしてもtombstone適用で復元不能にする。既存Turso使用量cron dispatchへR2 monitorを実登録する。 Evidence: 2 tenantで別DEK/version、cross-tenant unwrap拒否、rotation、R2+DB+backup restore non-restoration、既存cron dispatch registration、70/90%通知をP04/P06/P09/P10/P11で実証する。"]
architecture_refs: ["arch-harness-hub-security"]
parent_feature: "feat-tenant-data-retention"
feature_package_id: "feature-package/feat-tenant-data-retention"
phase_ref: "P04"
file_path: "tasks/feat-tenant-data-retention/sys-tenant-data-retention-p04.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:19:56Z","origin_kind":"system-dev-planner","source_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","source_path":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/task-specs/phase-04-test-design.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.84
classification_reason: "acceptance 3件(テナント分離・削除完全性・暗号化検証)とquality_constraints 6件に対応するテナント分離テスト・削除完全性テスト(R2実体/DB行/backup断面)・暗号化検証テスト(IV再利用なし・AAD不一致復号失敗を含む)・R2使用量監視アラートテストのテストケースを設計するP04タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-tenant-data-retention/sys-tenant-data-retention-p04.md","confidence":0.84}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-47b.4","linked_at":"2026-07-19T14:20:08Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# テストファースト設計 — テナント分離・削除完全性・暗号化検証・R2使用量監視アラートのテスト設計

> task projection (P04 / parent: feat-tenant-data-retention)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1`
- task spec: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/task-specs/phase-04-test-design.md`
- package digest: `sha256:7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1`
- task spec SHA-256: `sha256:72d8c554b3cf64f0319cdef1530129db1dd2e82a149aeff09c0b8c6475937653`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/dev-graph-registration-receipt.json`

## 依存

- `SYS-TENANT-DATA-RETENTION-P03`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
