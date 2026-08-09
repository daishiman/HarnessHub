---
graph_node_id: "iss-session-timeout-not-enforced"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "c02final"
domain: "product-platform"
tags: ["bug","security","session-management"]
priority: null
start_date: null
target_date: null
iteration: null
title: "ログインセッションのタイムアウトが強制されない"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T09:37:12Z"
updated_at: "2026-08-08T09:37:12Z"
status: "draft"
depends_on: []
related_nodes: ["arch-order-processing-backend","spec-rest-api-v2-migration"]
resource_scope: ["issues/iss-session-timeout-not-enforced.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/iss-session-timeout-not-enforced.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T09:37:12Z","origin_kind":"manual","source_digest":"73cf6d5c9cdfb6d7552719d91f259345c301d85914b658b35287c0eeea4cfc39","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "既存挙動の不具合報告 (現在の挙動・期待する挙動・再現手順) の構造を持つため issue へ写像した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/iss-session-timeout-not-enforced.md","confidence":0.97},{"artifact_kind":"task","candidate_path":"tasks/iss-session-timeout-not-enforced.md","confidence":0.21}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:37:12Z","missing_sections":[],"status":"complete"}
---

## 概要

設定したセッションタイムアウトを過ぎても、ログイン済みセッションが無効化されない。

## 背景と問題

セッション期限の判定が発行時刻ではなく最終アクセス時刻の更新漏れに依存しており、
期限切れ判定が一度も真にならない経路が残っている。

## 現在の挙動

タイムアウト経過後も保護リソースへアクセスでき、再認証を求められない。

## 期待する挙動

設定したタイムアウトを過ぎたセッションは失効し、ログイン画面へ誘導される。

## 再現手順またはユースケース

1. セッションタイムアウトを 30 分に設定する
2. ログインしてそのまま 35 分待機する
3. 保護リソースへアクセスする
4. セッションが有効なままになっている

## 影響と優先度

失効しないセッションが残るため、端末を放置した場合に第三者が操作できる。
認証境界に直結するため優先度は高い。

## スコープ

- In: セッション期限判定の基準時刻、失効時のリダイレクト、既存セッションの一括失効
- Out: パスワードポリシー、多要素認証の追加、外部 IdP との連携

## 関連グラフ

- 認証境界の設計は `arch-order-processing-backend` の Security subtype に従う
- 認証ヘッダの移行契約は `spec-rest-api-v2-migration` の破壊的変更と整合させる

## 受入条件

- [ ] 設定したタイムアウトを過ぎたセッションで保護リソースへアクセスすると再認証を要求される
- [ ] 期限判定が発行時刻と最終アクセス時刻の双方から決定論的に計算される
- [ ] 失効済みセッションの資格情報を再利用しても保護リソースへ到達できない

## 検証証跡

- タイムアウト境界 (直前・直後) の統合テストを追加し、失効判定の真偽を両側で観測する
- 手動再現手順を 30 分設定で再実行し、再認証への誘導をログとレスポンスコードで記録する
