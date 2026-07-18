---
graph_node_id: feat-feedback-loop
artifact_kind: feature
artifact_subtypes: []
title: Studio: 改善要望フィードバックループ (2 経路受付・AI 対応・再公開)
project_id: harness-hub
domain: backend
status: draft
priority: medium
start_date: null
target_date: null
iteration: Studio 拡張
owners: ["daishiman"]
tags: ["macro-feature", "studio-extension", "backend"]
file_path: features/feat-feedback-loop.md
template_id: feature
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: pending
confirmation_evidence: {"evaluator": "user-design-review (claude session 9ce54d7a)", "evidence_ref": "eval-log/run-dev-graph-node-confirm-feat-feedback-loop.json", "evaluated_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6"}
source_lineage: {"imported_at": "2026-07-17T10:44:09Z", "origin_kind": "generated", "source_digest": "8748deba1f9a34c8c126eefac5c16b96833f4cd15acfce76a177476f2a0045c6", "source_path": "specs/harness-hub-system-specification.md", "source_plugin": "dev-graph", "source_version": null}
created_at: 2026-07-17T10:44:09Z
updated_at: 2026-07-17T13:55:07Z
depends_on: ["feat-hub-foundation", "feat-domain-model-db", "feat-auth-tenancy", "feat-publish-pipeline"]
related_nodes: []
resource_scope: ["features/feat-feedback-loop.md"]
purpose: 利用者の改善要望/レビュー依頼/バグ報告を CLI + Web (S14) の 2 経路で受け付け (B6)、D5 pull 型 AI キューで解析・修正案生成し、修正版の publish → update 通知まで閉じる改善ループ (G5/I12, J5) を確立する
goal: フィードバックが status 遷移 (未対応→対応中→対応済み) で管理され、AI 対応結果 (aiResponse) が S14 に反映され、修正版が publish パイプライン経由で利用者へ届く状態
scope_in: ["Feedback エンティティ (種別・経路・aiResponse・status)", "CLI 受付 (claude harness feedback) + S14 Web フォームの 2 経路", "AI キュー (D5) でのフィードバック解析・修正案生成", "修正版 publish (既存パイプライン) と update 通知 (D6) の接続", "Markdown 共通部品の消費 (sanitize)"]
scope_out: ["publish パイプラインの変更", "自動マージ (修正案は人の確認を経て publish)"]
acceptance: ["2 経路の受付が同一 Feedback 資源に正規化される", "AI 対応が pull 型で処理され status 遷移が監査記録される", "対応済み通知がアプリ内 (正本) + メール (D6) で届く"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-feedback-loop.md"}]
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

# Studio: 改善要望フィードバックループ (2 経路受付・AI 対応・再公開)

> Studio 拡張 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。
> 由来: Harness Studio mockup 反映 (qa-021〜030・U7 改訂 appr-004/005・D5/D6)。正本分析: docs/mockups/harness-studio-v2-analysis.md

## 目的

利用者の改善要望/レビュー依頼/バグ報告を CLI + Web (S14) の 2 経路で受け付け (B6)、D5 pull 型 AI キューで解析・修正案生成し、修正版の publish → update 通知まで閉じる改善ループ (G5/I12, J5) を確立する

## 到達状態

フィードバックが status 遷移 (未対応→対応中→対応済み) で管理され、AI 対応結果 (aiResponse) が S14 に反映され、修正版が publish パイプライン経由で利用者へ届く状態

## スコープ

**対象 (in):**

- Feedback エンティティ (種別・経路・aiResponse・status)
- CLI 受付 (claude harness feedback) + S14 Web フォームの 2 経路
- AI キュー (D5) でのフィードバック解析・修正案生成
- 修正版 publish (既存パイプライン) と update 通知 (D6) の接続
- Markdown 共通部品の消費 (sanitize)

**対象外 (out):**

- publish パイプラインの変更
- 自動マージ (修正案は人の確認を経て publish)

## 受入

- 2 経路の受付が同一 Feedback 資源に正規化される
- AI 対応が pull 型で処理され status 遷移が監査記録される
- 対応済み通知がアプリ内 (正本) + メール (D6) で届く

## アーキテクチャ参照

- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy
- feat-publish-pipeline

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
