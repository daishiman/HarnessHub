---
graph_node_id: arch-harness-hub-security
artifact_kind: architecture
artifact_subtypes: ["security"]
title: Harness Hub security アーキテクチャ (system-spec 取込)
project_id: harness-hub
domain: security
status: active
priority: high
start_date: null
target_date: null
iteration: null
owners: ["daishiman"]
tags: ["system-spec-import", "security"]
file_path: architecture/harness-hub-security.md
template_id: architecture
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: pass
confirmation_evidence: {"evaluated_digest": "30c3035180c916f7745831b8b1dc1b690ebc528cb8ca054001cfd1805a6387e6", "evaluator": "assign-system-spec-completeness-evaluator", "evidence_ref": "system-spec/completeness-report.json"}
source_lineage: {"imported_at": "2026-07-18T08:10:00Z", "origin_kind": "system-spec-harness", "source_digest": "30c3035180c916f7745831b8b1dc1b690ebc528cb8ca054001cfd1805a6387e6", "source_path": "system-spec/security.md", "source_plugin": "system-spec-harness", "source_version": "0.1.0"}
created_at: 2026-07-17T00:35:59Z
updated_at: 2026-07-18T08:10:00Z
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-infrastructure"]
resource_scope: ["architecture/harness-hub-security.md"]
purpose: deny-by-default (Tenant/Workspace スコープ強制 = D4 row-level-scope)・Auth.js マルチテナント OIDC・Device Flow の正本参照
goal: qa-005/qa-006/qa-008/qa-020 の確定要件に適合する認証・認可・分離テストの指針を提供する
scope_in: ["system-spec/security.md", "system-spec/auth.md"]
scope_out: ["\u6b63\u672c\u7ae0\u306e\u5185\u5bb9\u8907\u88fd", "\u672a\u78ba\u5b9a\u7ae0\u306e\u53d6\u8fbc"]
acceptance: ["\u6b63\u672c\u7ae0\u304c confirmed \u304b\u3064 evaluator PASS", "source_digest \u304c\u6b63\u672c\u3068\u4e00\u81f4"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.95
classification_reason: system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)
classification_candidates: [{"artifact_kind": "architecture", "confidence": 0.95, "candidate_path": "architecture/harness-hub-security.md"}]
tracker_binding: none
beads_linkage: null
github_publication: {"mode": "local_only", "project_aliases": [], "labels": [], "milestone": null}
issue_linkage: null
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"policy": "manual", "status": "not_applicable", "source": null, "completed_at": null, "reconciled_at": null, "evidence_refs": []}
implementation_readiness: {"status": "complete", "missing_sections": [], "checked_at": "2026-07-17T00:35:59Z"}
---

# Harness Hub security アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/security.md](../system-spec/security.md) (sha256: `30c3035180c916f7…`)
- [system-spec/auth.md](../system-spec/auth.md) (sha256: `8735c8860019ecb8…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`system-spec/completeness-report.json`)
- 取込日時: 2026-07-18T08:10:00Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/security.md と system-spec/auth.md。認可の単一ミドルウェア集約、secret は環境 binding のみ、OS 資格情報域への token 保存 (qa-008)。doctrine anchor: OWASP ASVS + Secrets Management。

## Context and drivers

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: security — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/security.md, system-spec/auth.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

