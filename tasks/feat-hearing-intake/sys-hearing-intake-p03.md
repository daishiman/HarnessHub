---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p03.md", "confidence": 0.88}]
classification_confidence: 0.88
classification_reason: P02 で確定した HearingSheet/FormData/AiJob(hearing kind) スキーマと AI キュー API 契約・Markdown sanitize 適用点を、設計担当から独立した視点でレビューする P03 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P02"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p03.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P03
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P03
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/design-review-notes.md"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-03-design-review.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "design-review"]
target_date: null
template_id: task
template_version: 1.0.0
title: 独立設計レビュー — HearingSheet/FormData/AiJob(hearing kind) 設計・AI キュー認可・Markdown sanitize の妥当性確認
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P03 を実行する: 独立設計レビュー — HearingSheet/FormData/AiJob(hearing kind) 設計・AI キュー認可・Markdown sanitize の妥当性確認
goal: P02 で確定した HearingSheet/FormData/AiJob (hearing kind) スキーマ、受付番号採番方式、AI キュー API 契約、Markdown sanitize 適用点を、設計担当から独立した視点でレビューし、SEC2/SEC5/SEC7/SEC8 と qa-021/qa-022/qa-023/qa-024 への適合を確認する。
scope_in: ["docs/features/feat-hearing-intake/design-review-notes.md"]
scope_out: ["設計そのものの修正実施 (却下時は P02 を再実行対象として差し戻す)", "実装コードの作成", "feat-auth-tenancy/feat-domain-model-db/feat-hub-foundation が所有する既存設計のレビュー (本 feature の設計差分のみが対象)"]
acceptance: ["design-review-notes.md に承認可否と SEC2/SEC5/SEC7/SEC8・qa-021/qa-022/qa-023/qa-024 適合確認結果が明記されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# 独立設計レビュー — HearingSheet/FormData/AiJob(hearing kind) 設計・AI キュー認可・Markdown sanitize の妥当性確認

> task projection (P03 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-03-design-review.md`

## 依存

- SYS-HEARING-INTAKE-P02

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P03)
