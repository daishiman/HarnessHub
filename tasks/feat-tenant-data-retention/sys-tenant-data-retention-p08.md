---
graph_node_id: "SYS-TENANT-DATA-RETENTION-P08"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-tenant-data-retention"
domain: "data"
tags: ["feat-tenant-data-retention","macro-feature","data","refactoring-migration"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リファクタリング/マイグレーション — encryption_keys.tenant_id/key uniqueness migration・per-tenant DEK provisioning・R2バケット/prefix新設の既存基盤互換移行"
owners: ["daishiman"]
created_at: "2026-07-19T14:19:56Z"
updated_at: "2026-07-19T14:19:56Z"
status: "active"
depends_on: ["SYS-TENANT-DATA-RETENTION-P07"]
related_nodes: ["feat-tenant-data-retention","arch-harness-hub-data","arch-harness-hub-security"]
resource_scope: ["apps/hub/src/lib/scheduled/usage-monitor.ts","docs/features/feat-tenant-data-retention/refactoring-migration-note.md","packages/db/migrations/","packages/db/src/backup/tenant-data-tombstones.ts","packages/db/src/repository/tenant-deks.ts","packages/db/src/schema/encryption-keys.ts"]
purpose: "feat-tenant-data-retention の P08 を実行する: リファクタリング/マイグレーション — encryption_keys.tenant_id/key uniqueness migration・per-tenant DEK provisioning・R2バケット/prefix新設の既存基盤互換移行"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/lib/scheduled/usage-monitor.ts","docs/features/feat-tenant-data-retention/refactoring-migration-note.md","packages/db/migrations/","packages/db/src/backup/tenant-data-tombstones.ts","packages/db/src/repository/tenant-deks.ts","packages/db/src/schema/encryption-keys.ts"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["refactoring-migration-note.md に encryption_keys.tenant_id/key uniqueness migration・per-tenant DEK provisioning migrationの適用手順・既存salary/idp_secret運用への非破壊確認結果と、R2バケット/prefix新設がPackageRegistry/backupsに影響しないことの確認結果が記載されている","現行feature context sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327のscope_in/acceptance全件をP08責務として追跡し、未割当0件である","Normative closure: tenant_data DEKはテナント別とし、encryption_keysへtenant_id nullable（既存global用途互換）を追加して tenant_data は UNIQUE(tenant_id,purpose,key_version)、tenant/purposeごとactive=1、lookup/rotation/deletionを実装する。削除はR2 blob・live DB rowに加え、日次exportの対象object/tombstone manifestを同一deletion transaction/workflowで更新し、過去backupからrestoreしてもtombstone適用で復元不能にする。既存Turso使用量cron dispatchへR2 monitorを実登録する。 Evidence: 2 tenantで別DEK/version、cross-tenant unwrap拒否、rotation、R2+DB+backup restore non-restoration、既存cron dispatch registration、70/90%通知をP04/P06/P09/P10/P11で実証する。"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-security"]
parent_feature: "feat-tenant-data-retention"
feature_package_id: "feature-package/feat-tenant-data-retention"
phase_ref: "P08"
file_path: "tasks/feat-tenant-data-retention/sys-tenant-data-retention-p08.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:19:56Z","origin_kind":"system-dev-planner","source_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","source_path":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/task-specs/phase-08-refactoring-migration.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.83
classification_reason: "既存encryption_keysテーブル(feat-domain-model-db/feat-auth-tenancy所有のsalary/idp_secret運用と共有するinfrastructure)へtenant_id nullable/tenant-scoped unique indexを追加し、tenantごとにactive DEKをprovisionするmigrationと、R2の新規バケットまたはprefix分離をPackageRegistry/backupsに影響を与えず適用するP08マイグレーションタスク。本featureは新規実装だが、encryption_keysは既存共有テーブルであるためbackward-compatible migrationが必須責務となる"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-tenant-data-retention/sys-tenant-data-retention-p08.md","confidence":0.83}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-47b.8","linked_at":"2026-07-19T14:20:17Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リファクタリング/マイグレーション — encryption_keys.tenant_id/key uniqueness migration・per-tenant DEK provisioning・R2バケット/prefix新設の既存基盤互換移行

> task projection (P08 / parent: feat-tenant-data-retention)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1`
- task spec: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/task-specs/phase-08-refactoring-migration.md`
- package digest: `sha256:7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1`
- task spec SHA-256: `sha256:dbd74574bfa45bfe25b520caefa3180235e186ffffa604001932f09a03feec49`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/dev-graph-registration-receipt.json`

## 依存

- `SYS-TENANT-DATA-RETENTION-P07`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
