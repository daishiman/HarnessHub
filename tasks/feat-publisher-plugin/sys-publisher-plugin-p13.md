---
graph_node_id: "SYS-PUBLISHER-PLUGIN-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-publisher-plugin"
domain: "operations"
tags: ["feat-publisher-plugin","macro-feature","operations","release-deploy"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リリース/デプロイ — Claude Code/Codex marketplaceへのPublisher plugin配布登録依頼とStage1完了条件判定"
owners: ["daishiman"]
created_at: "2026-07-19T14:18:12Z"
updated_at: "2026-07-19T14:18:12Z"
status: "active"
depends_on: ["SYS-PUBLISHER-PLUGIN-P12"]
related_nodes: ["feat-publisher-plugin","arch-harness-hub-backend","arch-harness-hub-security"]
resource_scope: ["apps/publisher/","docs/features/feat-publisher-plugin/release-record.md","packages/schemas/publisher-plugin/","plugins/harness-hub-publisher/"]
purpose: "feat-publisher-plugin の P13 を実行する: リリース/デプロイ — Claude Code/Codex marketplaceへのPublisher plugin配布登録依頼とStage1完了条件判定"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: ["apps/publisher/","docs/features/feat-publisher-plugin/release-record.md","packages/schemas/publisher-plugin/","plugins/harness-hub-publisher/"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["release-record.md に acceptance 3 件の最終充足確認結果・marketplace.json 登録依頼内容・feat-publish-pipeline 依存の利用可能性確認の 3 点が記載されていること","現行feature context sha256:d75423be3a7865ec787158d70131636955ade571d9eeb1e338cdf2f0de257a41のscope_in/acceptance全件をP13責務として追跡し、未割当0件である","Normative closure: Claude Code/Codex plugin面は plugins/harness-hub-publisher/ に slash command、skill、scripts、manifestを実装する。apps/publisherは共有CLI/library実体としてplugin scriptから呼び出し、二つの独立実装を作らない。P13のmarketplace登録はP05で構築・P06でmacOS/Windows検証済みのplugin artifactだけを参照する。OS credential adapterはKeychain/Credential Managerを実装する。 Evidence: plugin manifest/slash command/skill/scriptの実体、apps/publisherへの単一接続、Keychain/Credential Manager、macOS/Windows E2E、初回15分、marketplace sourceのcontent hashを必須とする。"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-security"]
parent_feature: "feat-publisher-plugin"
feature_package_id: "feature-package/feat-publisher-plugin"
phase_ref: "P13"
file_path: "tasks/feat-publisher-plugin/sys-publisher-plugin-p13.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:18:12Z","origin_kind":"system-dev-planner","source_digest":"b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df","source_path":".dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "marketplace.json への Publisher plugin 登録依頼内容の確定と acceptance 最終充足の close-out 判断を行う P13 リリースタスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-publisher-plugin/sys-publisher-plugin-p13.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-zdh.13","linked_at":"2026-07-19T14:18:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リリース/デプロイ — Claude Code/Codex marketplaceへのPublisher plugin配布登録依頼とStage1完了条件判定

> task projection (P13 / parent: feat-publisher-plugin)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df`
- task spec: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df`
- task spec SHA-256: `sha256:6f4244a0a7d582d71911fff89fd6ff17b3935955ecca6488503072bd877b42a3`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/dev-graph-registration-receipt.json`

## 依存

- `SYS-PUBLISHER-PLUGIN-P12`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publisher-plugin` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。
