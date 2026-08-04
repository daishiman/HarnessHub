---
graph_node_id: "feat-dual-catalog-web"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["macro-feature","stage-1","frontend"]
priority: "high"
start_date: null
target_date: null
iteration: "Stage 1"
title: "Hub Web: Thin Dual Catalog (Skill + WebApp) と配布出口"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-08-02T06:50:00Z"
status: "active"
depends_on: ["feat-stage0-distribution-gate"]
related_nodes: []
resource_scope: ["features/feat-dual-catalog-web.md"]
purpose: "利用者・管理者が Skill/WebApp を発見・導入できる dual catalog UI と配布出口 (marketplace 出力 / Bootstrap Installer 連携) を、WCAG 2.2 AA + CWV good (qa-018) の品質で提供する"
goal: "2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)、a11y/速度の品質ゲートが CI で強制される状態"
scope_in: ["dual catalog 閲覧 UI (レスポンシブ)","publish 状況表示 (ポーリング)","marketplace.json 出力 + 採用配布経路連携","axe 自動チェック CI","CWV 計測 (LCP/INP/CLS)"]
scope_out: ["承認キュー UI (Stage 2)","native アプリ"]
acceptance: ["axe 検出可能違反 0 がリリース条件として CI に存在する","CWV 全指標 good を実測で満たす","導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退)"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-dual-catalog-web.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-dual-catalog-web/7069e34892e25830493bc3b3164f5ebba8dbf911c5054e3308bc0d6261f17817/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-18T22:35:48Z","origin_kind":"generated","source_digest":"7e1a6753bec43aa5e758f148039c1af71517142bb6e039dc8b1de20638018d77","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-dual-catalog-web.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dhy","linked_at":"2026-07-19T14:13:18Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Hub Web: Thin Dual Catalog (Skill + WebApp) と配布出口

> Stage 1 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

利用者・管理者が Skill/WebApp を発見・導入できる dual catalog UI と配布出口 (marketplace 出力 / Bootstrap Installer 連携) を、WCAG 2.2 AA + CWV good (qa-018) の品質で提供する

## 到達状態

2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)、a11y/速度の品質ゲートが CI で強制される状態

## スコープ

**対象 (in):**

- dual catalog 閲覧 UI (レスポンシブ)
- publish 状況表示 (ポーリング)
- marketplace.json 出力 + 採用配布経路連携
- axe 自動チェック CI
- CWV 計測 (LCP/INP/CLS)

**対象外 (out):**

- 承認キュー UI (Stage 2)
- native アプリ

## 受入

- axe 検出可能違反 0 がリリース条件として CI に存在する
- CWV 全指標 good を実測で満たす
- 導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退)

## アーキテクチャ参照

- [arch-harness-hub-frontend](../architecture/harness-hub-frontend.md)
- [arch-harness-hub-backend](../architecture/harness-hub-backend.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- feat-publish-pipeline
- feat-stage0-distribution-gate

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## 2026-08-01 最終レビュー実装フィードバック

- 認可済み catalog の stale 表示を同一 tenant/workspace/project の `degraded` に限定し、401/403/契約不正と scope 切替では以前の内容を描画しない。
- `/marketplace.json` は private cache + Cookie/tenant/workspace `Vary` へ改訂し、Hub 停止時の同一 scope 継続性を残したまま shared cache のテナント漏えい窓を閉じた。
- 一覧の入力値と適用 query を分離し、入力中の自動取得と submit 時の二重取得を解消した。
- dual catalog の仕様正本は `qa-117`〜`qa-119`、main との security 統合正本は `qa-120`。設計は [frontend](../architecture/harness-hub-frontend.md)・[security](../architecture/harness-hub-security.md)・[testing-qa](../architecture/harness-hub-testing-qa.md)、検証と残課題は [仕様反映受領書](../docs/features/feat-dual-catalog-web/spec-reflection-receipt.md) を参照する。
