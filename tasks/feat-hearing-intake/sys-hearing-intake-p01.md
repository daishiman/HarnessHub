---
artifact_kind: task
artifact_subtypes: []
beads_linkage: null
classification_candidates: [{"artifact_kind": "task", "candidate_path": "tasks/feat-hearing-intake/sys-hearing-intake-p01.md", "confidence": 0.92}]
classification_confidence: 0.92
classification_reason: goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-hearing-intake.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク
completion_evidence: {"completed_at": null, "evidence_refs": [], "policy": "linked_pr_merged_all", "reconciled_at": null, "source": null, "status": "in_progress"}
confirmation_evidence: {"evaluated_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "evaluator": "system-dev-plan-evaluator", "evidence_ref": ".dev-graph/plans/feature-package-feat-hearing-intake/plan-findings.json"}
confirmation_status: confirmed
created_at: 2026-07-17T12:34:33Z
depends_on: []
domain: documentation
evaluation_status: pass
execution_contexts: []
feature_package_id: feature-package/feat-hearing-intake
file_path: tasks/feat-hearing-intake/sys-hearing-intake-p01.md
github_project_linkages: []
github_publication: {"labels": [], "milestone": null, "mode": "local_only", "project_aliases": []}
graph_node_id: SYS-HEARING-INTAKE-P01
implementation_readiness: {"checked_at": "2026-07-17T00:00:00Z", "missing_sections": [], "status": "complete"}
issue_linkage: null
iteration: null
owners: ["daishiman"]
parent_feature: feat-hearing-intake
phase_ref: P01
priority: null
project_id: feature-package-feat-hearing-intake
pull_request_linkages: []
related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
resource_scope: ["docs/features/feat-hearing-intake/requirements-baseline.md"]
source_lineage: {"imported_at": "2026-07-17T12:34:33Z", "origin_kind": "system-dev-planner", "source_digest": "ee4bc2d03879b6b4a94328c582b3c45f0db43b6222cf83eeb3fe90ed2d8332cf", "source_path": ".dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-01-requirements.md", "source_plugin": "system-dev-planner", "source_version": "0.1.0"}
start_date: null
status: active
tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "requirements-baseline"]
target_date: null
template_id: task
template_version: 1.0.0
title: ヒアリング intake 要件ベースライン確定
tracker_binding: beads
updated_at: 2026-07-17T12:34:33Z
purpose: feat-hearing-intake の P01 を実行する: ヒアリング intake 要件ベースライン確定
goal: feat-hearing-intake の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (S10-S12 のスコープ・受入基準・10 件の quality_constraints) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が machine-verifiable な baseline 文書として固定される。
scope_in: ["docs/features/feat-hearing-intake/requirements-baseline.md"]
scope_out: ["AI 実行基盤のサーバ側実装 (D5 で不採用。goal-spec scope_out)", "構築工程の進行管理 (feat-build-pipeline-board。goal-spec scope_out)", "試算エンジン本体 (annualHours・分/回・削減率を用いた実際の削減額計算) の要件確定 (owner 未確定の上流論点。本 feature は TenantCoefficient 係数の読取消費のみを要件とする)", "認証方式・role 体系の要件確定 (feat-auth-tenancy の scope)", "実装コードの作成 (本 task は要件確定のみ)"]
acceptance: ["docs/features/feat-hearing-intake/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 10 件が過不足なく転記されている"]
architecture_refs: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
---

# ヒアリング intake 要件ベースライン確定

> task projection (P01 / parent: feat-hearing-intake)。本文の正本は published task spec であり、ここには複製しない。

## 正本仕様書

- `.dev-graph/plans/feature-package-feat-hearing-intake/task-specs/phase-01-requirements.md`

## 依存

- なし (feature 内の先頭 phase)

## 実行

- claim: bd 側 issue を claim し、並行時は worktree lease を取得する
- 完了: 正本仕様書の Verification and evidence を満たし bd close (SYS-HEARING-INTAKE-P01)
