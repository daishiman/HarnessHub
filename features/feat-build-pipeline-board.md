---
graph_node_id: "feat-build-pipeline-board"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["macro-feature","studio-extension","frontend"]
priority: "high"
start_date: null
target_date: null
iteration: "Studio 拡張"
title: "Studio: 構築パイプライン可視化 (7 工程ボード)"
owners: ["daishiman"]
created_at: "2026-07-17T10:44:09Z"
updated_at: "2026-07-19T14:10:56Z"
status: "active"
depends_on: ["feat-hub-foundation","feat-domain-model-db","feat-auth-tenancy","feat-publish-pipeline","feat-hearing-intake"]
related_nodes: []
resource_scope: ["features/feat-build-pipeline-board.md"]
purpose: "ヒアリング→要件定義→設計→構築→テスト→レビュー→公開の 7 工程を S13 のボードで進行管理し (工程操作は admin)、公開工程を既存 PublishRequest 状態機械 (B4/I2/I3) へ接続する"
goal: "各ハーネスの構築進捗が 7 工程ボードで可視化され、工程操作が admin 限定 + 監査記録付きで行え、公開工程が publish パイプラインと二重実装なしに連動する状態"
scope_in: ["Build エンティティ (7 stage・リスク表示)","S13 パイプラインボード (ステージボード共通部品の消費)","工程操作の admin 権限 + 監査 event (SEC6)","公開工程の PublishRequest 接続 (B4)"]
scope_out: ["publish 状態機械の再実装 (既存 I2/I3 を使う)","工程の自動遷移 (手動運用から開始)"]
acceptance: ["7 工程の遷移が admin のみ操作でき監査 event に記録される","公開工程が PublishRequest の状態と整合する (二重状態を持たない)","ボードが axe 違反 0・CWV good で動作する"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-build-pipeline-board.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-build-pipeline-board/e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"a4c26b6d4e7e8c3556d4a78089c12c6bb8dee445c20c623b151079d5747fd22d","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-build-pipeline-board.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9am","linked_at":"2026-07-18T01:42:25Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Studio: 構築パイプライン可視化 (7 工程ボード)

> Studio 拡張 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。
> 由来: Harness Studio mockup 反映 (qa-021〜030・U7 改訂 appr-004/005・D5/D6)。正本分析: docs/mockups/harness-studio-v2-analysis.md

## 目的

ヒアリング→要件定義→設計→構築→テスト→レビュー→公開の 7 工程を S13 のボードで進行管理し (工程操作は admin)、公開工程を既存 PublishRequest 状態機械 (B4/I2/I3) へ接続する

## 到達状態

各ハーネスの構築進捗が 7 工程ボードで可視化され、工程操作が admin 限定 + 監査記録付きで行え、公開工程が publish パイプラインと二重実装なしに連動する状態

## スコープ

**対象 (in):**

- Build エンティティ (7 stage・リスク表示)
- S13 パイプラインボード (ステージボード共通部品の消費)
- 工程操作の admin 権限 + 監査 event (SEC6)
- 公開工程の PublishRequest 接続 (B4)

**対象外 (out):**

- publish 状態機械の再実装 (既存 I2/I3 を使う)
- 工程の自動遷移 (手動運用から開始)

## 受入

- 7 工程の遷移が admin のみ操作でき監査 event に記録される
- 公開工程が PublishRequest の状態と整合する (二重状態を持たない)
- ボードが axe 違反 0・CWV good で動作する

## アーキテクチャ参照

- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy
- feat-publish-pipeline

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
