---
graph_node_id: "SYS-DOC-GOVERNANCE-PORTABILITY-P02"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-doc-governance-portability"
domain: "documentation"
tags: ["feat-doc-governance-portability","macro-feature","doc-governance","documentation"]
priority: null
start_date: null
target_date: null
iteration: null
title: "検査設計 — 300 行 lint・仕組み-ナレッジ境界検査・移植 opt-in 検査の入出力契約確定"
owners: ["daishiman"]
created_at: "2026-07-22T02:31:19Z"
updated_at: "2026-07-22T02:47:44Z"
status: "active"
depends_on: ["SYS-DOC-GOVERNANCE-PORTABILITY-P01"]
related_nodes: ["feat-doc-governance-portability","arch-harness-hub-dev-workflow"]
resource_scope: ["docs/features/feat-doc-governance-portability/design.md"]
purpose: "feat-doc-governance-portability の P02 を実行する: 検査設計 — 300 行 lint・仕組み-ナレッジ境界検査・移植 opt-in 検査の入出力契約確定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-doc-governance-portability/design.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["design.md に lint-doc-line-limit.py / lint-mechanism-knowledge-boundary.py / lint-portability-knowledge-optin.py の入出力契約 (引数・exit code・検出条件・JSON 出力形状) が確定している","scripts/doc-line-limit-allowlist.json の schema (path・baseline_line_count・縮小のみ許す ratchet 方式: 実測行数が baseline を上回れば fail-closed、baseline 未満へ縮小したら baseline も追随して更新する) が確定している","hard-coded ナレッジ参照検出について、制御フロー・既定値として使われる repo 固有 node id/path/qa 番号のリテラル (FAIL 対象) と、根拠引用としてのコメント・docstring 内 qa 番号記載 (PASS 対象) を区別する判定基準が false-positive ケース付きで確定している",".claude-plugin/bundles.json・plugin.json の distributable フラグ・scripts/install-bundle.sh の現状 (mechanism=plugin 名のみ参照、knowledge content-root 不参照) を lint-portability-knowledge-optin.py がどう固定検査するかの契約が確定している","P01 の据置事項 4 点が全て確定し、未確定の持ち越しが 0 件である"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: "feat-doc-governance-portability"
feature_package_id: "feature-package/feat-doc-governance-portability"
phase_ref: "P02"
file_path: "tasks/feat-doc-governance-portability/sys-doc-governance-portability-p02.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-22T02:31:19Z","origin_kind":"system-dev-planner","source_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","source_path":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-02-architecture.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "qa-070 のドキュメント統治・移植性境界 3 検査のうち P02 責務 (検査設計 — 300 行 lint・仕組み-ナレッジ境界検査・移植 opt-in 検査の入出力契約確定) を実行する task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-doc-governance-portability/sys-doc-governance-portability-p02.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ik0.2","linked_at":"2026-07-22T02:47:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-22T09:35:00Z","missing_sections":[],"status":"complete"}
---

# 検査設計 — 300 行 lint・仕組み-ナレッジ境界検査・移植 opt-in 検査の入出力契約確定

> task projection (P02 / parent: feat-doc-governance-portability)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/task-specs/phase-02-architecture.md`
- package digest: `sha256:d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee`
- task spec SHA-256: `sha256:4f948c902493b0525fd0e2ae7bcdcd1a8bccfbdc57c6d7db769a430c1b27ff6a`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/dev-graph-registration-receipt.json`

## 依存

- 直前 phase (SYS-DOC-GOVERNANCE-PORTABILITY-P01) の完了に依存する (直列 DAG)。

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
