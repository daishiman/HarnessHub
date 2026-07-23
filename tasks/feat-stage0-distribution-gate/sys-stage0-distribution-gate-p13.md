---
graph_node_id: "SYS-STAGE0-DISTRIBUTION-GATE-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-stage0-distribution-gate"
domain: "operations"
tags: ["feat-stage0-distribution-gate","macro-feature","operations","release-deploy"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リリース/デプロイ — 採用経路の decision record C01 writer登録 (C01 writer 経由) と Stage 1 開始条件判定"
owners: ["daishiman"]
created_at: "2026-07-19T14:19:08Z"
updated_at: "2026-07-21T03:18:20Z"
status: "closed"
depends_on: ["SYS-STAGE0-DISTRIBUTION-GATE-P12"]
related_nodes: ["feat-stage0-distribution-gate","arch-harness-hub-infrastructure"]
resource_scope: [".dev-graph/cache/stage0-decision-registration-receipt.json",".dev-graph/cache/stage0-decision-registration-request.json",".dev-graph/cache/stage0-stage1-gate-receipt.json","docs/features/feat-stage0-distribution-gate/release-record.md"]
purpose: "feat-stage0-distribution-gate の P13 を実行する: リリース/デプロイ — 採用経路の decision record C01 writer登録 (C01 writer 経由) と Stage 1 開始条件判定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: [".dev-graph/cache/stage0-decision-registration-receipt.json",".dev-graph/cache/stage0-decision-registration-request.json",".dev-graph/cache/stage0-stage1-gate-receipt.json","docs/features/feat-stage0-distribution-gate/release-record.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["release-record.md に N/A: 本 feature は Hub 本体の実デプロイを持たないため実デプロイなし、という close-out 判断、採用経路の decision record C01 writer登録要求・適用receipt (id/question/status/options/評価軸/確定根拠。system-spec/spec-state.json decisions[] への実書込は C01 writer 経由) 、および Stage 1 開始条件 (H7 成立) の判定結果の 3 点が記載されている","現行feature context sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0aのscope_in/acceptance全件をP13責務として追跡し、未割当0件である","Normative closure: P07は『P13で登録予定』をpass根拠にできない。採用経路decisionがC01単一writerへ登録され、writer receiptのstatus=applied、decision id/digest、spec-state after digestが確認されるまでP07/P10/P13とfeature完了をfail-closedにする。Stage1のPublisherとThin Dual Catalog双方のparent feature depends_onへ本featureを登録し、Beads edge parityまで確認する。 Evidence: 2経路実機記録、Windows/macOS E2E、C01 writer receipt、decision exact lookup、Publisher/Dual Catalog feature dependency、Beads edge parityを必須とする。"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: "feat-stage0-distribution-gate"
feature_package_id: "feature-package/feat-stage0-distribution-gate"
phase_ref: "P13"
file_path: "tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p13.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:19:08Z","origin_kind":"system-dev-planner","source_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","source_path":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "本 feature は Hub 本体を持たないため実デプロイを行わない (N/A)。P13 は採用経路の decision record C01 writer登録 (system-spec/spec-state.json decisions[] へのwrite authorityはC01 writerが所有し、本taskはwriterを実行してapplied receiptとexact lookupを得る) と、H7 成立結果に基づく Stage 1 開始条件の判定を実施する release-deploy タスクとして適用される"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p13.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-j71.13","linked_at":"2026-07-18T16:05:28Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リリース/デプロイ — 採用経路の decision record C01 writer登録 (C01 writer 経由) と Stage 1 開始条件判定

> task projection (P13 / parent: feat-stage0-distribution-gate)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b`
- task spec: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b`
- task spec SHA-256: `sha256:218c353ff330352827f2488cc5f1b853caf9667d526ddd177aee2d5bb75cab90`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/dev-graph-registration-receipt.json`

## 依存

- `SYS-STAGE0-DISTRIBUTION-GATE-P12`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-stage0-distribution-gate` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
