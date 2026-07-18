---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-build-pipeline-board/sys-build-pipeline-board-p13.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P12 の runbook を踏まえ feat-hub-foundation の既存パイプラインで Cloudflare Workers 本番反映とスモークテストを行う P13 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-build-pipeline-board/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T13:54:30Z
depends_on: ["SYS-BUILD-PIPELINE-BOARD-P12"]
domain: operations
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-build-pipeline-board
file_path: tasks/feat-build-pipeline-board/sys-build-pipeline-board-p13.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-BUILD-PIPELINE-BOARD-P13
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-build-pipeline-board
phase_ref: P13
priority: null
project_id: feature-package-feat-build-pipeline-board
pull_request_linkages: []
related_nodes: ["feat-build-pipeline-board", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
resource_scope: ["docs/features/feat-build-pipeline-board/release-notes.md"]
source_lineage: {"imported_at": "2026-07-17T13:54:30Z", "origin_kind": "system-dev-planner", "source_digest": "c7e0d7e68a86d10ef5b70c55a4f881b174f3b503b5bc2d6285bcef4ebfe58d9c", "source_path": ".dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-13-release-deploy.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-build-pipeline-board", "studio-extension", "build-pipeline-board", "release"]
target_date: null
template_id: task
template_version: 1.0.0
title: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト
tracker_binding: beads
updated_at: 2026-07-17T13:54:30Z
purpose: feat-build-pipeline-board の P13 を実行する: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト
goal: feat-hub-foundation が既に確立している Cloudflare Workers デプロイパイプラインを用いて構築パイプラインボード機能一式 (S13 画面・Build/build_stage_events スキーマ・builds API・PublishRequest 接続・監査 event) を本番反映し、release-notes.md にスモークテスト結果を記録する。
scope_in: ["docs/features/feat-build-pipeline-board/release-notes.md"]
scope_out: ["新規デプロイパイプラインの構築 (feat-hub-foundation の既存パイプラインを使用する)", "publish 状態機械自体の本番切替 (既存 I2/I3 パイプラインを使用。goal-spec scope_out)"]
acceptance: ["release-notes.md に本番反映日時とスモークテスト結果 (S13 到達確認・builds API 疎通確認・migration 適用確認) が記録されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend"]
---

# リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

> task projection (P13 / parent: feat-build-pipeline-board)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-build-pipeline-board/task-specs/phase-13-release-deploy.md`

## 依存

- SYS-BUILD-PIPELINE-BOARD-P12

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-BUILD-PIPELINE-BOARD-P13)
