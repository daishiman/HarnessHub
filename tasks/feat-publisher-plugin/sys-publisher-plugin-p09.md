---
graph_node_id: "SYS-PUBLISHER-PLUGIN-P09"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-publisher-plugin"
domain: "security"
tags: ["feat-publisher-plugin","macro-feature","security","quality-assurance"]
priority: null
start_date: null
target_date: null
iteration: null
title: "品質・セキュリティ・運用保証 — Device Flow数値契約遵守・OS資格情報域保存・scope最小権限・secret非保存の確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:18:12Z"
updated_at: "2026-07-19T14:18:12Z"
status: "active"
depends_on: ["SYS-PUBLISHER-PLUGIN-P08"]
related_nodes: ["feat-publisher-plugin","arch-harness-hub-backend","arch-harness-hub-security"]
resource_scope: ["apps/publisher/","apps/publisher/scripts/","docs/features/feat-publisher-plugin/quality-assurance-report.md","packages/schemas/publisher-plugin/","plugins/harness-hub-publisher/"]
purpose: "feat-publisher-plugin の P09 を実行する: 品質・セキュリティ・運用保証 — Device Flow数値契約遵守・OS資格情報域保存・scope最小権限・secret非保存の確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/publisher/","apps/publisher/scripts/","docs/features/feat-publisher-plugin/quality-assurance-report.md","packages/schemas/publisher-plugin/","plugins/harness-hub-publisher/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["quality-assurance-report.md に Device Flow 数値契約 (TTL/rotation/reuse検知)・OS資格情報域保存・scope最小権限・secret非平文保存・両OS pnpm script同一動作の全確認結果が記載されていること","現行feature context sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41のscope_in/acceptance全件をP09責務として追跡し、未割当0件である","Normative closure: Claude Code/Codex plugin面は plugins/harness-hub-publisher/ に slash command、skill、scripts、manifestを実装する。apps/publisherは共有CLI/library実体としてplugin scriptから呼び出し、二つの独立実装を作らない。P13のmarketplace登録はP05で構築・P06でmacOS/Windows検証済みのplugin artifactだけを参照する。OS credential adapterはKeychain/Credential Managerを実装する。 Evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-security"]
parent_feature: "feat-publisher-plugin"
feature_package_id: "feature-package/feat-publisher-plugin"
phase_ref: "P09"
file_path: "tasks/feat-publisher-plugin/sys-publisher-plugin-p09.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:18:12Z","origin_kind":"system-dev-planner","source_digest":"b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df","source_path":".dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/task-specs/phase-09-quality-assurance.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "quality_constraints のうちセキュリティ関連制約 (Device Flow/OS資格情報域保存/scope最小権限) の遵守を機械的に確認する P09 品質保証タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-publisher-plugin/sys-publisher-plugin-p09.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-zdh.9","linked_at":"2026-07-19T14:18:36Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# 品質・セキュリティ・運用保証 — Device Flow数値契約遵守・OS資格情報域保存・scope最小権限・secret非保存の確認

> task projection (P09 / parent: feat-publisher-plugin)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df`
- task spec: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/task-specs/phase-09-quality-assurance.md`
- package digest: `sha256:b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df`
- task spec SHA-256: `sha256:7a3f0b1cb6dd4957c8dce0f6c7ed6bd749e22d088effc95ada00d283b8921a4f`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/dev-graph-registration-receipt.json`

## 依存

- `SYS-PUBLISHER-PLUGIN-P08`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
