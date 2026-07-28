---
graph_node_id: "arch-harness-hub-data"
artifact_kind: "architecture"
artifact_subtypes: ["data"]
project_id: "harness-hub"
domain: "data"
tags: ["system-spec-import","data"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub data アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-07-26T08:35:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-data.md"]
purpose: "Turso Free (libSQL) + Drizzle ORM control-plane DB と D1 退避経路 (D2 ヘッジ)・SRE バックアップ検証の正本参照"
goal: "qa-004/qa-019 の確定要件 (SQLite 方言互換・日次 export・restore drill) に適合する data 層の指針を提供する"
scope_in: ["system-spec/database.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-data.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"0cc8dee51613b54e967eef00f320ff8b1423f064efe951d811562b246a38b8a1","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-07-26T08:35:00Z","origin_kind":"system-spec-harness","source_digest":"44731a240f143b9e386d165ca8706ebda887262bbd634d02681d2f06ec3a6239","source_path":"system-spec/database.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-data.md","confidence":0.95}]
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

# Harness Hub data アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/database.md](../system-spec/database.md) (sha256: `44731a240f143b9e…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`system-spec/completeness-report.json`)
- 再取込日時: 2026-07-26T08:35:00Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/database.md。Turso Free + Drizzle (D1 両対応で退避経路温存)、R2 = immutable PackageRegistry、日次 export + 四半期 restore drill (qa-019)。doctrine anchor: Clean Architecture (data-access) + Google SRE (reliability)。

## Context and drivers

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: data — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-26 / HarnessHub-b7ng)**:

- `user_workspaces` の主キーを `(tenant_id,user_id,workspace_id)` とし、別 tenant の同一 ID 組を許容する。
- Device Flow / refresh token の状態遷移は DB の CAS へ集約し、新規認証 write は競合ゲートを通す。
- ローカル libSQL のゲートは process 内だけで共有し、Workers の Turso/D1 は要求間 Promise を共有しない。
- 旧 publisher token は Workspace 帰属を復元できないため移送せず、Device Flow 再認証で再発行する。

## Delivery, migration and rollback

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。
