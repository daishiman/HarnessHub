---
graph_node_id: "SYS-PUBLISHER-PLUGIN-P05"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-publisher-plugin"
domain: "backend"
tags: ["feat-publisher-plugin","macro-feature","backend","implementation"]
priority: null
start_date: null
target_date: null
iteration: null
title: "実装 — apps/publisher (CLI + Claude Code/Codex plugin)・Device Flow認証クライアント・wrangler実行ラッパーの実装"
owners: ["daishiman"]
created_at: "2026-07-19T14:18:12Z"
updated_at: "2026-07-19T14:18:12Z"
status: "active"
depends_on: ["SYS-PUBLISHER-PLUGIN-P04"]
related_nodes: ["feat-publisher-plugin","arch-harness-hub-backend","arch-harness-hub-security"]
resource_scope: ["apps/publisher/","docs/features/feat-publisher-plugin/implementation-notes.md","packages/schemas/publisher-plugin/","plugins/harness-hub-publisher/"]
purpose: "feat-publisher-plugin の P05 を実行する: 実装 — apps/publisher (CLI + Claude Code/Codex plugin)・Device Flow認証クライアント・wrangler実行ラッパーの実装"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/publisher/","docs/features/feat-publisher-plugin/implementation-notes.md","packages/schemas/publisher-plugin/","plugins/harness-hub-publisher/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["apps/publisher/ に CLI core・auth・deploy・plugin 面が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っていること","現行feature context sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41のscope_in/acceptance全件をP05責務として追跡し、未割当0件である","Normative closure: Claude Code/Codex plugin面は plugins/harness-hub-publisher/ に slash command、skill、scripts、manifestを実装する。apps/publisherは共有CLI/library実体としてplugin scriptから呼び出し、二つの独立実装を作らない。P13のmarketplace登録はP05で構築・P06でmacOS/Windows検証済みのplugin artifactだけを参照する。OS credential adapterはKeychain/Credential Managerを実装する。 Evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-security"]
parent_feature: "feat-publisher-plugin"
feature_package_id: "feature-package/feat-publisher-plugin"
phase_ref: "P05"
file_path: "tasks/feat-publisher-plugin/sys-publisher-plugin-p05.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:18:12Z","origin_kind":"system-dev-planner","source_digest":"b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df","source_path":".dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/task-specs/phase-05-implementation.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P02/P04 で確定した設計とテストスタブに基づき apps/publisher の CLI core・auth・deploy・plugin 面を実装する P05 実装タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-publisher-plugin/sys-publisher-plugin-p05.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-zdh.5","linked_at":"2026-07-19T14:18:27Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 実装 — apps/publisher (CLI + Claude Code/Codex plugin)・Device Flow認証クライアント・wrangler実行ラッパーの実装

> task projection (P05 / parent: feat-publisher-plugin)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df`
- task spec: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/task-specs/phase-05-implementation.md`
- package digest: `sha256:b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df`
- task spec SHA-256: `sha256:24255e5f51e288cbc230eb0ece24a0a8fa4ab905bffa1f0ed358365d93592a7a`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/dev-graph-registration-receipt.json`

## 依存

- `SYS-PUBLISHER-PLUGIN-P04`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
