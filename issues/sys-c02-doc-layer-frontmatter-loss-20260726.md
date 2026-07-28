---
graph_node_id: "issue-c02-doc-layer-frontmatter-loss-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","docs","frontmatter","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "C02 writer が graph 管理 docs の layer frontmatter を削除する"
owners: ["daishiman"]
created_at: "2026-07-26T06:26:22Z"
updated_at: "2026-07-26T06:26:22Z"
status: "draft"
depends_on: []
related_nodes: ["doc-dev-pipeline-final-review-20260726","feat-dev-pipeline-improvement"]
resource_scope: ["plugins/dev-graph/scripts/upsert-node.py","plugins/dev-graph/scripts/node_body.py","plugins/dev-graph/schemas/graph-node.schema.json","scripts/lint-artifact-placement.py"]
purpose: "C02 writer と docs 配置 lint の layer frontmatter 契約を一致させる"
goal: "graph 管理された docs 文書を再登録しても layer が失われず、配置 lint が決定論的に PASS する"
scope_in: ["document node の layer 保持または正規生成","graph schema と artifact frontmatter の責務整理","C02 再登録回帰テスト"]
scope_out: ["今回取得済み live-trial verdict の再取得","全 artifact kind への layer 必須化","製品 system-spec の変更"]
acceptance: ["graph 管理 docs の C02 再登録後も layer が残る","layer 許容値と正本が一意","artifact placement と C02 回帰テストが PASS","他 artifact kind の frontmatter を破壊しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c02-doc-layer-frontmatter-loss-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T06:26:22Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "最終レビュー文書の C02 再登録直後に artifact placement lint が layer 不在を実測した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c02-doc-layer-frontmatter-loss-20260726.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dqca","linked_at":"2026-07-26T06:26:22Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T06:26:22Z","missing_sections":[],"status":"complete"}
---

## 概要

`docs/` 配下の文書には `status` と `layer` frontmatter が必須である。一方、graph 管理された document node を `upsert-node.py` で再登録すると、`graph-node.schema.json` に `layer` が無いため、C02 writer が既存の `layer` を落とす。

2026-07-26 の最終レビュー文書を正規 writer で本文保持再登録した直後、`lint-artifact-placement.py` が `layer:` 不在で FAIL し、契約不整合を実測した。

## 目的

C02 writer と docs 配置契約を整合させ、graph 管理文書を何度再登録しても `layer` が保持または正規生成されるようにする。

## 受入条件

- graph 管理された `docs/**/*.md` を C02 writer で再登録しても `layer` が失われない。
- `layer` の許容値と正本が一意に定義される。
- `lint-artifact-placement.py` の long frontmatter 回帰テストと C02 再登録テストが両方 PASS する。
- 既存の architecture / feature / issue / task frontmatter と graph schema を破壊しない。

## 今回の暫定対応

最終レビュー文書には `layer: feature-design` を復元する。恒久対応は本課題で行い、本 PR の Dev Graph behavior closure を再変更して live-trial を再取得する連鎖は避ける。
