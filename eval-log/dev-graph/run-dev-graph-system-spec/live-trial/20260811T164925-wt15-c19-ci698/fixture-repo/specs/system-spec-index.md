---
graph_node_id: "spec-system-spec-index"
artifact_kind: "specification"
artifact_subtypes: ["api","backend","data","security"]
project_id: "system-spec-import"
domain: "system-spec"
tags: ["system-spec","source-lineage","imported"]
priority: null
start_date: null
target_date: null
iteration: null
title: "system-spec compiled specification"
owners: ["system-spec-harness"]
created_at: "2026-08-11T07:51:07Z"
updated_at: "2026-08-11T07:51:07Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/index.md","system-spec/completeness-report.json"]
purpose: "確定済み system-spec の index を参照可能にする。"
goal: "仕様と architecture context を source lineage 付きで結ぶ。"
scope_in: ["confirmed system-spec index artifact"]
scope_out: ["confirmed artifacts are not rewritten by this adapter"]
acceptance: ["source lineage と evaluator evidence を保持する","architecture node を参照する"]
architecture_refs: ["arch-system-spec-overview"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/system-spec-index.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"6d26ebde136373d5956a3ddd866d3ff41d7ff51465d8d8b6f4db815fdc53c4a0","evaluator":"system-spec-harness/assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-11T07:51:07Z","origin_kind":"system-spec-harness","source_digest":"042c43f66df32052cb9c17cda86b16f1600601f27e8317a44283654ca77133c0","source_path":"system-spec/index.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "system-spec-harness が compile した specification index の import。"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/system-spec-index.md","confidence":1.0}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-11T07:51:07Z","evidence_refs":["system-spec/completeness-report.json"],"policy":"manual","reconciled_at":"2026-08-11T07:51:07Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-11T07:51:07Z","missing_sections":[],"status":"complete"}
---

# システム構築仕様書 index

## 要件定義書 (上位概念・憲法)
[要件定義書](./00-requirements-definition.md) は confirmed である。

## 章一覧と集約状態
| カテゴリ | 集約状態 |
|---|---|
| requirements | 確定 |

## 集約状態サマリ
未収集 0、確定 1。

## 全体ドキュメント出典 (未割当参照)
未割当参照なし。
