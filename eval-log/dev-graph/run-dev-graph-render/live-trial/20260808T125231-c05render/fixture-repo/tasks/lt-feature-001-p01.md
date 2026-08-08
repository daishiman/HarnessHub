---
graph_node_id: "LT-FEATURE-001-P01"
artifact_kind: "task"
artifact_subtypes: []
title: "P01: 入力契約の確定"
project_id: "live-trial-fixture"
domain: "documentation"
status: "done"
owners: ["live-trial"]
tags: ["live-trial", "fixture", "render"]
priority: null
start_date: null
target_date: null
iteration: null
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-21T00:00:00Z"
depends_on: []
related_nodes: []
resource_scope: []
purpose: "live-trial の被験 skill を実 repo から隔離して実走させるための固定 fixture node"
goal: "graph 実値と skill 出力の一致を観測できる状態"
scope_in: ["fixture 内の読み取り検証"]
scope_out: ["実 repository の変更"]
acceptance: ["skill 出力の status/depends_on が本 node の値と一致する"]
architecture_refs: []
parent_feature: "LT-FEATURE-001"
feature_package_id: "feature-package/LT-FEATURE-001"
phase_ref: "P01"
file_path: "tasks/lt-feature-001-p01.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest": "948fd44e4c2f65948e1a30897036e6eccf8ba0948fac465eb67f2b8e14e2c65e", "evaluator": "build_live_trial_fixture", "evidence_ref": "tasks/lt-feature-001-p01.md"}
source_lineage: {"imported_at": "2026-07-21T00:00:00Z", "origin_kind": "system-dev-planner", "source_digest": "d23642a89399279a057d59184d5f2ca59042a60f18f5ba32b502999e7dec2807", "source_path": "system-plan/LT-FEATURE-001/feature-package.json", "source_plugin": "system-dev-planner", "source_version": "1.0.0"}
classification_confidence: 1.0
classification_reason: "live-trial fixture として決定論生成された task node"
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/lt-feature-001-p01.md", "confidence": 1.0}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at": "2026-07-21T00:00:00Z", "evidence_refs": ["tasks/lt-feature-001-p01.md"], "policy": "manual", "reconciled_at": "2026-07-21T00:00:00Z", "source": "manual", "status": "done"}
implementation_readiness: {"checked_at": "2026-07-21T00:00:00Z", "missing_sections": [], "status": "complete"}
---

# P01: 入力契約の確定

live-trial fixture の固定 artifact。実 repository の成果物ではない。

## 正本仕様書

live-trial fixture の固定 artifact の検証用の実文。

## 依存

live-trial fixture の固定 artifact の検証用の実文。

## 実行契約

live-trial fixture の固定 artifact の検証用の実文。
