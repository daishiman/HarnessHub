---
graph_node_id: "spec-harness-hub-requirements"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["system-spec-import","platform"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub システム要件仕様 (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-07-23T00:04:30.693628Z"
status: "active"
depends_on: []
related_nodes: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-dev-workflow","arch-harness-hub-frontend","arch-harness-hub-infrastructure","arch-harness-hub-security"]
resource_scope: ["specs/harness-hub-system-specification.md"]
purpose: "非エンジニアの AI 自己解決の実現 (U1) に向けた Harness Hub の要件正本への参照点を dev-graph に固定する"
goal: "全 feature/task が U1-U9 と G1-G4 へトレースできる状態を維持する"
scope_in: ["system-spec/00-requirements-definition.md","system-spec/index.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-system-specification.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f5e022ed4ad5ae96201a72a25ee82969c9af29aefce9615c8c58fbad1932fbae","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-07-23T00:04:07Z","origin_kind":"system-spec-harness","source_digest":"f5e022ed4ad5ae96201a72a25ee82969c9af29aefce9615c8c58fbad1932fbae","source_path":"system-spec/00-requirements-definition.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-system-specification.md","confidence":0.95}]
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

# Harness Hub システム要件仕様 (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/00-requirements-definition.md](../system-spec/00-requirements-definition.md) (sha256: `6b24a06e4116a966…`)
- [system-spec/index.md](../system-spec/index.md) (sha256: `491539b244ee2436…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **FAIL** (`system-spec/completeness-report.json`、2026-07-22 実 fork 監査つき再評価。evaluated_digest `f5e022ed4ad5ae96…` = D7 反映後の正本。是正: doc_freshness 2 件 + D7 質疑証跡の補完後に再評価で pass へ復帰させる)
- 取込日時: 2026-07-18T08:10:00Z / plugin: system-spec-harness v0.1.0

## 目的と成功状態

要件の正本は system-spec/00-requirements-definition.md (U1-U9 憲法・意思決定 D1-D4) と各技術章。本 specification node は内容を複製せず正本を参照し、feature 分解の lineage 起点となる。

## スコープ

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 用語と主体

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## ユースケースとユーザーフロー

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 機能要件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 非機能要件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## UI・状態遷移

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## ビジネスルールと検証

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## API契約

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## データモデル

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 認証・認可

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## エラー・例外・回復

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## イベント・非同期処理

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 可観測性

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 互換性・移行・リリース

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## テストと受入条件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 未決事項

- なし (C05 完成度評価 PASS 時点)
