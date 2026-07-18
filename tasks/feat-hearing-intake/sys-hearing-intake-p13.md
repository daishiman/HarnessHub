---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p13.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P12 の runbook.md に基づき S10-S12 を feat-hub-foundation の既存 Cloudflare Workers パイプライン経由で本番反映し、feature 全体の完了を報告する P13 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P12"]
domain: operations
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p13.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P13
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P13
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/release-notes.md"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-13-release-deploy.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "release-deploy"]
target_date: null
template_id: task
template_version: 1.0.0
title: リリース/デプロイ — S10-S12 の Cloudflare Workers 本番反映とロールアウト確認
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P13 を実行する: リリース/デプロイ — S10-S12 の Cloudflare Workers 本番反映とロールアウト確認
goal: P12 の runbook.md に基づき S10 ウィザード・S11/S12 シート管理・受付番号採番・AI キュー API を feat-hub-foundation が確立した既存 Cloudflare Workers パイプライン経由で本番反映し、ロールアウトを確認したうえで feature 全体の完了 (P01..P13 全 done) を dev-graph へ報告する。
scope_in: ["docs/features/feat-hearing-intake/release-notes.md"]
scope_out: ["feat-hub-foundation の既存デプロイパイプライン自体の変更", "AI 実行基盤のサーバ側デプロイ (D5 で不採用。goal-spec scope_out)", "構築工程進行管理のデプロイ (feat-build-pipeline-board の scope)"]
acceptance: ["release-notes.md に本番反映日時・smoke test 結果・ロールアウト確認結果が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# リリース/デプロイ — S10-S12 の Cloudflare Workers 本番反映とロールアウト確認

> task projection (P13 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-13-release-deploy.md`

## 依存

- SYS-HEARING-INTAKE-P12

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P13)
