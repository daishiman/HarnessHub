---
graph_node_id: "SYS-TENANT-DATA-RETENTION-P02"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-tenant-data-retention"
domain: "backend"
tags: ["feat-tenant-data-retention","macro-feature","backend","architecture-decision"]
priority: null
start_date: null
target_date: null
iteration: null
title: "アーキテクチャ設計 — encryption_keys.purpose拡張・R2 tenant prefix分離・API詳細設計・R2使用量監視cron拡張・削除完全性テスト採番の決定"
owners: ["daishiman"]
created_at: "2026-07-19T14:19:56Z"
updated_at: "2026-07-19T14:19:56Z"
status: "active"
depends_on: ["SYS-TENANT-DATA-RETENTION-P01"]
related_nodes: ["feat-tenant-data-retention","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-infrastructure"]
resource_scope: ["docs/features/feat-tenant-data-retention/architecture-decision-record.md"]
purpose: "feat-tenant-data-retention の P02 を実行する: アーキテクチャ設計 — encryption_keys.purpose拡張・R2 tenant prefix分離・API詳細設計・R2使用量監視cron拡張・削除完全性テスト採番の決定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-tenant-data-retention/architecture-decision-record.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["architecture-decision-record.md に (1) encryption_keys.purpose enum へ tenant_data を追加する拡張決定とAAD/IV運用のtenant_dataへの適用方式、(2) tenant_data保管APIのエンドポイント詳細設計(パス・zodスキーマ・rate limit)、(3) R2 tenant prefix分離設計(PackageRegistry/backupsとのバケットまたはprefix分離)、(4) 既存Turso使用量監視cronへのR2使用量監視追加設計、(5) 削除完全性テストのテストID採番とテストケース定義、の5系統すべてのarchitecture decisionが記載されている","現行feature context sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327のscope_in/acceptance全件をP02責務として追跡し、未割当0件である","Normative closure: tenant_data DEKはテナント別とし、encryption_keysへtenant_id nullable（既存global用途互換）を追加して tenant_data は UNIQUE(tenant_id,purpose,key_version)、tenant/purposeごとactive=1、lookup/rotation/deletionを実装する。削除はR2 blob・live DB rowに加え、日次exportの対象object/tombstone manifestを同一deletion transaction/workflowで更新し、過去backupからrestoreしてもtombstone適用で復元不能にする。既存Turso使用量cron dispatchへR2 monitorを実登録する。 Evidence: 2 tenantで別DEK/version、cross-tenant unwrap拒否、rotation、R2+DB+backup restore non-restoration、既存cron dispatch registration、70/90%通知をP04/P06/P09/P10/P11で実証する。"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-backend","arch-harness-hub-infrastructure"]
parent_feature: "feat-tenant-data-retention"
feature_package_id: "feature-package/feat-tenant-data-retention"
phase_ref: "P02"
file_path: "tasks/feat-tenant-data-retention/sys-tenant-data-retention-p02.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:19:56Z","origin_kind":"system-dev-planner","source_digest":"7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1","source_path":".dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/task-specs/phase-02-architecture.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "qa-046が次回security深掘り(feature P02前)へ据え置いたencryption_keys.purpose enum拡張(tenant_data追加)とAAD/IV運用適用、qa-048が据え置いたtenant_data保管APIのエンドポイント詳細設計(パス・zodスキーマ・rate limit)、R2 tenant prefix分離設計、qa-045のR2使用量監視cron拡張設計、削除完全性テスト(T番号未採番)の採番・ケース定義の5系統を確定するP02アーキテクチャ設計タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-tenant-data-retention/sys-tenant-data-retention-p02.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-47b.2","linked_at":"2026-07-19T14:20:04Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# アーキテクチャ設計 — encryption_keys.purpose拡張・R2 tenant prefix分離・API詳細設計・R2使用量監視cron拡張・削除完全性テスト採番の決定

> task projection (P02 / parent: feat-tenant-data-retention)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1`
- task spec: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/task-specs/phase-02-architecture.md`
- package digest: `sha256:7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1`
- task spec SHA-256: `sha256:b44e12acd1d993aeb9b09ff7054d0d545130da11908fd9384dfc51c14d74789c`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-tenant-data-retention/7cc4cbbe32bcbdf9d8a69c1305cdfca81fe60bd36da2338c2619c1d3323142c1/dev-graph-registration-receipt.json`

## 依存

- `SYS-TENANT-DATA-RETENTION-P01`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-tenant-data-retention` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
