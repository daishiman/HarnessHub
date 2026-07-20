---
graph_node_id: "SYS-HUB-FOUNDATION-P06"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-hub-foundation"
domain: "quality"
tags: ["feat-hub-foundation","stage-1","infrastructure","p06"]
priority: null
start_date: null
target_date: null
iteration: null
title: "Hub 基盤 テスト実行"
owners: ["daishiman"]
created_at: "2026-07-19T14:15:47Z"
updated_at: "2026-07-19T14:15:47Z"
status: "active"
depends_on: ["SYS-HUB-FOUNDATION-P05"]
related_nodes: ["feat-hub-foundation","arch-harness-hub-infrastructure","arch-harness-hub-frontend"]
resource_scope: [".github/workflows/ci.yml","apps/hub/src/middleware/","apps/hub/src/shared/","apps/hub/tests/","packages/estimation/","packages/inspection/","packages/schemas/","packages/ui/"]
purpose: "feat-hub-foundation の P06 を実行する: Hub 基盤 テスト実行"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: [".github/workflows/ci.yml","apps/hub/src/middleware/","apps/hub/src/shared/","apps/hub/tests/","packages/estimation/","packages/inspection/","packages/schemas/","packages/ui/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["CI run が green で完走したログ、bundle サイズ計測結果が 3MiB 以内であるレポート、/health 応答ログが揃っている","現行feature context sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062dのscope_in/acceptance全件をP06責務として追跡し、未割当0件である","共通package単体・consumer contract・CI品質gateを実行し、二重実装がないことを検査する。","Normative closure: acceptanceは4件、quality_constraintsは9件。P05は雛形だけでなく、packages/ui・packages/schemas・packages/inspection・packages/estimation、auth adapter/認可middleware、audit/AiJob/Notification/PII共通adapterの公開contract実体、CI/運用共通境界を単一ownerとして実装する。domain-specific logicはconsumer featureに残す。P04/P06/P07/P09/P10/P11は複数consumer contract testと重複実装detector=0を第4 acceptanceとして実判定する。 Evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-frontend"]
parent_feature: "feat-hub-foundation"
feature_package_id: "feature-package/feat-hub-foundation"
phase_ref: "P06"
file_path: "tasks/feat-hub-foundation/sys-hub-foundation-p06.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:15:47Z","origin_kind":"system-dev-planner","source_digest":"8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502","source_path":".dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-06-test-run.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.88
classification_reason: "P04 test-design.md の受入契約に従って P05 実装物を実行検証する P06 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-hub-foundation/sys-hub-foundation-p06.md","confidence":0.88}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-37h.6","linked_at":"2026-07-18T01:45:41Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Hub 基盤 テスト実行

> task projection (P06 / parent: feat-hub-foundation)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- task spec: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-06-test-run.md`
- package digest: `sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- task spec SHA-256: `sha256:0881fd709590ff59075bd11427bd1be5361b9f8b7ba8bc25c1d613bc02584bb2`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/dev-graph-registration-receipt.json`

## 依存

- `SYS-HUB-FOUNDATION-P05`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
