---
graph_node_id: "feat-domain-model-db"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "data"
tags: ["macro-feature","stage-1","data"]
priority: "high"
start_date: null
target_date: null
iteration: "Stage 1"
title: "ドメインモデル & control-plane DB (Turso + Drizzle + R2 registry)"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-07-19T14:12:28Z"
status: "active"
depends_on: ["feat-hub-foundation"]
related_nodes: []
resource_scope: ["features/feat-domain-model-db.md"]
purpose: "Tenant→Workspace→Project→TargetChannel→Release(immutable) のドメインモデルを Drizzle スキーマとして確立し、D1 退避経路 (D2 ヘッジ) を保つ接続層を構築する"
goal: "全エンティティの CRUD が接続層越しに動作し、R2 immutable PackageRegistry と日次 export が稼働する状態"
scope_in: ["Drizzle スキーマ (SQLite 方言互換)","接続層の隔離 (libSQL/D1 両対応)","R2 content-addressed registry","日次 export + restore drill 手順","マイグレーション運用"]
scope_out: ["検査 pipeline のビジネスロジック","UI"]
acceptance: ["スキーマが SQLite 方言互換で D1 接続テストが通る","Release が immutable として強制される","バックアップ export と復元手順が検証済み"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-backend","arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-domain-model-db.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"a4c26b6d4e7e8c3556d4a78089c12c6bb8dee445c20c623b151079d5747fd22d","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-domain-model-db.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-u6q","linked_at":"2026-07-18T01:43:36Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# ドメインモデル & control-plane DB (Turso + Drizzle + R2 registry)

> Stage 1 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

Tenant→Workspace→Project→TargetChannel→Release(immutable) のドメインモデルを Drizzle スキーマとして確立し、D1 退避経路 (D2 ヘッジ) を保つ接続層を構築する

## 到達状態

全エンティティの CRUD が接続層越しに動作し、R2 immutable PackageRegistry と日次 export が稼働する状態

## スコープ

**対象 (in):**

- Drizzle スキーマ (SQLite 方言互換)
- 接続層の隔離 (libSQL/D1 両対応)
- R2 content-addressed registry
- 日次 export + restore drill 手順
- マイグレーション運用

**対象外 (out):**

- 検査 pipeline のビジネスロジック
- UI

## 受入

- スキーマが SQLite 方言互換で D1 接続テストが通る
- Release が immutable として強制される
- バックアップ export と復元手順が検証済み

## アーキテクチャ参照

- [arch-harness-hub-data](../architecture/harness-hub-data.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-infrastructure](../architecture/harness-hub-infrastructure.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## 上流未解決 (P02 設計時に解消)

- User 基底テーブルの owner feature が未明記 (qa-024 は User 拡張列 department/salary のみ確定、既存不変エンティティ一覧にも User が無い)。P02 で本 feature が User 基底スキーマの owner かを確定する。feat-user-org-admin は安全側で write_scope を追加分 (packages/db/schema/user-org-admin/) に限定済み (出典: feat-user-org-admin plan 設計判断 2026-07-17)
