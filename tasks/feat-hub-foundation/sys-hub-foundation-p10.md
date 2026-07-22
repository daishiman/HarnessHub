---
graph_node_id: "SYS-HUB-FOUNDATION-P10"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-hub-foundation"
domain: "quality"
tags: ["feat-hub-foundation","stage-1","infrastructure","p10"]
priority: null
start_date: null
target_date: null
iteration: null
title: "Hub 基盤 最終独立レビュー"
owners: ["daishiman"]
created_at: "2026-07-19T14:15:47Z"
updated_at: "2026-07-19T14:15:47Z"
status: "active"
depends_on: ["SYS-HUB-FOUNDATION-P09"]
related_nodes: ["feat-hub-foundation","arch-harness-hub-infrastructure","arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-hub-foundation/final-review-notes.md"]
purpose: "feat-hub-foundation の P10 を実行する: Hub 基盤 最終独立レビュー"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["docs/features/feat-hub-foundation/final-review-notes.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["docs/features/feat-hub-foundation/final-review-notes.md に quality_constraints 9 件の充足状況が記録されている","現行feature context sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062dのscope_in/acceptance全件をP10責務として追跡し、未割当0件である","4 acceptance と shared-layers全登録行のowner/consumer evidenceを最終レビューする。","Normative closure: acceptanceは4件、quality_constraintsは9件。P05は雛形だけでなく、packages/ui・packages/schemas・packages/inspection・packages/estimation、auth adapter/認可middleware、audit/AiJob/Notification/PII共通adapterの公開contract実体、CI/運用共通境界を単一ownerとして実装する。domain-specific logicはconsumer featureに残す。P04/P06/P07/P09/P10/P11は複数consumer contract testと重複実装detector=0を第4 acceptanceとして実判定する。 Evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-frontend"]
parent_feature: "feat-hub-foundation"
feature_package_id: "feature-package/feat-hub-foundation"
phase_ref: "P10"
file_path: "tasks/feat-hub-foundation/sys-hub-foundation-p10.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:15:47Z","origin_kind":"system-dev-planner","source_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","source_path":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-10-final-review.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.87
classification_reason: "P01〜P09 の成果物一式を goal-spec と付随制約に対して独立して再点検する P10 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-hub-foundation/sys-hub-foundation-p10.md","confidence":0.87}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-37h.10","linked_at":"2026-07-18T01:45:46Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Hub 基盤 最終独立レビュー

> task projection (P10 / parent: feat-hub-foundation)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- task spec: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-10-final-review.md`
- package digest: `sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- task spec SHA-256: `sha256:0a6e788f8e9553996de7da2518ab4419035f948861c5ee167bbcd712b36921c0`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/dev-graph-registration-receipt.json`

## 依存

- `SYS-HUB-FOUNDATION-P09`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hub-foundation` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
