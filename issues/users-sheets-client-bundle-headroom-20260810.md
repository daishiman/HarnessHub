---
graph_node_id: "issue-users-sheets-client-bundle-headroom-20260810"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["performance","bundle","hub"]
priority: "medium"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "users と sheets の client bundle 警告帯を調査する"
owners: ["daishiman"]
created_at: "2026-08-10T15:55:36Z"
updated_at: "2026-08-12T05:41:21Z"
status: "done"
depends_on: []
related_nodes: ["issue-hub-shared-client-bundle-baseline-20260812"]
resource_scope: ["apps/hub/artifacts/client-bundle-report.json"]
purpose: "route 局所の bundle 警告を計測し、正しい改善対象を特定する。"
goal: "警告帯の原因を route 固有部分と共通 client bundle 土台へ分離する。"
scope_in: ["users と sheets の route 別 bundle 計測","共通 chunk の内訳計測"]
scope_out: ["原因確認前の予算引き上げ"]
acceptance: ["route 別と共通 chunk の実測から後続の改善対象が確定する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/users-sheets-client-bundle-headroom-20260810.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"0bf9fca053cc40f7987e5e5519031d7200f0776b5c1d23dbfbb0425d95a4c1bf","evaluator":"2026-08-12 の production build による route / shared chunk 実測","evidence_ref":"issues/hub-shared-client-bundle-baseline-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T06:51:20Z","origin_kind":"manual","source_digest":null,"source_path":"issues/hub-shared-client-bundle-baseline-20260812.md","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "HarnessHub-x30r の調査結果を、後続 a7tk の機械可読な前提として復元する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/users-sheets-client-bundle-headroom-20260810.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-x30r","linked_at":"2026-08-12T06:51:20Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-12T05:41:21Z","evidence_refs":["issues/hub-shared-client-bundle-baseline-20260812.md"],"policy":"manual","reconciled_at":"2026-08-12T06:51:20Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-08-12T06:51:20Z","missing_sections":[],"status":"complete"}
---

# users と sheets の client bundle 警告帯を調査する

## 結論

`/users/[id]` と `/sheets/new` の局所最適化では解消できないことを production build で確認した。全 page route 共通の client bundle 土台 104796 bytes が原因であり、後続 `issue-hub-shared-client-bundle-baseline-20260812` が共通土台の分解を引き受ける。

## 証跡

詳細な route 別サイズと共通 chunk 内訳は `issues/hub-shared-client-bundle-baseline-20260812.md` に集約した。
