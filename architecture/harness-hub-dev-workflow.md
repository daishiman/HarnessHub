---
graph_node_id: "arch-harness-hub-dev-workflow"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-spec-import","dev-workflow"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub dev-workflow アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-18T08:10:00Z"
updated_at: "2026-08-02T05:27:08Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-infrastructure"]
resource_scope: ["architecture/harness-hub-dev-workflow.md"]
purpose: "Hub 本体の開発フロー、作者ローカル環境規律、MVP ファースト判断軸、C02/C11 の安全境界、live-trial session 環境隔離、検査対象 0 件と CI/local 呼び出し parity、および外部参考層と能動 plugin の所有境界を参照する"
goal: "qa-038/qa-039/qa-066/qa-067/qa-069/qa-090/qa-092/qa-096/qa-102/qa-122 の確定内容に適合し、C11 artifact readiness、C02 document parity、tmux session 環境隔離、CI/local 品質ゲート、consumer-owned reference の境界を情報欠落なく提供する"
scope_in: ["system-spec/dev-workflow.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-dev-workflow.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f365125fc467dc03f961f07c03a206bd43b0202714abaa0c31da784df195763b","evaluator":"codex-final-review + merge-reconciliation","evidence_ref":"system-spec/dev-workflow.md"}
source_lineage: {"imported_at":"2026-08-02T05:27:08Z","origin_kind":"system-spec-harness","source_digest":"f365125fc467dc03f961f07c03a206bd43b0202714abaa0c31da784df195763b","source_path":"system-spec/dev-workflow.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-dev-workflow.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-18T08:10:00Z","missing_sections":[],"status":"complete"}
---

# Harness Hub dev-workflow アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/dev-workflow.md](../system-spec/dev-workflow.md) (sha256: `f365125fc467…` (完全値は frontmatter source_lineage.source_digest))

- confirmation: `confirmed` / evaluator: `codex-final-review + merge-reconciliation` → **PASS**
  ([dc7 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/dc7-bd-free-field-write-route-spec-reflection-receipt.md) / [参考層クリーンアップ受領書](../docs/features/feat-doc-governance-portability/aiworkflow-reference-cleanup-spec-reflection-receipt.md))
- 取込日時: 2026-08-02T05:27:08Z / plugin: system-spec-harness v0.1.0

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

## Beads bridge の内部コンポーネント境界 (2026-08-01)

`bd-bridge.py` は Beads mutation の唯一の CLI 境界として残し、内部ロジックを
`contracts` / `graph` / `projection` / `audit` の四 component へ分離する。
`contracts` と `graph` は Beads へ書かず、`audit` も read-only、書込投影は
`projection` だけが担う。外部 I/O を持つ関数は `bd=` / `git=` を注入され、
CLI adapter が呼出時に実行関数を解決する。この境界により、単一チョークポイントを
維持したまま各ファイルを 500 行以下へ保つ。

詳細な責務、互換性、不変条件、検証証拠は
[仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/w7n7-bd-bridge-split-spec-reflection-receipt.md)
を正とする。

## Beads 自由フィールドの書込境界 (2026-08-02)

`priority`、`assignee`、`labels` は Dev Graph parity の対象外だが、書込 authority は
他の mutation と同じ C28 bridge に限定する。C10 guard は直接 `bd update` を一律遮断し、
CLI adapter は引数解析と receipt、`bd_bridge_contracts.py` は許可 exact-set・priority と
labels の正規化を担う。labels は `--set-labels` への全置換だけを許し、順序依存の
add/remove を契約面から排除する。設計判断と検証証拠は
[dc7 仕様反映受領書](../docs/features/feat-dev-pipeline-improvement/dc7-bd-free-field-write-route-spec-reflection-receipt.md)
を正とする。

> **変更履歴**: 2026-07-21〜2026-08-01 の差分追記は
> [harness-hub-dev-workflow-changelog.md](../docs/features/feat-dev-pipeline-improvement/harness-hub-dev-workflow-changelog.md)
> へ分割済み (300 行上限超過による remediation)。新規の差分追記は同ファイルへ追記する。

## 外部参考層と能動 plugin の所有境界 (2026-08-02)

`doc/参考Skill/` は比較・移管用の参考層とし、実行時に使う契約は consumer plugin の
`references/` と resource map が所有する。旧参考 Skill を削除するときは、利用中の契約を
所有先へ履歴付きで移し、能動参照 0 件・到達可能性・復元経路を同じ変更で検証する。
製品 runtime の component 境界は変えない。詳細は `system-spec/dev-workflow.md` の
`qa-122` と [仕様反映受領書](../docs/features/feat-doc-governance-portability/aiworkflow-reference-cleanup-spec-reflection-receipt.md)
を正とする。
