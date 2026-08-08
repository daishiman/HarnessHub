---
graph_node_id: "LT-ARCH-001"
artifact_kind: "architecture"
artifact_subtypes: ["backend"]
title: "live-trial fixture の参照アーキテクチャ"
project_id: "live-trial-fixture"
domain: "documentation"
status: "active"
owners: ["live-trial"]
tags: ["live-trial", "fixture"]
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
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/lt-arch-001.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest": "70030983f5af3833a68e659c230fa696f5fc125c9ca2394563b47f6657bae008", "evaluator": "build_live_trial_fixture", "evidence_ref": "architecture/lt-arch-001.md"}
source_lineage: {"imported_at": "2026-07-21T00:00:00Z", "origin_kind": "manual", "source_digest": null, "source_path": null, "source_plugin": null, "source_version": null}
classification_confidence: 1.0
classification_reason: "live-trial fixture の feature が参照する固定 architecture ノード"
classification_candidates: [{"artifact_kind": "architecture", "candidate_path": "architecture/lt-arch-001.md", "confidence": 1.0}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "open"}
implementation_readiness: {"checked_at": "2026-07-21T00:00:00Z", "missing_sections": [], "status": "complete"}
---

# live-trial fixture の参照アーキテクチャ

live-trial fixture の固定 artifact。実 repository の成果物ではない。
