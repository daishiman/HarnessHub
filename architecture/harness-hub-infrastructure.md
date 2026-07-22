---
graph_node_id: "arch-harness-hub-infrastructure"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "infrastructure"
tags: ["system-spec-import","infrastructure"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub infrastructure アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-07-21T14:18:05Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-infrastructure.md"]
purpose: "Cloudflare Workers 一体型 (OpenNext) + 無料枠運用・SLO 99.5%・エラーバジェット・監視/ポストモーテム運用の正本参照"
goal: "qa-003/qa-011/qa-019/qa-068 の確定要件 (D7: 常設 staging なし・production 1 組 + 使い捨て preview) に適合する infrastructure/運用の指針を提供する"
scope_in: ["system-spec/infrastructure.md","system-spec/maintenance-ops.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-infrastructure.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d5897caae208aba38b8a0e8d5bbd8b282caf6d7b54ffd9a10c1625b5f4d02b76","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260721-231238.json"}
source_lineage: {"imported_at":"2026-07-21T14:18:05Z","origin_kind":"system-spec-harness","source_digest":"d5897caae208aba38b8a0e8d5bbd8b282caf6d7b54ffd9a10c1625b5f4d02b76","source_path":"system-spec/infrastructure.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-infrastructure.md","confidence":0.95}]
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

# Harness Hub infrastructure アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/infrastructure.md](../system-spec/infrastructure.md) (sha256: `15a91e7e243c3558…`)
- [system-spec/maintenance-ops.md](../system-spec/maintenance-ops.md) (sha256: `0329c87bf2e5be42…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`system-spec/completeness-report.json`)
- 取込日時: 2026-07-18T15:01:04Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/infrastructure.md と system-spec/maintenance-ops.md。Workers Free (3MiB 制限)・R2/D1 無料枠・GitHub Actions CI/CD (pnpm 強制)・SLO 99.5% + エラーバジェット (qa-019)。doctrine anchor: Google SRE。

## Context and drivers

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: infrastructure — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。
