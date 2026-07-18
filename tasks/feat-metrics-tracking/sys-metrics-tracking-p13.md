---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-metrics-tracking/sys-metrics-tracking-p13.md", "confidence": 0.85}]
classification_confidence: 0.85
classification_reason: P12 の runbook を前提に、MetricsEvent/MetricsRollup スキーマ・ingest/rollup/summary API・Workers cron・S09/S16 画面を本番 Cloudflare Workers 環境へ反映しスモークテストで疎通確認する P13 リリース/デプロイタスク (required-node、N/A 許容)
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T15:31:06Z
depends_on: ["SYS-METRICS-TRACKING-P12"]
domain: operations
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-metrics-tracking
file_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p13.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-METRICS-TRACKING-P13
implementation_readiness: {"checked_at": "2026-07-18T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-metrics-tracking
phase_ref: P13
priority: null
project_id: feature-package-feat-metrics-tracking
pull_request_linkages: []
related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
resource_scope: ["docs/features/feat-metrics-tracking/release-record.md"]
source_lineage: {"imported_at": "2026-07-17T15:31:06Z", "origin_kind": "system-dev-planner", "source_digest": "178a96700782a721a2f448d53618709aff1c89250d73f17154bc7de273395ed1", "source_path": ".dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-13-release-deploy.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "release"]
target_date: null
template_id: task
template_version: 1.0.0
title: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト
tracker_binding: beads
updated_at: 2026-07-17T15:31:06Z
purpose: feat-metrics-tracking の P13 を実行する: リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト
goal: P01〜P12 で確定・実装・検証・文書化した MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面を本番 Cloudflare Workers 環境へ反映し、スモークテストで疎通を確認する。
scope_in: ["docs/features/feat-metrics-tracking/release-record.md"]
scope_out: ["新機能の追加・設計変更 (本 task はリリース作業のみ)", "外部 BI 連携の展開 (goal-spec scope_out)"]
acceptance: ["release-record.md に本番反映内容とスモークテスト結果 (ingest 疎通・cron 初回実行・S09/S16 到達性・metrics.anomaly 通知疎通) が pass として記載されている"]
architecture_refs: ["arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
---

# リリース/デプロイ — Cloudflare Workers 本番反映とスモークテスト

> task projection (P13 / parent: feat-metrics-tracking)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-metrics-tracking/task-specs/phase-13-release-deploy.md`

## 依存

- SYS-METRICS-TRACKING-P12

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-METRICS-TRACKING-P13)
