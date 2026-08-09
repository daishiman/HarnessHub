---
graph_node_id: "F-LIVE-001"
artifact_kind: "feature"
artifact_subtypes: []
title: "live-trial fixture の確定 feature"
project_id: "live-trial-fixture"
domain: "development"
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
purpose: "確定 system-spec から exact-13 package を導出した macro feature"
goal: "readiness 完了時に capability-build へ handoff できる状態"
scope_in: ["確定 system-spec からの要件導出", "exact-13 package の readiness 判定"]
scope_out: ["実装コードの生成", "実 repository への書き込み"]
acceptance: ["13 task 全件が implementation_readiness=complete である"]
architecture_refs: ["LT-ARCH-001"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/f-live-001.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest": "30caeebd524eac9ee07cbf195dda000fb94c46de59a3ef0d281477e077b54e46", "evaluator": "system-dev-planner/validate-system-plan", "evidence_ref": "system-plan/F-LIVE-001/staging-manifest.json"}
source_lineage: {"imported_at": "2026-07-21T00:00:00Z", "origin_kind": "system-spec-harness", "source_digest": "13510cc39db4dfd200920fb418aa959781074b683c82f316e8de97fdde25f1de", "source_path": "system-spec/00-requirements-definition.md", "source_plugin": "system-spec-harness", "source_version": "0.1.0"}
classification_confidence: 1.0
classification_reason: "live-trial fixture の macro feature node"
classification_candidates: [{"artifact_kind": "feature", "candidate_path": "features/f-live-001.md", "confidence": 1.0}]
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

# live-trial fixture の確定 feature

live-trial fixture の固定 artifact。実 repository の成果物ではない。
