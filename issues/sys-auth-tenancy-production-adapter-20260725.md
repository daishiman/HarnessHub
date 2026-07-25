---
graph_node_id: "issue-auth-tenancy-production-adapter-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["follow-up","auth-tenancy","authjs","database","production-blocker"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "feat-auth-tenancy の Auth.js・本番 AuthPorts adapter・DB 永続化契約を実結線する"
owners: ["daishiman"]
created_at: "2026-07-25T01:05:00Z"
updated_at: "2026-07-25T01:05:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-auth-tenancy","feat-domain-model-db","feat-hub-foundation"]
resource_scope: ["apps/hub/package.json","pnpm-lock.yaml","apps/hub/src/lib/auth/","apps/hub/src/lib/authz/runtime.ts","apps/hub/src/app/api/auth/","packages/db/schema/","packages/db/repository/"]
purpose: "現行実装は OIDC 検証・session claims・認可・Device Flow の pure core と in-memory E2E を持つ一方、next-auth が未導入で /api/auth は 501、authRuntime() は常に例外を投げる。本番 DB は main に存在するが、AuthPorts が要求する device_authorizations の scope/deviceLabel/attempts/last poll/workspace と publisher_tokens の workspace、利用者 workspace 所属が現行 schema/repository に無い。この状態では本番認証や Device API は稼働しないため、依存追加と schema owner をまたぐ契約調整を独立 follow-up として追跡する"
goal: "テナント別 OIDC と Device Flow が in-memory テストだけでなく本番 repository と Auth.js を通って動く"
scope_in: ["Auth.js 依存と route handler の実結線","Auth.js session と独自 claims/revocation の bridge","AuthPorts の packages/db adapter 実装","Device Flow に必要な永続化契約の schema owner 合意と migration","実 DB adapter を使う統合テスト"]
scope_out: ["dev 専用 provider や password login の追加","本番資格情報の平文保存","認証 gate の CI 結線 (HarnessHub-1f28)"]
acceptance: ["Auth.js または承認済み後継を adapter 境界内へ導入し、/api/auth が 501 ではなく tenant 別 OIDC を処理する","Auth.js が発行する session と lib/auth の SessionClaims が同じ検証経路で認識される","AuthPorts の本番 adapter が packages/db repository へ結線され、Device Flow の永続化契約差が解消される","実 DB adapter を使う 2 tenant OIDC・Device Flow・refresh rotation・revocation の統合テストが pass する"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-tenancy-production-adapter-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T01:05:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-auth-tenancy/release-record.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "feat-auth-tenancy のローカル core 実装と本番実行経路の間に残る単一の結線課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-tenancy-production-adapter-20260725.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-b7ng","linked_at":"2026-07-25T01:05:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T01:05:00Z","missing_sections":["Auth.js と custom session claims の bridge 詳細","DB schema owner と合意した Device Flow 列 migration"],"status":"incomplete"}
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
