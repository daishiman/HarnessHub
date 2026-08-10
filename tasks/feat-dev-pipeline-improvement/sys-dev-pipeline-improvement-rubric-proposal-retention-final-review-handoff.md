---
graph_node_id: "task-rubric-proposal-retention-final-review-handoff-20260810"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["harness-creator","rubric-governance","phase-13","final-review"]
priority: "low"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "rubric 自動生成提案の保持と human review 引継ぎの Phase 13 補助記録"
owners: ["daishiman"]
created_at: "2026-08-10T00:00:00Z"
updated_at: "2026-08-10T00:00:00Z"
status: "active"
depends_on: []
related_nodes: ["issue-rubric-proposal-20260806-review","feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow","spec-harness-hub-system-specification-implementation-writebacks","doc-rubric-proposal-retention-spec-reflection-receipt-20260810"]
resource_scope: ["tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-rubric-proposal-retention-final-review-handoff.md","plugins/harness-creator/skills/run-skill-rubric-governance/proposals/2026-08-06-rubric-update.md","issues/harness-rubric-proposal-20260806-review.md","docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md","features/feat-dev-pipeline-improvement.md","specs/harness-hub-system-specification-implementation-writebacks.md","architecture/harness-hub-dev-workflow.md"]
purpose: "凍結済み P01..P13 を変更せず、rubric draft の保存、仕様影響判断、品質ゲート、Beads と draft PR の引継ぎを追跡する。"
goal: "提案の保存完了と human triage 未完了が混同されず、全追跡 ID と受領書が同じ境界を指す。"
scope_in: ["最終 review","仕様影響判断","品質ゲート","Beads と draft PR の追跡"]
scope_out: ["rubric 本体の改訂","25 findings の採否判断","製品 API、DB、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["task 仕様書と graph schema の品質ゲートが PASS","製品非変更と既存 dev-workflow 契約の適用理由が受領書に記録される","Beads HarnessHub-lzfs を open のまま draft PR へ相互参照する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-rubric-proposal-retention-final-review-handoff.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a59167f56cb81990694b092ca64d8a9a80f0ce409917f0bdf21190810a450d8d","evaluator":"final-review + task-specification-creator quality gate","evidence_ref":"docs/features/feat-dev-pipeline-improvement/rubric-proposal-retention-final-review-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-10T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "凍結済み exact-13 の P13 を手編集せず、今回の公開前統合条件だけを記録する補助 task。"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-rubric-proposal-retention-final-review-handoff.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-10T00:00:00Z","missing_sections":[],"status":"complete"}
---

# Phase 13 補助引継ぎ: rubric 自動生成提案の保持と human review

## 目的

2026-08-06 の rubric 更新提案を失わない形で保存し、提案の保存完了と人による採否判断の未完了を明確に分離する。

## 背景

`aggregate-evals.py` が生成した draft は改善候補の証拠だが、それ自体は採用・棄却・保留の決定ではない。未追跡のままでは改善 loop が閉じない一方、保存しただけで完了扱いにすると未判断の 25 findings が隠れる。

## 入力と前提条件

提案ファイル、Beads `HarnessHub-lzfs`、dev-graph `issue-rubric-proposal-20260806-review`、既存 `system-spec/dev-workflow.md` の P13 write-back / scope separation 契約を入力とする。

## 実装対象

提案ファイルの履歴保存、issue・Beads の linkage、層別文書、仕様反映受領書、品質ゲート、draft PR を対象とする。25 findings の triage と rubric 本体の変更は対象外とする。

## 実行手順

1. `git status` と `origin/main...HEAD` の差分から対象ファイルを確定する。
2. 最新 `main` をローカル `main`、続いて本 branch へマージする。
3. task 仕様書、graph、文書、focused governance gate を再実行する。
4. 製品非変更と既存契約の適用理由を受領書へ記録する。
5. 対象ファイルだけを commit / push し、正しい base へ draft PR を作る。
6. PR を Beads notes へ追記し、human triage が残るため issue は open のまま維持する。

## 出力と成果物

追跡済み proposal、issue / graph / Beads linkage、層別文書、品質ゲート結果、HEAD 束縛の仕様反映受領書、draft PR を成果物とする。

## 依存関係

`feat-dev-pipeline-improvement`、`arch-harness-hub-dev-workflow`、`spec-harness-hub-system-specification-implementation-writebacks` に依存する。

## Write scope と競合制約

frontmatter の `resource_scope` と本 review の対象差分だけを書き、無関係な既存差分を stage / commit しない。`system-spec/spec-state.json` は legacy schema 1.0 の read-only 境界を維持し、全 matrix の再ヒアリングを伴う migration は本作業へ混ぜない。

## 受入条件

- task 仕様書品質ゲートと graph schema が PASS する。
- 製品 API、DB schema、認証認可、UI、Cloudflare deploy unit、rubric 本体が非変更である。
- Beads `HarnessHub-lzfs` と issue node が proposal / receipt / PR を指し、human triage 未完了を保持する。

## 検証方法

repository の risk-tier selector、task package validator、graph schema、content review、line limit、`git diff --check` を MVP 深度で実行する。

## リスクとロールバック

最大リスクは、提案の保存を採否完了と誤認して issue を閉じることである。問題時は文書・linkage commit を revert し、Beads は open のまま維持する。proposal 内容を破棄しない。

## GitHub publication

PR 本文へ目的、変更、検証、仕様反映、Beads ID、dev-graph node ID、残課題を記載し、draft として公開する。

## Handoff

PR の review / merge 後も `HarnessHub-lzfs` を自動 close しない。25 findings の全件分岐と proposal status 更新後に、別の human review で close 可否を判断する。
