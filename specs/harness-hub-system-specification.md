---
graph_node_id: spec-harness-hub-requirements
artifact_kind: specification
artifact_subtypes: []
title: Harness Hub システム要件仕様 (system-spec 取込)
project_id: harness-hub
domain: platform
status: active
priority: high
start_date: null
target_date: null
iteration: null
owners: ["daishiman"]
tags: ["system-spec-import", "platform"]
file_path: specs/harness-hub-system-specification.md
template_id: specification
template_version: 1.0.0
confirmation_status: confirmed
evaluation_status: fail
confirmation_evidence: {"evaluated_digest": "f5e022ed4ad5ae96201a72a25ee82969c9af29aefce9615c8c58fbad1932fbae", "evaluator": "assign-system-spec-completeness-evaluator", "evidence_ref": "system-spec/completeness-report.json"}
source_lineage: {"imported_at": "2026-07-18T08:10:00Z", "origin_kind": "system-spec-harness", "source_digest": "6b24a06e4116a9665e1cd6f7a978918010599f51c2c5faf0aedf7ca7ce88fc15", "source_path": "system-spec/00-requirements-definition.md", "source_plugin": "system-spec-harness", "source_version": "0.1.0"}
created_at: 2026-07-17T00:35:59Z
updated_at: 2026-07-22T08:15:00Z
depends_on: []
related_nodes: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-infrastructure", "arch-harness-hub-dev-workflow"]
resource_scope: ["specs/harness-hub-system-specification.md"]
purpose: 非エンジニアの AI 自己解決の実現 (U1) に向けた Harness Hub の要件正本への参照点を dev-graph に固定する
goal: 全 feature/task が U1-U9 と G1-G4 へトレースできる状態を維持する
scope_in: ["system-spec/00-requirements-definition.md", "system-spec/index.md"]
scope_out: ["\u6b63\u672c\u7ae0\u306e\u5185\u5bb9\u8907\u88fd", "\u672a\u78ba\u5b9a\u7ae0\u306e\u53d6\u8fbc"]
acceptance: ["\u6b63\u672c\u7ae0\u304c confirmed \u304b\u3064 evaluator PASS", "source_digest \u304c\u6b63\u672c\u3068\u4e00\u81f4"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
classification_confidence: 0.95
classification_reason: system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)
classification_candidates: [{"artifact_kind": "specification", "confidence": 0.95, "candidate_path": "specs/harness-hub-system-specification.md"}]
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
