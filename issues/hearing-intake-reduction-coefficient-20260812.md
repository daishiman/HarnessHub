---
graph_node_id: "issue-hearing-intake-reduction-coefficient-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["domain-logic","maintainability"]
priority: "medium"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "削減時間の見積り係数 0.35 が画面に直書きされている"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-11T15:50:36.312253Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/app/(dashboard)/sheets/new/hearing-intake-wizard.tsx"]
purpose: "業務上の意味を持つ数値を、画面の描画コードから業務ロジック側へ移す。"
goal: "削減時間の係数を 1 か所で定義し、その根拠と変更手順を残す。"
scope_in: ["係数の定義位置の移動","係数の根拠の記載","単体テストの追加"]
scope_out: ["係数の値そのものの見直し","見積りの計算式の変更"]
acceptance: ["係数が lib/domain 配下の 1 か所だけで定義される","係数を変えたときに期待どおり結果が変わることを単体テストで固定する","画面の表示は現状と変わらない"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hearing-intake-reduction-coefficient-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"21ff48209b7e625a8f51feea8788ee4aa0e21e13008748a878f551b0b4933e13","evaluator":"2026-08-12 の UI 統一作業で全画面を読んだ際に検出","evidence_ref":"issues/hearing-intake-reduction-coefficient-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "業務計算の値が描画コードに埋まっている保守性の課題であり、実装単位の課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hearing-intake-reduction-coefficient-20260812.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-hpag","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 削減時間の見積り係数 0.35 が画面に直書きされている

## 概要

`apps/hub/src/app/(dashboard)/sheets/new/hearing-intake-wizard.tsx:188` で、
削減時間を見積もる係数 `0.35` が画面の描画コードに直接書かれている。

## 背景と問題

`0.35` は「入力された作業時間のうちどれだけを削減できると見込むか」という
業務上の判断を表す数値で、画面の見た目とは無関係の値。描画コードに埋まっていると
以下が起きる。

- 変えたい人 (業務側) が、どこを直せばよいか分からない。
- 変えたときに何が変わるのかを、テストで確かめられない。
- 同じ考え方の見積りを別画面に足すとき、値が二重化する。

このリポジトリでは業務計算・判定を純関数として `lib/domain/` に分離する方針を
取っており、この値はその対象にあたる。

## 現在の挙動

係数は画面ファイル内の計算式に直接現れる。名前が付いていないため、コードを読んでも
その数値が何を意味するのかが分からない。

## 期待する挙動

`lib/domain/` に名前付きの定数として置き、根拠を 1 行のコメントで添える。画面は
その定数を読むだけにする。

## 再現手順またはユースケース

見積りの前提を「作業時間の 35%」から変えたい、という要望が来たときに、どこを直せば
よいかがコードからたどれない。

## 影響と優先度

いま表示される数字は正しいので実害はない。将来の変更のしやすさに効くため medium。

## スコープ

定義位置の移動と、根拠の記載と、単体テストの追加まで。値そのものの妥当性
(0.35 が適切か) はこの課題では判断しない。

## 関連グラフ

なし。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 の UI 統一作業で `hearing-intake-wizard.tsx:188` を実読。
