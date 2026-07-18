---
graph_node_id: feat-dual-catalog-web
artifact_kind: feature
artifact_subtypes: []
title: Hub Web: Thin Dual Catalog (Skill + WebApp) と配布出口
project_id: harness-hub
domain: frontend
status: draft
priority: high
start_date: null
target_date: null
iteration: Stage 1
owners: ["daishiman"]
tags: ["macro-feature", "stage-1", "frontend"]
file_path: features/feat-dual-catalog-web.md
template_id: feature
template_version: 1.0.0
confirmation_status: draft
evaluation_status: pending
confirmation_evidence: {"evaluator": null, "evidence_ref": null, "evaluated_digest": null}
source_lineage: {"origin_kind": "generated", "source_plugin": "dev-graph", "source_path": "specs/harness-hub-system-specification.md", "source_version": null, "source_digest": null, "imported_at": "2026-07-17T00:38:30Z"}
created_at: 2026-07-17T00:38:30Z
updated_at: 2026-07-17T00:38:30Z
depends_on: ["feat-publish-pipeline", "feat-stage0-distribution-gate"]
related_nodes: []
resource_scope: ["features/feat-dual-catalog-web.md"]
purpose: 利用者・管理者が Skill/WebApp を発見・導入できる dual catalog UI と配布出口 (marketplace 出力 / Bootstrap Installer 連携) を、WCAG 2.2 AA + CWV good (qa-018) の品質で提供する
goal: 2 社の顧客 Workspace が同時にカタログを閲覧・導入でき (U5)、a11y/速度の品質ゲートが CI で強制される状態
scope_in: ["dual catalog 閲覧 UI (レスポンシブ)", "publish 状況表示 (ポーリング)", "marketplace.json 出力 + 採用配布経路連携", "axe 自動チェック CI", "CWV 計測 (LCP/INP/CLS)"]
scope_out: ["承認キュー UI (Stage 2)", "native アプリ"]
acceptance: ["axe 検出可能違反 0 がリリース条件として CI に存在する", "CWV 全指標 good を実測で満たす", "導入済み Skill が Hub 停止中も動作継続する (§6.1 縮退)"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-dual-catalog-web.md"}]
tracker_binding: beads
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "open", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "incomplete", "missing_sections": ["13-task package 未生成 (system-dev-planner 待ち)"], "checked_at": "2026-07-17T00:38:30Z"}
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
