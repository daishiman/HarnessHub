---
graph_node_id: arch-harness-hub-dev-workflow
artifact_kind: architecture
artifact_subtypes: ["infrastructure"]
title: Harness Hub dev-workflow アーキテクチャ (system-spec 取込)
project_id: harness-hub
domain: dev-workflow
status: active
priority: high
start_date: null
target_date: null
iteration: null
owners: ["daishiman"]
tags: ["system-spec-import", "dev-workflow"]
file_path: architecture/harness-hub-dev-workflow.md
template_id: architecture
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: pass
confirmation_evidence: {"evaluated_digest": "afae654e837de71247b60defbfc0321d472a6312fba5e04d9d61ce96019ff0ab", "evaluator": "assign-system-spec-completeness-evaluator", "evidence_ref": "eval-log/run-system-spec-compile-c05-aggregate-20260718.json"}
source_lineage: {"imported_at": "2026-07-18T08:10:00Z", "origin_kind": "system-spec-harness", "source_digest": "afae654e837de71247b60defbfc0321d472a6312fba5e04d9d61ce96019ff0ab", "source_path": "system-spec/dev-workflow.md", "source_plugin": "system-spec-harness", "source_version": "0.1.0"}
created_at: 2026-07-18T08:10:00Z
updated_at: 2026-07-18T08:10:00Z
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-infrastructure"]
resource_scope: ["architecture/harness-hub-dev-workflow.md"]
purpose: Hub 本体の開発フロー (GitHub Flow + PR 必須・required status checks・PR preview + production 環境・main merge 自動デプロイ・expand/contract migration) と作者ローカル環境規律 (macOS 主/Windows 従・CI と同一の pnpm verify・本番操作の CI 一本化) の正本参照
goal: qa-038/qa-039 の確定内容 (C1/C2 制約下の開発・CI/CD・リリースフロー) に適合する開発運用の指針を提供する
scope_in: ["system-spec/dev-workflow.md"]
scope_out: ["正本章の内容複製", "未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS", "source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.95
classification_reason: system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)
classification_candidates: [{"artifact_kind": "architecture", "confidence": 0.95, "candidate_path": "architecture/harness-hub-dev-workflow.md"}]
tracker_binding: none
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "not_applicable", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "complete", "missing_sections": [], "checked_at": "2026-07-18T08:10:00Z"}
---

# Harness Hub dev-workflow アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/dev-workflow.md](../system-spec/dev-workflow.md) (sha256: `afae654e837de712…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS_WITH_FINDINGS** (`eval-log/run-system-spec-compile-c05-aggregate-20260718.json`)
- 取込日時: 2026-07-18T08:10:00Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/dev-workflow.md (qa-038: GitHub Flow + PR 必須・required status checks 8 種・PR preview + production・main merge 自動デプロイ・expand/contract migration 強制 / qa-039: 作者ローカル環境 macOS 主・Windows 従・CI と同一の pnpm verify・本番操作の CI 一本化)。

## Context and drivers

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: infrastructure — 詳細は正本章を参照 (複製しない)。dev-workflow は CI/CD・デプロイ・環境戦略を扱うため infrastructure subtype に分類 (schema の subtype enum に dev-workflow が無いための写像。domain=dev-workflow が実態を表す)

## Architecture decisions

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/dev-workflow.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。
