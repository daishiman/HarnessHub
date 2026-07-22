---
graph_node_id: "SYS-TENANT-DATA-RETENTION-P05"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-tenant-data-retention"
domain: "backend"
tags: ["feat-tenant-data-retention","macro-feature","backend","implementation"]
priority: null
start_date: null
target_date: null
iteration: null
title: "実装 — tenant_data_objects API・R2封筒暗号化保管/取得/即時完全削除・R2使用量監視cron拡張の実装"
owners: ["daishiman"]
created_at: "2026-07-19T14:19:56Z"
updated_at: "2026-07-19T14:19:56Z"
status: "active"
depends_on: ["SYS-TENANT-DATA-RETENTION-P04"]
related_nodes: ["feat-tenant-data-retention","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-backend"]
resource_scope: ["apps/hub/src/app/api/v1/tenant-data/","apps/hub/src/lib/scheduled/r2-usage-monitor.ts","apps/hub/src/lib/scheduled/usage-monitor.ts","apps/hub/src/lib/tenant-data/","docs/features/feat-tenant-data-retention/implementation-notes.md","packages/db/migrations/","packages/db/src/backup/tenant-data-tombstones.ts","packages/db/src/repository/tenant-deks.ts","packages/db/src/schema/encryption-keys.ts","packages/db/src/schema/tenant-data-objects.ts","packages/schemas/tenant-data/"]
purpose: "feat-tenant-data-retention の P05 を実行する: 実装 — tenant_data_objects API・R2封筒暗号化保管/取得/即時完全削除・R2使用量監視cron拡張の実装"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/hub/src/app/api/v1/tenant-data/","apps/hub/src/lib/scheduled/r2-usage-monitor.ts","apps/hub/src/lib/scheduled/usage-monitor.ts","apps/hub/src/lib/tenant-data/","docs/features/feat-tenant-data-retention/implementation-notes.md","packages/db/migrations/","packages/db/src/backup/tenant-data-tombstones.ts","packages/db/src/repository/tenant-deks.ts","packages/db/src/schema/encryption-keys.ts","packages/db/src/schema/tenant-data-objects.ts","packages/schemas/tenant-data/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["packages/db/src/schema/tenant-data-objects.ts, packages/schemas/tenant-data/, apps/hub/src/app/api/v1/tenant-data/, apps/hub/src/lib/tenant-data/, apps/hub/src/lib/scheduled/r2-usage-monitor.ts が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っている","現行feature context sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327のscope_in/acceptance全件をP05責務として追跡し、未割当0件である","Normative closure: tenant_data DEKはテナント別とし、encryption_keysへtenant_id nullable（既存global用途互換）を追加して tenant_data は UNIQUE(tenant_id,purpose,key_version)、tenant/purposeごとactive=1、lookup/rotation/deletionを実装する。削除はR2 blob・live DB rowに加え、日次exportの対象object/tombstone manifestを同一deletion transaction/workflowで更新し、過去backupからrestoreしてもtombstone適用で復元不能にする。既存Turso使用量cron dispatchへR2 monitorを実登録する。 Evidence: 2 tenantで別DEK/version、cross-tenant unwrap拒否、rotation、R2+DB+backup restore non-restoration、既存cron dispatch registration、70/90%通知をP04/P06/P09/P10/P11で実証する。"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: "feat-tenant-data-retention"
feature_package_id: "feature-package/feat-tenant-data-retention"
phase_ref: "P05"
file_path: "tasks/feat-tenant-data-retention/sys-tenant-data-retention-p05.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:19:56Z","origin_kind":"system-dev-planner","source_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","source_path":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/task-specs/phase-05-implementation.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.86
classification_reason: "tenant_data_objectsテーブル定義・upload(multipart→テナント別封筒暗号化→R2保存+DB参照登録)/取得(認可MW通過後にのみ復号)/即時完全削除(R2実体+DB行+監査event)のAPI実装、R2使用量監視cron拡張実装を行うP05実装タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-tenant-data-retention/sys-tenant-data-retention-p05.md","confidence":0.86}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-47b.5","linked_at":"2026-07-19T14:20:10Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 実装 — tenant_data_objects API・R2封筒暗号化保管/取得/即時完全削除・R2使用量監視cron拡張の実装

> task projection (P05 / parent: feat-tenant-data-retention)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1`
- task spec: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/task-specs/phase-05-implementation.md`
- package digest: `sha256:7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1`
- task spec SHA-256: `sha256:9a3abce9c5993ac3ed27350cd5a6d34850f2e307067f9b86ebcc6bc69b43d501`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/dev-graph-registration-receipt.json`

## 依存

- `SYS-TENANT-DATA-RETENTION-P04`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-tenant-data-retention` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
