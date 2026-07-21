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
confirmation_evidence: {"evaluated_digest": "c8f21b091cfc28b29992454908c3281ff519dce8535f3629c6fddc156ccd543f", "evaluator": "assign-system-spec-completeness-evaluator", "evidence_ref": "system-spec/completeness-report.json"}
source_lineage: {"imported_at": "2026-07-18T15:40:17Z", "origin_kind": "system-spec-harness", "source_digest": "c8f21b091cfc28b29992454908c3281ff519dce8535f3629c6fddc156ccd543f", "source_path": "system-spec/dev-workflow.md", "source_plugin": "system-spec-harness", "source_version": "0.1.0"}
created_at: 2026-07-18T08:10:00Z
updated_at: 2026-07-18T15:40:17Z
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-infrastructure"]
resource_scope: ["architecture/harness-hub-dev-workflow.md"]
purpose: Hub 本体の開発フロー (GitHub Flow + PR 必須・required status checks・PR preview + production 環境・main merge 自動デプロイ・expand/contract migration)、作者ローカル環境規律、features README と 11 requirements-baseline の派生正本境界を参照する
goal: qa-038/qa-039/qa-066 の確定内容に適合し、P0〜P5 の開発運用と feature baseline の source lineage を逆引きできる指針を提供する
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

- [system-spec/dev-workflow.md](../system-spec/dev-workflow.md) (sha256: `c8f21b091cfc28b2…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`system-spec/completeness-report.json`)
- 取込日時: 2026-07-18T15:40:17Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/dev-workflow.md (qa-038: GitHub Flow + PR 必須・required status checks 8 種・PR preview + production・main merge 自動デプロイ・expand/contract migration 強制 / qa-039: 作者ローカル環境 macOS 主・Windows 従・CI と同一の pnpm verify・本番操作の CI 一本化 / qa-066: features README と 11 requirements-baseline を P0〜P5 の派生投影として参照し、循環する二重正本を作らない)。

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

### 差分追記 (2026-07-21): 検証証跡の真正性リスク

live-trial 証跡の調査 (`HarnessHub-s7b`/`-rix`/`-aoe`/`-m7d`) で、**成果物だけを見る検査では「実行した」と「実行したことにした」を区別できない**というリスクが実測された。同一構造の抜け道が別々の局面で 3 回選ばれている (digest 単独書き換え / 下位 script 直叩き / registration receipt 偽造)。

本リスクは製品 (Harness Hub) の仕様ではなく**リポジトリ内の開発ツール統治**に属するため、正本章へは逆輸入しない (`system-spec/dev-workflow.md` qa-066 の「下流投影を system-spec へ逆輸入して二重正本にしない」原則)。詳細と実務ルールは次を参照する。

- [`doc/evidence-integrity-practices.md`](../doc/evidence-integrity-practices.md) — 3 局面の記録、4 つの教訓 (指標の独立性 / 充足可能性の担保 / 改竄と訂正の同型性 / 検証主体の分離)、導入した検証入口とその限界

検証入口 (いずれも read-only):

| 入口 | 検出対象 |
|---|---|
| `register-package.py validate-receipt` | registration receipt の手書き・事後改変 |
| `run-skill-live-trial/scripts/validate-goal-seek-evidence.py` | `goal_seek` 実行契約の省略 |
| `lint-live-trial-verdict.py --check-provenance` | commit 差分での digest 単独書き換え |
