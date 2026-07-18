---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p08.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: HearingSheet/FormData/AiJob(hearing kind) の新規テーブルに対する migration ファイル生成と後方互換性確認を行う P08 タスク (feature-execution-package-contract.md により P08 は N/A 判定時も常設される)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P07"]
domain: data
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p08.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P08
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P08
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/refactoring-migration-note.md", "packages/db/schema/hearing-intake/"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-08-refactoring-migration.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "refactoring-migration"]
target_date: null
template_id: task
template_version: 1.0.0
title: リファクタリング/マイグレーション — HearingSheet/FormData/AiJob(hearing kind) 新規テーブルの migration 生成と後方互換性確認
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P08 を実行する: リファクタリング/マイグレーション — HearingSheet/FormData/AiJob(hearing kind) 新規テーブルの migration 生成と後方互換性確認
goal: P05 で実装した HearingSheet/FormData/AiJob (hearing kind) の新規テーブル定義に対する migration ファイルを生成し、既存データへの後方互換性影響がないことを確認する。
scope_in: ["docs/features/feat-hearing-intake/refactoring-migration-note.md", "packages/db/schema/hearing-intake/"]
scope_out: ["AiJob キュー共通層そのものの汎化 migration (feat-hub-foundation の未解決上流論点。P02 のスコープ判断を継承)", "既存テーブルへの ALTER (本 feature には対象がない)", "本番環境への migration 適用 (P13 の scope)"]
acceptance: ["refactoring-migration-note.md に生成した migration ファイル一覧と後方互換性確認結果 (既存テーブル影響なし) が記載され、P06 テストが再度 green であることの記録がある"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# リファクタリング/マイグレーション — HearingSheet/FormData/AiJob(hearing kind) 新規テーブルの migration 生成と後方互換性確認

> task projection (P08 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-08-refactoring-migration.md`

## 依存

- SYS-HEARING-INTAKE-P07

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P08)
