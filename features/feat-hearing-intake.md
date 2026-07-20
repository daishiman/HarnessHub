---
graph_node_id: "feat-hearing-intake"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["macro-feature","studio-extension","frontend"]
priority: "high"
start_date: null
target_date: null
iteration: "Studio 拡張"
title: "Studio: ヒアリング intake (ウィザード・シート管理・AI 生成キュー)"
owners: ["daishiman"]
created_at: "2026-07-17T10:44:09Z"
updated_at: "2026-07-19T14:14:59Z"
status: "active"
depends_on: ["feat-hub-foundation","feat-domain-model-db","feat-auth-tenancy"]
related_nodes: []
resource_scope: ["features/feat-hearing-intake.md"]
purpose: "業務課題から業務ツールが生まれる入口として、S10 の 4 ステップウィザード (削減試算付き)・受付番号採番・D5 pull 型 AI キューによるヒアリングシート生成・S11/S12 のシート管理を提供する (I11, J4)"
goal: "非エンジニアがウィザードで課題を登録すると受付番号が発番され、AI キュー (D5) 経由で生成されたシートが S11/S12 に反映され status 管理 (admin) できる状態"
scope_in: ["S10 ヒアリングウィザード (4 ステップ・自動試算表示)","HearingSheet/FormData エンティティ + 受付番号採番","AI 処理キュー (D5 pull 型) のジョブ投入・生成結果の書戻し受領","S11 シート一覧 / S12 シート詳細 (status 変更は admin)","ステップウィザード共通部品の消費"]
scope_out: ["AI 実行基盤のサーバ側実装 (D5 で不採用)","構築工程の進行管理 (feat-build-pipeline-board)"]
acceptance: ["ウィザード完了で受付番号が発番され「生成中」状態が表示される (非同期 UI パターン)","AI キューのジョブが pull→書戻しで完結しサーバ側 AI 課金が発生しない","シート本文の Markdown が sanitize 済みで描画される (SEC7)"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-hearing-intake.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"a4c26b6d4e7e8c3556d4a78089c12c6bb8dee445c20c623b151079d5747fd22d","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (Studio mockup 反映で確定した U7 拡張スコープ + I10-I14 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-hearing-intake.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-o2i","linked_at":"2026-07-18T01:44:55Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Studio: ヒアリング intake (ウィザード・シート管理・AI 生成キュー)

> Studio 拡張 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。
> 由来: Harness Studio mockup 反映 (qa-021〜030・U7 改訂 appr-004/005・D5/D6)。正本分析: docs/mockups/harness-studio-v2-analysis.md

## 目的

業務課題から業務ツールが生まれる入口として、S10 の 4 ステップウィザード (削減試算付き)・受付番号採番・D5 pull 型 AI キューによるヒアリングシート生成・S11/S12 のシート管理を提供する (I11, J4)

## 到達状態

非エンジニアがウィザードで課題を登録すると受付番号が発番され、AI キュー (D5) 経由で生成されたシートが S11/S12 に反映され status 管理 (admin) できる状態

## スコープ

**対象 (in):**

- S10 ヒアリングウィザード (4 ステップ・自動試算表示)
- HearingSheet/FormData エンティティ + 受付番号採番
- AI 処理キュー (D5 pull 型) のジョブ投入・生成結果の書戻し受領
- S11 シート一覧 / S12 シート詳細 (status 変更は admin)
- ステップウィザード共通部品の消費

**対象外 (out):**

- AI 実行基盤のサーバ側実装 (D5 で不採用)
- 構築工程の進行管理 (feat-build-pipeline-board)

## 受入

- ウィザード完了で受付番号が発番され「生成中」状態が表示される (非同期 UI パターン)
- AI キューのジョブが pull→書戻しで完結しサーバ側 AI 課金が発生しない
- シート本文の Markdown が sanitize 済みで描画される (SEC7)

## アーキテクチャ参照

- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)
- [arch-harness-hub-data](../architecture/harness-hub-data.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-hub-foundation
- feat-domain-model-db
- feat-auth-tenancy

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
