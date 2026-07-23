---
graph_node_id: "issue-qa070-implementation-feature-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["dev-pipeline","qa-070","feature-candidate"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "qa-070 実装の feature 化 (300 行 fail-closed lint / 仕組み-ナレッジ境界検査 / 移植導線 opt-in 検査)"
owners: ["daishiman"]
created_at: "2026-07-21T23:30:33Z"
updated_at: "2026-07-22T09:30:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement"]
resource_scope: ["system-spec/dev-workflow.md"]
purpose: "qa-070 で明文化した規約 2 件の実装を、13 フェーズを省略しない正規 feature として起票する"
goal: "/dev-graph decompose → plan の正規ルートで feature 化され、exact-13 task で実装が完了する"
scope_in: ["300 行上限 fail-closed CI lint (remediation allowlist ratchet 付き)","仕組み側ファイルの repo 固有ナレッジ hard-coded 参照検査","extract-blueprint / install-bundle の『仕組みのみ既定・ナレッジ opt-in』検査"]
scope_out: ["規約自体の変更 (qa-070 で確定済み)","既存超過 6 文書の分割 (issue-doc-granularity-remediation-20260722 側)"]
acceptance: ["decompose により feature 文書と context.json が生成される","plan により exact-13 task が昇格登録される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-qa070-implementation-feature-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T09:30:00Z","origin_kind":"generated","source_digest":"97f579c1195a08319415e4cb7c23a73a2881cb26fe6223ee535d641f5e9d44c2","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.95
classification_reason: "qa-070 の実装 (lint・境界検査・移植導線) を 13 フェーズ正規ルートで feature 化するための起票 issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-qa070-implementation-feature-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-iwu","linked_at":"2026-07-22T00:49:29Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T23:30:33Z","missing_sections":[],"status":"complete"}
---

# 概要

qa-070 (2026-07-22 確定・appr-008) は規約の明文化までを範囲とし、実装は別 feature として 13 フェーズを省略せず起票すると定めた。本 issue はその feature 化の追跡。

## 実装対象

1. 300 行上限 fail-closed CI lint (縮小のみ許す remediation allowlist ratchet 付き)
2. 仕組み側ファイル (plugins/・.claude/skills/ 等) への repo 固有ナレッジ (固有 node id・固有 path・固有 qa 番号) hard-coded 参照の検査
3. extract-blueprint / install-bundle の『仕組みのみ既定 (オン)・ナレッジ同梱は明示 opt-in (オフ既定)』検査

## 対応方針

/dev-graph decompose → plan の正規ルートで feature 化し、exact-13 task で実装する。簡単そうに見えても 13 フェーズを省略しない (qa-070・作者記事の方針)。
