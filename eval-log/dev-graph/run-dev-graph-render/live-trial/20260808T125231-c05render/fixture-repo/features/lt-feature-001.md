---
graph_node_id: "LT-FEATURE-001"
artifact_kind: "feature"
artifact_subtypes: []
title: "live-trial fixture の可視化対象 feature"
project_id: "live-trial-fixture"
domain: "documentation"
status: "active"
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
purpose: "render の feature progress 集約を実 graph 値で観測できるようにするための固定 feature"
goal: "配下 exact-13 task の完了数が X/Y として描画された状態"
scope_in: ["配下 13 task の進捗集約表示"]
scope_out: ["実 repository の feature 定義"]
acceptance: ["描画された feature progress が graph 上の done 件数と一致する"]
architecture_refs: ["LT-ARCH-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/lt-feature-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest": "a01c1285b46204e95e8cc04aaa6057d2c94fe096faf64e7aab2b3c7f68de3e9f", "evaluator": "build_live_trial_fixture", "evidence_ref": "features/lt-feature-001.md"}
source_lineage: {"imported_at": "2026-07-21T00:00:00Z", "origin_kind": "manual", "source_digest": null, "source_path": null, "source_plugin": null, "source_version": null}
classification_confidence: 1.0
classification_reason: "live-trial fixture の progress 集約対象として決定論生成された feature ノード"
classification_candidates: [{"artifact_kind": "feature", "candidate_path": "features/lt-feature-001.md", "confidence": 1.0}]
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

# live-trial fixture の可視化対象 feature

live-trial fixture の固定 artifact。実 repository の成果物ではない。
