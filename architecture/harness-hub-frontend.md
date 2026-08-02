---
graph_node_id: "arch-harness-hub-frontend"
artifact_kind: "architecture"
artifact_subtypes: ["frontend"]
project_id: "harness-hub"
domain: "frontend"
tags: ["system-spec-import","frontend"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub frontend アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-08-01T16:23:40Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-frontend.md"]
purpose: "Hub Web の frontend 構成 (Next.js App Router) と UI/UX 品質要件 (WCAG 2.2 AA / Core Web Vitals good / HIG 快適性原則) の正本参照"
goal: "qa-018 の品質要件と qa-007 の技術構成に適合する frontend 実装の指針を提供する"
scope_in: ["system-spec/frontend.md","system-spec/ui-ux.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-frontend.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1f9b092a0745dd2c31b3ed27aace2dc7242664fb5440afeea1f7cb3602b79ad8","evaluator":"validate-coverage-matrix.py","evidence_ref":"system-spec/spec-state.json"}
source_lineage: {"imported_at":"2026-08-01T16:23:40Z","origin_kind":"system-spec-harness","source_digest":"1f9b092a0745dd2c31b3ed27aace2dc7242664fb5440afeea1f7cb3602b79ad8","source_path":"system-spec/frontend.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-frontend.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-17T00:35:59Z","missing_sections":[],"status":"complete"}
---

# Harness Hub frontend アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/frontend.md](../system-spec/frontend.md) (sha256: `1f9b092a0745dd2c…`)
- [system-spec/ui-ux.md](../system-spec/ui-ux.md) (sha256: `d6d58903cbefc22a…`)

- confirmation: `confirmed` / evaluator: `validate-coverage-matrix.py` → **PASS** (`system-spec/spec-state.json`)
- 取込日時: 2026-08-01T16:23:40Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/frontend.md (Next.js 16 App Router + TypeScript + pnpm) と system-spec/ui-ux.md (WCAG 2.2 AA・CWV good・HIG 快適性)。doctrine anchor: Apple HIG + Clean Architecture。

## Context and drivers

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: frontend — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/frontend.md, system-spec/ui-ux.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 2026-08-01 dual catalog 実装反映

- `CatalogList` は入力値と適用済み query を分け、初回 1 回・submit 1 回につき 1 回だけ `CatalogPort` を呼ぶ。
- 一覧・詳細・Release 履歴の表示 cache は tenant/workspace/project key と一致する場合だけ描画する。
- 同一 scope の `degraded` は直近表示を維持できるが、401/403/契約不正では `ErrorState` のみとし、以前の内容や install descriptor を描画しない。
- 正本は [system-spec/frontend.md](../system-spec/frontend.md) の `qa-118`、セキュリティ境界は [security architecture](./harness-hub-security.md) を参照する。
