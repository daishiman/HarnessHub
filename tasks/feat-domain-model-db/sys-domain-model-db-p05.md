---
graph_node_id: "SYS-DOMAIN-MODEL-DB-P05"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-domain-model-db"
domain: "backend"
tags: ["feat-domain-model-db","macro-feature","data","implementation"]
priority: null
start_date: null
target_date: null
iteration: null
title: "実装 — コアドメイン Drizzle スキーマ・接続層 (libSQL/D1)・リポジトリ層・R2 content-addressed registry の実装"
owners: ["daishiman"]
created_at: "2026-07-19T14:12:28Z"
updated_at: "2026-07-19T14:12:28Z"
status: "active"
depends_on: ["SYS-DOMAIN-MODEL-DB-P04"]
related_nodes: ["feat-domain-model-db","arch-harness-hub-data","arch-harness-hub-backend"]
resource_scope: [".github/workflows/ci.yml","packages/db/__tests__/backup-restore.test.ts","packages/db/__tests__/fixtures/two-tenants.ts","packages/db/backup/","packages/db/connection/","packages/db/registry/","packages/db/repository/","packages/db/schema/core/","packages/db/schema/index.ts","packages/db/scripts/export-control-plane.ts","packages/db/scripts/restore-control-plane.ts"]
purpose: "feat-domain-model-db の P05 を実行する: 実装 — コアドメイン Drizzle スキーマ・接続層 (libSQL/D1)・リポジトリ層・R2 content-addressed registry の実装"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: [".github/workflows/ci.yml","packages/db/__tests__/backup-restore.test.ts","packages/db/__tests__/fixtures/two-tenants.ts","packages/db/backup/","packages/db/connection/","packages/db/registry/","packages/db/repository/","packages/db/schema/core/","packages/db/schema/index.ts","packages/db/scripts/export-control-plane.ts","packages/db/scripts/restore-control-plane.ts"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["P04 で作成したテストスタブが実装コードに対して解決可能な状態 (import 解決・型整合) になっている","現行feature context sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffcのscope_in/acceptance全件をP05責務として追跡し、未割当0件である","packages/db に日次 export job と検証可能な restore command/library を実装する。P12 の runbook は消費物であり、P05 実装の前提にしない。","Normative closure: 現行 quality_constraints は10件である。P05 は schema/repository/R2 registry に加え、日次 control-plane export job、暗号化/マスク保持、検証可能な restore command/library をコード成果物として実装する。P06 はP05実装をschema test harnessと2テナントfixtureで検証し、まだ生成されていないP08 migration artifactを前提にしない。P08 は単一 migration lineageを生成して2テナントfixtureへ適用する。P09 はmigration apply、tenant isolation、export artifact integrity、別DB restore round-tripを実行するCI gateを .github/workflows/ci.yml へ接続する。P05/P06/P09は後続P12 runbookへ逆依存しない。P10は10 constraint IDをexact-setで判定する。 Evidence: P05実装パス、P08 migration apply、2-tenant fixture、export→別DB restore round-trip、salary暗号化/マスク断面、単一lineage検査を証跡化する。"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-backend"]
parent_feature: "feat-domain-model-db"
feature_package_id: "feature-package/feat-domain-model-db"
phase_ref: "P05"
file_path: "tasks/feat-domain-model-db/sys-domain-model-db-p05.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:12:28Z","origin_kind":"system-dev-planner","source_digest":"6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b","source_path":".dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/task-specs/phase-05-implementation.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P02/P04 で確定した設計とテストスタブに基づき packages/db のスキーマ・接続層・リポジトリ層・R2 registry を実装する P05 実装タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-domain-model-db/sys-domain-model-db-p05.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-u6q.5","linked_at":"2026-07-18T01:43:42Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 実装 — コアドメイン Drizzle スキーマ・接続層 (libSQL/D1)・リポジトリ層・R2 content-addressed registry の実装

> task projection (P05 / parent: feat-domain-model-db)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b`
- task spec: `.dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/task-specs/phase-05-implementation.md`
- package digest: `sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b`
- task spec SHA-256: `sha256:8ac97ba43c3eefcab8e2e9ac09ae7e9f616d3f02d83fc73c333067531a1240a0`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/dev-graph-registration-receipt.json`

## 依存

- `SYS-DOMAIN-MODEL-DB-P04`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-domain-model-db` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
