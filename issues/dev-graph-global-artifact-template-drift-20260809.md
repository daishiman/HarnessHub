---
graph_node_id: "issue-dev-graph-global-artifact-template-drift-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","frontmatter","template-drift","follow-up"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "HEAD 由来の dev-graph artifact 7 件を現 template 契約へ移行する"
owners: ["daishiman"]
created_at: "2026-08-09T04:10:00Z"
updated_at: "2026-08-09T04:02:01.436145Z"
status: "draft"
depends_on: []
related_nodes: ["spec-harness-hub-verification-tiering-20260809","task-verification-tiering-final-review-handoff-20260809"]
resource_scope: ["specs/harness-hub-build-identity-deploy-freshness-addendum.md","specs/harness-hub-plugin-hook-governance-addendum.md","specs/harness-hub-worktree-mtime-diagnostic-addendum.md","specs/post-signin-landing-observability.md","specs/post-signin-workspace-scope.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-hooks-parity-final-review-handoff.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-registration-stale-digest-handoff.md"]
purpose: "現 graph template が要求する frontmatter と見出しを、HEAD から既に登録済みの 7 artifact へ意味を変えずに補う。"
goal: "validate-graph-schema.py --repo-root . --graph .dev-graph/state/graph.json が artifact parity を含めて exit 0 になる。"
scope_in: ["frontmatter 再登録","必須見出しの内容補完","C02 writer 経由の graph parity"]
scope_out: ["各仕様の意味変更","今回の verification tier 実装","製品 runtime の変更"]
acceptance: ["HEAD でも再現する frontmatter_missing/heading_missing が 0","既存 body の意味を保つ","各 artifact を正規 C02 writer で再登録"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/dev-graph-global-artifact-template-drift-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T04:10:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "final review の global graph gate で今回追加 node 以外の HEAD 由来 7 artifact に限定して再現した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/dev-graph-global-artifact-template-drift-20260809.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-n7gg","linked_at":"2026-08-09T04:02:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-09T04:10:00Z","missing_sections":[],"status":"complete"}
---

## 背景

最終レビューの global graph gate は、今回追加した 12 node ではなく HEAD 由来の specification 5 件と task 2 件で失敗した。主因は template 更新後の frontmatter／必須見出しへ既存 artifact が未移行なことだった。

## やること

1. HEAD でも同じ違反が出ることを before 証拠として保存する。
2. 各 artifact の正本を読み、placeholder ではない本文で不足見出しを補う。
3. C02 writer で再登録し、graph/frontmatter parity と schema を再検証する。

## 完了条件

対象 7 件の `frontmatter_missing`、`frontmatter_parity_error`、`heading_missing` が 0 で、global graph gate が exit 0 になる。
