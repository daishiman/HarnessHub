---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p07.md", "confidence": 0.87}]
classification_confidence: 0.87
classification_reason: P06 のテスト結果を goal-spec の acceptance 3 項目に照らして受入判定する P07 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: ["SYS-HEARING-INTAKE-P06"]
domain: quality
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p07.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P07
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P07
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/acceptance-report.md"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-07-acceptance.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "acceptance"]
target_date: null
template_id: task
template_version: 1.0.0
title: 受入 — goal-spec acceptance 3 項目の確認
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P07 を実行する: 受入 — goal-spec acceptance 3 項目の確認
goal: P06 のテスト結果を goal-spec の acceptance 3 項目 (受付番号発番+生成中状態表示、AI キュー pull→書戻し完結でサーバ側課金なし、Markdown sanitize 済み描画) に照らして受入可否を判定する。
scope_in: ["docs/features/feat-hearing-intake/acceptance-report.md"]
scope_out: ["acceptance 未達時の実装修正 (該当 task へ差し戻す)", "goal-spec 自体の変更 (dev-graph 側の再確定が必要)"]
acceptance: ["acceptance-report.md に acceptance 3 項目それぞれの pass/fail 判定と test-run-report.md への参照が記載されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# 受入 — goal-spec acceptance 3 項目の確認

> task projection (P07 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-07-acceptance.md`

## 依存

- SYS-HEARING-INTAKE-P06

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P07)
