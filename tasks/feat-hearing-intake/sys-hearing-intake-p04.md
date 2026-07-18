---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p04.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P03 で承認された設計に基づき P05 実装の受入契約となるテストスタブを作成する P04 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P03"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p04.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P04
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P04
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/test-design.md", "apps/hub/src/features/hearing-intake/__tests__/"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-04-test-design.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "test-design"]
target_date: null
template_id: task
template_version: 1.0.0
title: テストファースト設計 — 受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y のテストスタブ作成
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P04 を実行する: テストファースト設計 — 受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y のテストスタブ作成
goal: P03 で承認された設計に基づき、受付番号発番テスト・AI キュー pull/書戻し認可テスト (SEC8)・Markdown sanitize テスト (SEC7)・試算表示のサーバ計算値限定テスト (SEC5)・S10-S12 の axe a11y テストのスタブを作成し、P05 実装の受入契約とする。
scope_in: ["docs/features/feat-hearing-intake/test-design.md", "apps/hub/src/features/hearing-intake/__tests__/"]
scope_out: ["テストスタブの実装コードへの接続 (P05 の責務)", "共有 CI パイプライン設定 (.github/workflows/ci.yml) の変更"]
acceptance: ["test-design.md に受付番号発番・AI キュー認可・Markdown sanitize・試算表示サーバ計算限定・axe a11y の 5 テストカテゴリの合否基準が明記されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# テストファースト設計 — 受付番号発番/AI キュー認可/Markdown sanitize/試算表示サーバ計算限定/axe a11y のテストスタブ作成

> task projection (P04 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-04-test-design.md`

## 依存

- SYS-HEARING-INTAKE-P03

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P04)
