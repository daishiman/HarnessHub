---
graph_node_id: "SYS-DOMAIN-MODEL-DB-P12"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-domain-model-db"
domain: "documentation"
tags: ["feat-domain-model-db","macro-feature","data","documentation","operations"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ドキュメント/運用 — 日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーション運用手順の runbook 作成"
owners: ["daishiman"]
created_at: "2026-07-19T14:12:28Z"
updated_at: "2026-07-19T14:12:28Z"
status: "active"
depends_on: ["SYS-DOMAIN-MODEL-DB-P11"]
related_nodes: ["feat-domain-model-db","arch-harness-hub-data","arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-domain-model-db/runbook.md","packages/db/cron/"]
purpose: "feat-domain-model-db の P12 を実行する: ドキュメント/運用 — 日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーション運用手順の runbook 作成"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-domain-model-db/runbook.md","packages/db/cron/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["runbook.md に日次 export・四半期 restore drill・migration 積み増し・KEK/DEK ローテーション・audit chain 検証の 5 手順が過不足なく記載されている","現行feature context sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffcのscope_in/acceptance全件をP12責務として追跡し、未割当0件である","P05-P11で実行済みの export/restore command と evidence を runbook 化する。未実装処理を文書で代替しない。","Normative closure: 現行 quality_constraints は10件である。P05 は schema/repository/R2 registry に加え、日次 control-plane export job、暗号化/マスク保持、検証可能な restore command/library をコード成果物として実装する。P06 はP05実装をschema test harnessと2テナントfixtureで検証し、まだ生成されていないP08 migration artifactを前提にしない。P08 は単一 migration lineageを生成して2テナントfixtureへ適用する。P09 はmigration apply、tenant isolation、export artifact integrity、別DB restore round-tripを実行するCI gateを .github/workflows/ci.yml へ接続する。P05/P06/P09は後続P12 runbookへ逆依存しない。P10は10 constraint IDをexact-setで判定する。 Evidence: P05実装パス、P08 migration apply、2-tenant fixture、export→別DB restore round-trip、salary暗号化/マスク断面、単一lineage検査を証跡化する。"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-backend"]
parent_feature: "feat-domain-model-db"
feature_package_id: "feature-package/feat-domain-model-db"
phase_ref: "P12"
file_path: "tasks/feat-domain-model-db/sys-domain-model-db-p12.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:12:28Z","origin_kind":"system-dev-planner","source_digest":"6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b","source_path":".dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/task-specs/phase-12-documentation-operations.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.83
classification_reason: "P11 の evidence bundle を踏まえ、日次 export・四半期 restore drill・migration 積み増し・KEK/DEK ローテーション・audit chain 検証の運用 runbook を作成する P12 ドキュメント/運用タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-domain-model-db/sys-domain-model-db-p12.md","confidence":0.83}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-u6q.12","linked_at":"2026-07-18T01:43:51Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# ドキュメント/運用 — 日次 export・四半期 restore drill・migration 適用・KEK/DEK ローテーション運用手順の runbook 作成

> task projection (P12 / parent: feat-domain-model-db)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b`
- task spec: `.dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/task-specs/phase-12-documentation-operations.md`
- package digest: `sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b`
- task spec SHA-256: `sha256:5bb6a6313741d3198518fb6927a3acc7a5290856257cea4638f91d0e1419784f`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/dev-graph-registration-receipt.json`

## 依存

- `SYS-DOMAIN-MODEL-DB-P11`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-domain-model-db` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
