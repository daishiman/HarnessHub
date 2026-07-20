---
graph_node_id: "feat-publisher-plugin"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["macro-feature","stage-1","backend"]
priority: "high"
start_date: null
target_date: null
iteration: "Stage 1"
title: "Publisher (TypeScript CLI/plugin: 収集・pre-check・publish)"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-07-19T14:18:12Z"
status: "active"
depends_on: ["feat-publish-pipeline","feat-stage0-distribution-gate"]
related_nodes: []
resource_scope: ["features/feat-publisher-plugin.md"]
purpose: "作者が Claude Code / Codex から自己完結で publish できる操作面 (slash command + skill + スクリプト) を TypeScript で提供し、既存 Python 資産を挙動同値で移植する"
goal: "作者環境 (macOS/Windows) から初回 publish が 15 分以内 (O4/H8) に完了する状態"
scope_in: ["package 収集 + manifest 補完","ローカル pre-check (Hub と検査ロジック共有)","Device Flow 認証 + OS 資格情報域保存","web_app 経路の wrangler スクリプト実行","Python 資産の挙動同値移植テスト"]
scope_out: ["Hub 側 API 実装","専用 desktop GUI (作らない: qa-007)"]
acceptance: ["macOS/Windows 両実機で publish E2E が成功する","pre-check と Hub 検査の判定が同値","初回 publish 15 分以内の実測記録"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-publisher-plugin.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-publisher-plugin/b98891c25036105636bb3f660873c81b1af6c08410f5bf1a88a43c3932eed2df/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"a4c26b6d4e7e8c3556d4a78089c12c6bb8dee445c20c623b151079d5747fd22d","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-publisher-plugin.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-zdh","linked_at":"2026-07-19T14:18:16Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Publisher (TypeScript CLI/plugin: 収集・pre-check・publish)

> Stage 1 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

作者が Claude Code / Codex から自己完結で publish できる操作面 (slash command + skill + スクリプト) を TypeScript で提供し、既存 Python 資産を挙動同値で移植する

## 到達状態

作者環境 (macOS/Windows) から初回 publish が 15 分以内 (O4/H8) に完了する状態

## スコープ

**対象 (in):**

- package 収集 + manifest 補完
- ローカル pre-check (Hub と検査ロジック共有)
- Device Flow 認証 + OS 資格情報域保存
- web_app 経路の wrangler スクリプト実行
- Python 資産の挙動同値移植テスト

**対象外 (out):**

- Hub 側 API 実装
- 専用 desktop GUI (作らない: qa-007)

## 受入

- macOS/Windows 両実機で publish E2E が成功する
- pre-check と Hub 検査の判定が同値
- 初回 publish 15 分以内の実測記録

## アーキテクチャ参照

- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-security](../architecture/harness-hub-security.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-publish-pipeline

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## 上流未解決 (P02 設計時に解消)

- `claude harness feedback` CLI 受付コマンド (I12/J5 の CLI 経路) の実装 owner が未確定。feat-feedback-loop の plan (2026-07-17) は Web/API 側のみを scope とし、CLI コマンド本体は既存 Device Flow 基盤の再利用前提でスコープ外へ明記した。CLI/plugin 操作面の owner である本 feature が feedback サブコマンドを scope に含めるかを P02 で確定する (出典: feat-feedback-loop plan 設計判断 2026-07-17)
