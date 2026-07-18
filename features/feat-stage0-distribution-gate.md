---
graph_node_id: feat-stage0-distribution-gate
artifact_kind: feature
artifact_subtypes: []
title: Stage 0: 配布経路 technical gate (H7) 検証
project_id: harness-hub
domain: platform
status: draft
priority: high
start_date: null
target_date: null
iteration: Stage 0
owners: ["daishiman"]
tags: ["macro-feature", "stage-0", "platform"]
file_path: features/feat-stage0-distribution-gate.md
template_id: feature
template_version: 1.0.0
confirmation_status: draft
evaluation_status: pending
confirmation_evidence: {"evaluator": null, "evidence_ref": null, "evaluated_digest": null}
source_lineage: {"origin_kind": "generated", "source_plugin": "dev-graph", "source_path": "specs/harness-hub-system-specification.md", "source_version": null, "source_digest": null, "imported_at": "2026-07-17T00:38:30Z"}
created_at: 2026-07-17T00:38:30Z
updated_at: 2026-07-17T00:38:30Z
depends_on: []
related_nodes: []
resource_scope: ["features/feat-stage0-distribution-gate.md"]
purpose: Stage 1 へ投資する前に、Skill 配布の成立経路 (URL 型 marketplace / npm source / Bootstrap Installer) と Windows 実機 E2E を検証し、成立経路を確定する (仮説 H7)
goal: 最小 artifact で 2 経路以上の配布検証が完了し、採用経路が根拠付きで記録された状態
scope_in: ["URL 型 marketplace 検証", "npm source 検証 (公式サポート確認済み)", "Bootstrap Installer 試作", "Windows/macOS 実機 E2E", "採用経路の決定記録"]
scope_out: ["Hub 本体の実装", "課金・商用配布"]
acceptance: ["2 経路以上の実機検証記録が存在する", "採用経路が decision record として登録される", "Windows E2E が成功する"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.9
classification_reason: C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)
classification_candidates: [{"artifact_kind": "feature", "confidence": 0.9, "candidate_path": "features/feat-stage0-distribution-gate.md"}]
tracker_binding: beads
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "open", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "incomplete", "missing_sections": ["13-task package 未生成 (system-dev-planner 待ち)"], "checked_at": "2026-07-17T00:38:30Z"}
---

# Stage 0: 配布経路 technical gate (H7) 検証

> Stage 0 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

Stage 1 へ投資する前に、Skill 配布の成立経路 (URL 型 marketplace / npm source / Bootstrap Installer) と Windows 実機 E2E を検証し、成立経路を確定する (仮説 H7)

## 到達状態

最小 artifact で 2 経路以上の配布検証が完了し、採用経路が根拠付きで記録された状態

## スコープ

**対象 (in):**

- URL 型 marketplace 検証
- npm source 検証 (公式サポート確認済み)
- Bootstrap Installer 試作
- Windows/macOS 実機 E2E
- 採用経路の決定記録

**対象外 (out):**

- Hub 本体の実装
- 課金・商用配布

## 受入

- 2 経路以上の実機検証記録が存在する
- 採用経路が decision record として登録される
- Windows E2E が成功する

## アーキテクチャ参照

- [arch-harness-hub-infrastructure](../architecture/harness-hub-infrastructure.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- なし

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
