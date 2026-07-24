---
graph_node_id: "issue-shared-layers-gate-table-stale-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["feat-hub-foundation","shared-layers","documentation"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "docs/shared-layers.md §3 の CI ゲート表が 5 項目のまま (qa-038 の 8 種 + G9〜G11 へ未追随)"
owners: ["daishiman"]
created_at: "2026-07-24T09:00:00Z"
updated_at: "2026-07-24T09:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-hub-foundation"]
resource_scope: ["docs/shared-layers.md"]
purpose: "ADR (architecture-decision-record.md) §11.4 F-2 が起票を求めた follow-up。docs/shared-layers.md §3 の CI 品質ゲート表は 5 項目のままで、qa-038【2】の required status checks 8 種と G9〜G11 への再構成 (ADR 改訂 2 / R-03) に追随していない。2026-07-21 追記で正本ポインタは張られており二重正本にはなっていないが、登録簿としての網羅は欠けたまま。P03 Round 3 再レビュー (design-review-notes.md §12.2) でも残 follow-up として確認した"
goal: "shared-layers §3 の CI ゲート表が実装 (G1〜G11) と一致し、登録簿としての網羅が回復した状態"
scope_in: ["shared-layers §3 のゲート表を G1〜G11 構成へ更新","正本 (dev-workflow 章) との整合確認"]
scope_out: ["ゲート実装自体の変更","メタ層 (governance-check) ゲートの数え入れ"]
acceptance: ["docs/shared-layers.md §3 のゲート表が ci.yml の実ゲート構成 (G1〜G11) を網羅している","正本ポインタ (dev-workflow 章) の記述と矛盾しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-shared-layers-gate-table-stale-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T09:00:00Z","origin_kind":"manual","source_digest":"a64647e16b1e859a2d316a97ae844751606cffb7bc743dfe63b18ecfe2e92b6d","source_path":"docs/features/feat-hub-foundation/design-review-notes.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "ADR §11.4 F-2 の未消化 follow-up を起票 (P03 Round 3 再レビューで残存を確認)"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-shared-layers-gate-table-stale-20260724.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T09:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

<問題または要望を一文で記載>

## 背景と問題

<誰が、どの状況で、何に困っているか>

## 現在の挙動

<観測事実。再現不能の場合はその旨と理由>

## 期待する挙動

<解決後に観測できる状態>

## 再現手順またはユースケース

1. <step>

## 影響と優先度

- 影響範囲: <users/data/system>
- 深刻度: <critical|high|medium|low>
- 緊急度: <理由>

## スコープ

- In: <対象>
- Out: <非対象>

## 関連グラフ

- 原因/親ノード: <graph_node_id>
- 関連仕様: <graph_node_id>
- 関連アーキテクチャ: <graph_node_id>
- 解決タスク: <graph_node_id>

## 受入条件

- [ ] <観測可能な結果>

## 検証証跡

- コマンド/テスト: <how-to-verify>
- 証跡 path: <path-or-url>
