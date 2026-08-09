---
graph_node_id: "doc-dev-environment-setup"
artifact_kind: "document"
artifact_subtypes: []
layer: "onboarding"
project_id: "c02final"
domain: "product-platform"
tags: ["documentation","onboarding","developer-guide"]
priority: null
start_date: null
target_date: null
iteration: null
title: "開発環境セットアップの手引き"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T09:37:12Z"
updated_at: "2026-08-08T09:37:12Z"
status: "draft"
depends_on: []
related_nodes: ["arch-order-processing-backend"]
resource_scope: ["docs/doc-dev-environment-setup.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/doc-dev-environment-setup.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T09:37:12Z","origin_kind":"manual","source_digest":"73cf6d5c9cdfb6d7552719d91f259345c301d85914b658b35287c0eeea4cfc39","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "対象読者へ手順と運用を伝える解説文書のため document へ写像した"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/doc-dev-environment-setup.md","confidence":0.97},{"artifact_kind":"specification","candidate_path":"specs/doc-dev-environment-setup.md","confidence":0.16}]
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

## 目的

新しく参加した開発者が、自分の端末で開発環境を立ち上げられるようにする。

## 対象読者

本リポジトリで初めて作業する開発者。

## 要約

依存関係をコンテナで起動し、環境変数を設定してから開発サーバを起動する。

## 本文

### 前提

- コンテナランタイム
- 関係データベースのクライアントツール
- git

### 手順

1. リポジトリを clone する
2. 環境変数のひな形を複製して値を設定する
3. 依存サービスをコンテナで起動する
4. 依存パッケージを導入し、マイグレーションを適用する
5. 開発サーバを起動する

### よくある問題

- ポート衝突: 既存プロセスの残存を確認する
- データベース接続失敗: 依存コンテナの起動状態を確認する

## 決定事項

- 依存サービスは端末へ直接導入せずコンテナで起動する
- 環境変数はひな形からの複製を正とし、実値をリポジトリへ入れない
- マイグレーションは開発サーバ起動より前に適用する

## 運用・更新方法

- 依存サービスの構成または必要な環境変数が変わった時点で本書を更新する
- 更新者は手順を新規端末で一度なぞり、通ることを確認してから反映する
- 手順の変更は変更履歴へ日付と要点を追記する

## 関連資料

- 注文処理バックエンドのアーキテクチャとセキュリティ層

## 変更履歴

- 2026-08-08: 初版。前提・手順・よくある問題を整理し、運用方法と決定事項を明文化した
