---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-feedback-loop/sys-feedback-loop-p13.md", "confidence": 0.86}]
classification_confidence: 0.86
classification_reason: P12 の runbook を踏まえ cloudflare-workers/hub への本番反映とスモークテストを実施し feature package を完了させる P13 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-feedback-loop/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T14:33:22Z
depends_on: ["SYS-FEEDBACK-LOOP-P12"]
domain: operations
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-feedback-loop
file_path: tasks/feat-feedback-loop/sys-feedback-loop-p13.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-FEEDBACK-LOOP-P13
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-feedback-loop
phase_ref: P13
priority: null
project_id: feature-package-feat-feedback-loop
pull_request_linkages: []
related_nodes: ["feat-feedback-loop", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-feedback-loop/release-notes.md"]
source_lineage: {"imported_at": "2026-07-17T14:33:22Z", "origin_kind": "system-dev-planner", "source_digest": "906f1acf5e23697a98382601bea20c910a9e5599b319385a29c5d983e13f89db", "source_path": ".dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-13-release-deploy.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-feedback-loop", "studio-extension", "feedback-loop", "release"]
target_date: null
template_id: task
template_version: 1.0.0
title: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト
tracker_binding: beads
updated_at: 2026-07-17T14:33:22Z
purpose: feat-feedback-loop の P13 を実行する: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト
goal: P12 の runbook と P08 の migration ファイルを用いて、feedbacks テーブル migration を本番へ適用し、cloudflare-workers/hub へ feat-feedback-loop を本番反映する。反映後、S14 到達性・feedback API 疎通・migration 適用確認・AI キュー pull 疎通の 4 点をスモークテストで確認し、feature package を release-notes.md に記録して完了する。
scope_in: ["docs/features/feat-feedback-loop/release-notes.md"]
scope_out: ["新規インフラ・新規デプロイ単位の作成 (既存 cloudflare-workers/hub を使用する)", "feat-publish-pipeline/feat-hub-foundation 自体のデプロイ手順変更"]
acceptance: ["release-notes.md に S14 到達性・feedback API 疎通・migration 適用確認・AI キュー pull 疎通の 4 点のスモークテスト結果が記録されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-frontend"]
---

# リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

> task projection (P13 / parent: feat-feedback-loop)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-feedback-loop/task-specs/phase-13-release-deploy.md`

## 依存

- SYS-FEEDBACK-LOOP-P12

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-FEEDBACK-LOOP-P13)
