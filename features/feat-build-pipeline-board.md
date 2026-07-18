---
graph_node_id: feat-build-pipeline-board
artifact_kind: feature
artifact_subtypes: []
title: Studio: 構築パイプライン可視化 (7 工程ボード)
project_id: harness-hub
domain: frontend
status: draft
priority: medium
start_date: null
target_date: null
iteration: Studio 拡張
owners: ["daishiman"]
tags: ["macro-feature", "studio-extension", "frontend"]
file_path: features/feat-build-pipeline-board.md
template_id: feature
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: pending
confirmation_evidence: {"evaluator": "user-design-review (claude session 9ce54d7a)", "evidence_ref": "eval-log/run-dev-graph-node-confirm-feat-build-pipeline-board.json", "evaluated_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6"}
source_lineage: {"imported_at": "2026-07-17T10:44:09Z", "origin_kind": "generated", "source_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6", "source_path": "specs/harness-hub-system-specification.md", "source_plugin": "dev-graph", "source_version": null}
created_at: 2026-07-17T10:44:09Z
updated_at: 2026-07-17T13:14:35Z
depends_on: ["feat-hub-foundation", "feat-domain-model-db", "feat-auth-tenancy", "feat-publish-pipeline"]
related_nodes: []
resource_scope: ["features/feat-build-pipeline-board.md"]
purpose: ヒアリング→要件定義→設計→構築→テスト→レビュー→公開の 7 工程を S13 のボードで進行管理し (工程操作は admin)、公開工程を既存 PublishRequest 状態機械 (B4/I2/I3) へ接続する
goal: 各ハーネスの構築進捗が 7 工程ボードで可視化され、工程操作が admin 限定 + 監査記録付きで行え、公開工程が publish パイプラインと二重実装なしに連動する状態
scope_in: ["Build エンティティ (7 stage・リスク表示)", "S13 パイプラインボード (ステージボード共通部品の消費)", "工程操作の admin 権限 + 監査 event (SEC6)", "公開工程の PublishRequest 接続 (B4)"]
scope_out: ["publish 状態機械の再実装 (既存 I2/I3 を使う)", "工程の自動遷移 (手動運用から開始)"]
acceptance: ["7 工程の遷移が admin のみ操作でき監査 event に記録される", "公開工程が PublishRequest の状態と整合する (二重状態を持たない)", "ボードが axe 違反 0・CWV good で動作する"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-build-pipeline-board.md"}]
tracker_binding: beads
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "open", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "incomplete", "missing_sections": ["13-task package 未生成 (system-dev-planner 待ち)"], "checked_at": "2026-07-17T10:44:09Z"}
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
