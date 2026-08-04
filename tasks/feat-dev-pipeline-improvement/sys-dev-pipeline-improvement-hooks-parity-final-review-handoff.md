---
graph_node_id: "task-hooks-entry-point-parity-final-review-handoff-20260804"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["plugin-governance","hooks","phase-13","final-review","qa-146"]
priority: "high"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "全 plugin hook parity 最終レビューの Phase 13 補助引継ぎ"
owners: ["daishiman"]
created_at: "2026-08-04T00:00:00Z"
updated_at: "2026-08-04T00:00:00Z"
status: "active"
depends_on: []
related_nodes: ["issue-hooks-entry-point-parity-generalization-20260728","feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow","spec-harness-hub-plugin-hook-governance-20260804"]
resource_scope: ["tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-hooks-parity-final-review-handoff.md","docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md","system-spec/dev-workflow.md","specs/harness-hub-plugin-hook-governance-addendum.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md"]
purpose: "HarnessHub-vf66 の実装・仕様反映・検証・公開前統合条件を、凍結済み P01..P13 を変えずに追跡する。"
goal: "Beads、issue node、仕様反映受領書、commit、draft PR が qa-146 の hook parity 契約を指す。"
scope_in: ["final review","仕様反映","品質ゲート","Beads と draft PR の追跡"]
scope_out: ["製品 API、DB schema、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["HK-001..003 の検査と回帰が pass","C01/C03 の qa-146 仕様反映が記録済み","PR 作成前の機械受領書が clean HEAD に束縛される"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-hooks-parity-final-review-handoff.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"89f42b29a1af7b635ec8534fe3bdf452d8f878309696305200484e0d2c8c4ec6","evaluator":"final-review + system-spec-harness compile (qa-146)","evidence_ref":"docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-04T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "凍結済み P13 本体の行数上限を越えず、vf66 と統合 qa-146 の最終条件だけを記録する補助 task。"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-hooks-parity-final-review-handoff.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# Phase 13 補助引継ぎ: 全 plugin hook parity の最終レビュー

- `HarnessHub-vf66` の最終レビューでは、hook 宣言・登録・実体の 3 者一致を全 plugin の必須ゲートへ一般化した。登録情報は `hooks/hooks.json` と manifest inline hooks の和で読み、HK-001..003 で fail-closed（不整合時に処理を止める）にする。
- 検査で見つけた harness-creator の未宣言 hook は台帳に追加し、skill-intake の手動 keychain 操作は `scripts/` へ移して自動 hook と混同しないようにした。検査が 500 行を超えたため、hook 判定 module を分離した。
- 反映先は `system-spec/dev-workflow.md` の qa-146、`specs/harness-hub-plugin-hook-governance-addendum.md`、`architecture/harness-hub-dev-workflow.md`、feature/changelog、仕様反映受領書である。異なる契約に同じ qa-143 が使われた競合は、C01 で qa-146 を発行して解消した。製品 API・DB・認証認可・UI・deploy unit は非変更である。
- 完了前に focused pytest、全 plugin 完全性、script naming、Python compile、shell syntax、task 仕様書ゲート、graph/schema gate を再実行する。Beads `HarnessHub-vf66`、issue node、commit、draft PR を相互に記録し、main merge 後に Beads を close する。

## 目的

凍結済み P01..P13 を変更せず、hook parity の統合レビューと公開前確認を一つの補助 handoff に記録する。

## 背景

最新 `main` の hook parity と本ブランチの live-trial 証跡選択が同じ qa-143 を別の意味で使用したため、C01 で qa-146 を確定した。

## 入力と前提条件

`system-spec/spec-state.json`、`system-spec/dev-workflow.md`、HK-001..003 の実装と回帰テスト、各仕様反映受領書が存在すること。

## 出力と成果物

qa-146 を参照する `system-spec/`、`specs/`、`architecture/`、feature/changelog、docs 受領書、dev-graph node、Beads 更新、draft PR を出力する。

## 依存関係

`issue-hooks-entry-point-parity-generalization-20260728`、`issue-required-heading-presence-validation-20260729`、および `arch-harness-hub-dev-workflow` に依存する。

## 実装対象

plugin hook の台帳・登録・実体の整合性検査、手動 script の `scripts/` への分離、QA ID の統合記録を対象とする。

## Write scope と競合制約

正規 writer が管理する `system-spec/` と `.dev-graph/state/graph.json` は C01/C03/C02 経路だけで変更する。既存の無関係差分は commit しない。

## GitHub publication

`devgraph/issue-required-heading-presence-validation-20260729` を `main` 向け draft PR #664 として更新し、目的・検証・qa-146・Beads・残課題を本文に記録する。

## 実行手順

1. 最新 `main` を本ブランチへマージし、競合を内容単位で統合する。
2. C01 で qa-146、C03 で正本投影、C02 で artifact と graph を更新する。
3. task 仕様書品質ゲート、テスト、CI 相当検査を実行し、commit・push・draft PR を確認する。

## 受入条件

HK-001..003 と live-trial evidence-selection が qa-146 を参照し、必須ゲートが pass、PR #664 が `main` に対して競合なしになる。

## 検証方法

focused pytest、`validate-plugin-completeness.py`、task 仕様書品質ゲート、C01/C03、graph schema、CI workflow の結果を確認する。

## リスクとロールバック

QA ID を再利用すると参照先が曖昧になるため、新 ID を使う。問題があればマージコミットを revert し、C01/C02/C03 の正規経路で再反映する。

## Handoff

残る citation provenance は `HarnessHub-yxb2`、task/issue conditional template resolver は `HarnessHub-yzv0` で追跡する。Beads `HarnessHub-vf66`、`HarnessHub-85z0`、`HarnessHub-3tw` の最終状態は push 後に更新する。
