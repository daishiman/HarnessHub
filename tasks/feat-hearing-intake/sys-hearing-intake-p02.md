---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p02.md", "confidence": 0.9}]
classification_confidence: 0.9
classification_reason: qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い HearingSheet/FormData/AiJob(hearing kind) のスキーマと受付番号採番・AI キュー API 契約を確定する P02 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P01"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p02.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P02
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P02
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/architecture-decision-record.md"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-02-architecture.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "architecture"]
target_date: null
template_id: task
template_version: 1.0.0
title: アーキテクチャ設計 — HearingSheet/FormData/AiJob(hearing kind) スキーマ・受付番号採番・AI キュー API 契約の設計
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P02 を実行する: アーキテクチャ設計 — HearingSheet/FormData/AiJob(hearing kind) スキーマ・受付番号採番・AI キュー API 契約の設計
goal: S10 (4 ステップウィザード)・S11/S12 (シート一覧/詳細) の画面構成、HearingSheet/FormData/AiJob (hearing kind) のカラム設計、受付番号採番方式、AI キュー (D5 pull 型) ジョブ投入/書戻し受領 API の契約設計、ウィザード共通部品/Markdown レンダラ/通知ディスパッチ共通層への接続点を確定し、P05 実装が迷いなく着手できる設計成果物を作る。
scope_in: ["docs/features/feat-hearing-intake/architecture-decision-record.md"]
scope_out: ["AI 実行基盤のサーバ側実装 (D5 で不採用。goal-spec scope_out)", "AiJob キュー共通層そのものの汎化設計 (共通層 owner feat-hub-foundation が解決すべき未解決の上流論点。docs/shared-layers.md §2/§5。第 3 の利用者出現時に共通化する方針に従い本 feature では汎化しない)", "構築工程の進行管理 (feat-build-pipeline-board の scope)", "試算エンジン本体 (annualHours・分/回・削減率を用いた実際の削減額計算) の設計 (owner 未確定の上流論点。本 feature は TenantCoefficient 係数の読取消費のみを行う)", "認証方式・role 体系そのものの設計変更 (feat-auth-tenancy の scope)"]
acceptance: ["architecture-decision-record.md に HearingSheet/FormData/AiJob(hearing kind) のカラム一覧、受付番号採番方式、AI キュー API 契約、AiJob 共通層汎化の未解決論点の明記、S10-S12 の画面構成表が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# アーキテクチャ設計 — HearingSheet/FormData/AiJob(hearing kind) スキーマ・受付番号採番・AI キュー API 契約の設計

> task projection (P02 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-02-architecture.md`

## 依存

- SYS-HEARING-INTAKE-P01

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P02)
