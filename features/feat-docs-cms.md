---
graph_node_id: feat-docs-cms
artifact_kind: feature
artifact_subtypes: []
title: Studio: ドキュメント CMS (common/tenant スコープ・AI 下書き)
project_id: harness-hub
domain: frontend
status: draft
priority: medium
start_date: null
target_date: null
iteration: Studio 拡張
owners: ["daishiman"]
tags: ["macro-feature", "studio-extension", "frontend"]
file_path: features/feat-docs-cms.md
template_id: feature
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: pending
confirmation_evidence: {"evaluator": "user-design-review (claude session 9ce54d7a)", "evidence_ref": "eval-log/run-dev-graph-node-confirm-feat-docs-cms.json", "evaluated_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6"}
source_lineage: {"imported_at": "2026-07-17T10:44:09Z", "origin_kind": "generated", "source_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6", "source_path": "specs/harness-hub-system-specification.md", "source_plugin": "dev-graph", "source_version": null}
created_at: 2026-07-17T10:44:09Z
updated_at: 2026-07-17T12:35:28Z
depends_on: ["feat-hub-foundation", "feat-domain-model-db", "feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-docs-cms.md"]
purpose: 利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する
goal: ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態
scope_in: ["Doc エンティティ (scope=common/tenant・Markdown 本文)", "S15 一覧/閲覧/編集 (編集は admin)", "Markdown レンダラ + エディタ共通部品の消費 (XSS sanitize)", "AI 下書き生成 (D5 キュー)", "doc 編集の監査 event (SEC6)"]
scope_out: ["外部公開サイト生成", "バージョン管理 (Git 連携)"]
acceptance: ["tenant スコープ doc が他テナントから参照できない (分離テスト)", "Markdown 描画で XSS が sanitize される (テスト付き)", "編集操作が監査 event に記録される"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-docs-cms.md"}]
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

# Studio: ドキュメント CMS (common/tenant スコープ・AI 下書き)

> Studio 拡張 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。
> 由来: Harness Studio mockup 反映 (qa-021〜030・U7 改訂 appr-004/005・D5/D6)。正本分析: docs/mockups/harness-studio-v2-analysis.md

## 目的

利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する

## 到達状態

ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態

## スコープ

**対象 (in):**

- Doc エンティティ (scope=common/tenant・Markdown 本文)
- S15 一覧/閲覧/編集 (編集は admin)
- Markdown レンダラ + エディタ共通部品の消費 (XSS sanitize)
- AI 下書き生成 (D5 キュー)
- doc 編集の監査 event (SEC6)

**対象外 (out):**

- 外部公開サイト生成
- バージョン管理 (Git 連携)

## 受入

- tenant スコープ doc が他テナントから参照できない (分離テスト)
- Markdown 描画で XSS が sanitize される (テスト付き)
- 編集操作が監査 event に記録される

## アーキテクチャ参照

- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
