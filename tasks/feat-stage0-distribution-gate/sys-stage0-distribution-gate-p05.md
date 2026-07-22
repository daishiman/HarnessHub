---
graph_node_id: "SYS-STAGE0-DISTRIBUTION-GATE-P05"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-stage0-distribution-gate"
domain: "infrastructure"
tags: ["feat-stage0-distribution-gate","macro-feature","infrastructure","implementation"]
priority: null
start_date: null
target_date: null
iteration: null
title: "実装 — 最小 skill package・marketplace.json・Bootstrap Installer 試作の作成"
owners: ["daishiman"]
created_at: "2026-07-19T14:19:08Z"
updated_at: "2026-07-20T22:51:28Z"
status: "closed"
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P04"]
related_nodes: ["feat-stage0-distribution-gate","arch-harness-hub-infrastructure"]
resource_scope: [".dev-graph/cache/stage0-decision-registration-receipt.json",".dev-graph/cache/stage0-decision-registration-request.json",".dev-graph/cache/stage0-stage1-gate-receipt.json","docs/features/feat-stage0-distribution-gate/implementation-notes.md","docs/features/feat-stage0-distribution-gate/verification-artifacts/bootstrap-installer-prototype/","docs/features/feat-stage0-distribution-gate/verification-artifacts/marketplace.json","docs/features/feat-stage0-distribution-gate/verification-artifacts/minimal-skill-package/"]
purpose: "feat-stage0-distribution-gate の P05 を実行する: 実装 — 最小 skill package・marketplace.json・Bootstrap Installer 試作の作成"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: [".dev-graph/cache/stage0-decision-registration-receipt.json",".dev-graph/cache/stage0-decision-registration-request.json",".dev-graph/cache/stage0-stage1-gate-receipt.json","docs/features/feat-stage0-distribution-gate/implementation-notes.md","docs/features/feat-stage0-distribution-gate/verification-artifacts/bootstrap-installer-prototype/","docs/features/feat-stage0-distribution-gate/verification-artifacts/marketplace.json","docs/features/feat-stage0-distribution-gate/verification-artifacts/minimal-skill-package/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-stage0-distribution-gate/verification-artifacts/ 配下に最小 skill package・marketplace.json・Bootstrap Installer 試作が作成され、implementation-notes.md に P04 の test-design.md に列挙された全検証ケースに対応する検証対象一式が揃っていることが記載されている","現行feature context sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0aのscope_in/acceptance全件をP05責務として追跡し、未割当0件である","Normative closure: P07は『P13で登録予定』をpass根拠にできない。採用経路decisionがC01単一writerへ登録され、writer receiptのstatus=applied、decision id/digest、spec-state after digestが確認されるまでP07/P10/P13とfeature完了をfail-closedにする。Stage1のPublisherとThin Dual Catalog双方のparent feature depends_onへ本featureを登録し、Beads edge parityまで確認する。 Evidence: 2経路実機記録、Windows/macOS E2E、C01 writer receipt、decision exact lookup、Publisher/Dual Catalog feature dependency、Beads edge parityを必須とする。"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: "feat-stage0-distribution-gate"
feature_package_id: "feature-package/feat-stage0-distribution-gate"
phase_ref: "P05"
file_path: "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p05.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:19:08Z","origin_kind":"system-dev-planner","source_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","source_path":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/task-specs/phase-05-implementation.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P02/P04 で確定した設計・検証ケースに基づき、最小 skill package・URL 型 marketplace 用 marketplace.json・Bootstrap Installer 試作を C2 (無料枠内) で作成する P05 実装タスク。本 feature は scope_out に Hub 本体実装を含むため apps/hub・packages 配下は変更しない"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p05.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-j71.5","linked_at":"2026-07-18T16:05:19Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: [{"base_branch":"main","branch":"devgraph/SYS-STAGE0-DISTRIBUTION-GATE-P05","head_sha":"fe7042881c4e76f0a21f1902177134921d496abb","last_seen_at":"2026-07-20T22:46:37.559620Z","lease_acquired_at":"2026-07-20T22:46:32.471252Z","released_at":null,"state":"claimed","worktree_id":"wt_eed96293f3fd512f"}]
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 実装 — 最小 skill package・marketplace.json・Bootstrap Installer 試作の作成

> task projection (P05 / parent: feat-stage0-distribution-gate)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b`
- task spec: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/task-specs/phase-05-implementation.md`
- package digest: `sha256:30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b`
- task spec SHA-256: `sha256:9a04e800419b6f70721dcdb3fdcded925c86b78666d4b8ce1f8e1876441ae8e1`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/dev-graph-registration-receipt.json`

## 依存

- `SYS-STAGE0-DISTRIBUTION-GATE-P04`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
