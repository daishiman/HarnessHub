---
graph_node_id: "issue-doc-granularity-remediation-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["documentation","qa-070","remediation"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "qa-070 粒度規約: 300 行超過 6 文書の remediation (縮小のみ許す初期一覧)"
owners: ["daishiman"]
created_at: "2026-07-21T23:30:33Z"
updated_at: "2026-07-22T09:30:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-qa070-implementation-feature-20260722"]
resource_scope: ["docs/security-spec.md","docs/backend-spec.md","docs/features/feat-hub-foundation/design-review-notes.md","docs/features/feat-dev-pipeline-improvement/design.md","docs/features/feat-stage0-distribution-gate/design-review-notes.md","docs/features/feat-hub-foundation/final-review-notes.md"]
purpose: "qa-070 (1 文書 300 行上限・fail-closed) の全面適用に向け、既存超過 6 文書を責務単位で分割する"
goal: "300 行超過の正本 markdown が 0 件になり、fail-closed lint を全面適用できる状態"
scope_in: ["docs/security-spec.md (910 行) の責務分割","docs/backend-spec.md (434 行) の責務分割","docs/features/*/design-review-notes.md ほか 4 件の分割または縮約","分割後の index/一覧表からの参照維持"]
scope_out: ["既存文書の一括機械分割","300 行 lint 本体の実装 (issue-qa070-implementation-feature-20260722 側)"]
acceptance: ["対象 root の md で 300 行超が 0 件","分割後も命名規則 (kebab-case・種別接頭辞) と参照導線が維持されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-doc-granularity-remediation-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T09:30:00Z","origin_kind":"generated","source_digest":"97f579c1195a08319415e4cb7c23a73a2881cb26fe6223ee535d641f5e9d44c2","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.95
classification_reason: "qa-070 (2026-07-22 確定) の粒度規約 300 行上限に対する既存超過 6 件の remediation issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-doc-granularity-remediation-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-3d8","linked_at":"2026-07-22T00:49:29Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T23:30:33Z","missing_sections":[],"status":"complete"}
---

# 概要

qa-070 (2026-07-22 確定・appr-008) により markdown 正本文書は 1 文書 300 行上限・fail-closed CI lint となった。実測 (2026-07-22) で対象 root の md 291 件中 300 行超は 6 件。

## 対象 (実測行数)

- docs/security-spec.md (910)
- docs/backend-spec.md (434)
- docs/features/feat-hub-foundation/design-review-notes.md (366)
- docs/features/feat-dev-pipeline-improvement/design.md (365)
- docs/features/feat-stage0-distribution-gate/design-review-notes.md (320)
- docs/features/feat-hub-foundation/final-review-notes.md (303)

## 対応方針

縮小のみ許す初期 remediation 一覧として管理し、責務単位で分割して index/一覧表から参照で辿れる形を維持する (情報は複製せず参照)。分割完了までは新規違反のみ遮断し、一覧 0 件で lint を全面適用する (qa-067 の冪等 migration・beads 起票パターンを踏襲)。
