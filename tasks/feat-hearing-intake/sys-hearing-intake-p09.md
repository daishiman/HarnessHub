---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p09.md", "confidence": 0.86}]
classification_confidence: 0.86
classification_reason: feat-hub-foundation が確立した共有 CI 品質ゲート (axe/Tenant 分離/AI キュー認可) に対する本 feature の適合を確認する P09 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P08"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p09.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P09
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P09
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/quality-assurance-report.md"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-09-quality-assurance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "quality-assurance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 品質保証 — CI 品質ゲート (axe/Tenant 分離/AI キュー認可) 適合確認
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P09 を実行する: 品質保証 — CI 品質ゲート (axe/Tenant 分離/AI キュー認可) 適合確認
goal: feat-hub-foundation が所有する共有 CI 品質ゲート (axe a11y、Tenant/Workspace 分離テスト、監視/SLO ダッシュボード) に本 feature が適合していることを確認し、AI キュー滞留監視の未解決論点を運用文書化対象として P12 へ引き継ぐ。
scope_in: ["docs/features/feat-hearing-intake/quality-assurance-report.md"]
scope_out: ["共有 CI 品質ゲート自体の変更 (.github/workflows/ci.yml。feat-hub-foundation の scope)", "AI キュー滞留監視の実運用構築 (P12 で運用文書化のみ行い、監視基盤の実装自体は feat-hub-foundation の scope)"]
acceptance: ["quality-assurance-report.md に axe/Tenant 分離/SEC5/SEC7/SEC8 の適合確認結果と AI キュー滞留監視 (qa-027) の P12 引き継ぎ事項が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# 品質保証 — CI 品質ゲート (axe/Tenant 分離/AI キュー認可) 適合確認

> task projection (P09 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-09-quality-assurance.md`

## 依存

- SYS-HEARING-INTAKE-P08

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P09)
