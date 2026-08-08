---
graph_node_id: "doc-c02-mixed-batch-runbook"
artifact_kind: "document"
artifact_subtypes: []
layer: "operations"
project_id: "c02fix"
domain: "dev-workflow"
tags: ["live-trial","c02-out1","document"]
priority: null
start_date: null
target_date: null
iteration: null
title: "混在バッチ登録の実走 runbook"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T03:10:03Z"
updated_at: "2026-08-08T03:10:03Z"
status: "draft"
depends_on: []
related_nodes: ["spec-c02-mixed-batch-contract","arch-c02-writer-boundary","task-c02-verify-mixed-routing"]
resource_scope: ["docs/doc-c02-mixed-batch-runbook.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/doc-c02-mixed-batch-runbook.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T03:10:03Z","origin_kind":"manual","source_digest":"db95e0994a17f656d563447b0d7398f43cff896ba1081cfec061711e06001ad8","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "手順と記録を伝える運用 runbook であるため document へ写像した"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/doc-c02-mixed-batch-runbook.md","confidence":0.99},{"artifact_kind":"specification","candidate_path":"specs/doc-c02-mixed-batch-runbook.md","confidence":0.17}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T03:10:03Z","missing_sections":[],"status":"complete"}
---

# 目的

混在バッチ登録の実走手順を再現可能な形で残し、routing と連続更新の整合をいつでも同じ順序で確認できるようにする。

## 対象読者

dev-graph の C02 単一 writer を運用する開発者、および live-trial を実行する評価者。dev-graph の content root 構成と graph store の役割を理解していることを前提とする。

## 要約

混在バッチは dry-run で routing を確認してから apply し、最後に 1 件を連続更新して frontmatter kind と保存 path の一致を再確認する。各手順の receipt と graph_revision を残す。

## 本文

混在バッチの実走は次の手順と記録で構成する。

### 手順

1. 混在バッチを dry-run で検証する
2. 同じ入力で apply する
3. 1 件を連続更新し frontmatter kind と保存 path の一致を再確認する

### 記録

各手順の receipt と graph_revision を残す。

### 補足

dry-run は write_count=0 を返し、apply は artifact と graph store の 2 ファイル更新分を write_count に数える。連続更新で本文を変更しない場合、body_source は preserved となり既存本文は保持される。

## 決定事項

- dry-run と apply は同一入力で実行し、routing 判定を二度確認する
- 連続更新は同じ skill 入口から行い、script 直叩きや手書き編集で代替しない

## 運用・更新方法

- 更新契機: C02 の routing 契約または template contract が改訂されたとき
- 更新責任者: dev-graph-harness
- 鮮度確認: live-trial の実走ごとに手順と実測の乖離を確認する

## 関連資料

- spec-c02-mixed-batch-contract
- arch-c02-writer-boundary
- task-c02-verify-mixed-routing

## 変更履歴

| Date | Change | Author |
|---|---|---|
| 2026-08-08 | 初版作成 (混在バッチ live-trial の実走手順) | dev-graph-harness |
