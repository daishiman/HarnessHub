---
graph_node_id: "task-live-trial-evidence-selection-handoff-20260804"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["dev-graph","live-trial","criteria-receipt","phase-13"]
priority: "high"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "live-trial evidence selection の Phase 13 handoff を記録する"
owners: ["daishiman"]
created_at: "2026-08-04T07:20:00Z"
updated_at: "2026-08-10T00:00:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow","issue-required-heading-presence-validation-20260729"]
resource_scope: ["tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-live-trial-evidence-selection-handoff.md","scripts/lint-live-trial-verdict.py","scripts/receiptguard_helper.py","docs/features/feat-dev-pipeline-improvement/live-trial-evidence-selection-spec-reflection-receipt.md","docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md","system-spec/dev-workflow.md"]
purpose: "P13 の補助 handoff として、criteria receipt が指す fresh live-trial 証跡を CI が選ぶ条件と C02 scanner の精度境界を追跡可能にする"
goal: "main 向け Draft PR が fresh evidence、Beads、検証結果を同じ参照先へ結び、時計ずれによる stale verdict 誤選択を再発させず、不正 receipt を legacy fallback で隠さない"
scope_in: ["criteria receipt verdict selection","C02 receipt mutation scanner","fresh live-trial evidence","仕様反映受領書"]
scope_out: ["製品 API、DB schema、認証認可、UI、Cloudflare deploy unit","過去 live-trial run の削除または書換え"]
acceptance: ["criteria receipt が指す verdict を優先し、不正 ref は fail-closed になる","receipt 名だけを含む evidence 書込みは C02 bypass にならない","本 handoff と PR 本文が current main の正本と Beads を参照する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-live-trial-evidence-selection-handoff.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"db16d677ab51ca14f8d75f55a7132c446b1c7401bf78682c8add3c58e2a70589","evaluator":"2026-08-10 final-review (current main rebase)","evidence_ref":"docs/features/feat-dev-pipeline-improvement/live-trial-evidence-selection-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-04T07:20:00Z","origin_kind":"manual","source_digest":null,"source_path":"system-spec/dev-workflow.md","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "P13 本体を 300 行の上限内に保ち、CI evidence-selection の統合条件だけを単一責務で記録する補助 task である"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-live-trial-evidence-selection-handoff.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-04T07:20:00Z","missing_sections":[],"status":"complete"}
---

# 目的

criteria receipt が採用した fresh live-trial verdict を CI が検査し、時計ずれによる stale verdict の誤選択を止める。

## 背景

旧 branch 内の qa-145 / qa-146 は current `main` では別の製品機能へ再採番済みであり、本 handoff の正本ではない。今回の evidence-selection は repository tooling 内部の fail-closed 契約として、詳細を docs/features/feat-dev-pipeline-improvement/live-trial-evidence-selection-spec-reflection-receipt.md に記録する。

## 入力と前提条件

- 入力: criteria-test/scenario-verdict.json と live-trial verdict 一式。
- 前提: verdict は append-only で保持される。

## 出力と成果物

- 生成物: 本 handoff と Draft PR の検証記録。
- 更新対象: criteria receipt、品質ゲート、仕様反映受領書。

## 依存関係

- `depends_on`: なし。
- ブロッカー: receipt ref が不正なら CI が fail-closed で停止する。

## 実装対象

- Frontend: N/A: repository tooling only。
- Backend/API: N/A: repository tooling only。
- Database/Data: N/A: repository tooling only。
- Infrastructure: CI quality gate。
- Security/Privacy: C02 writer bypass detection。
- Documentation: 本受領書と current-main 再統合判断。

## Write scope と競合制約

- `touches`: scripts/、eval-log/、docs/、tasks/。
- 排他資源: .dev-graph/state/graph.json は C02 writer のみ。
- 並列実行条件: run-id と owner PID が一致する session だけを cleanup する。
- branch: devgraph/issue-required-heading-presence-validation-20260729。
- worktree lease: canonical graph 更新前に C02 transaction を使用する。
- completion projection: main reconciliation 後に PR/Beads を記録する。

## GitHub publication

- Mode: local_only。
- Project aliases: N/A: publication project is not used.
- Issue labels/milestone: N/A: existing Beads linkage is authoritative.
- Initial Project fields: N/A: no GitHub Project update.
- Publication gate: status=active、confirmation=confirmed、evaluation=pass、readiness=complete。
- Failure policy: pending_retry; local evidence is retained.
- Completion policy: manual。
- PR linkage requirement: PR body includes Beads ID and dev-graph node ID.
- Closed without merge: mark_blocked。
- Local reconciliation: manual sync after main merge.

## 実行手順

1. fresh run の independent verification と verdict を確認する。
2. criteria receipt を current PASS verdict へ更新する。
3. lint、task specification gate、repository CI を同じ tree で再実行する。

## 受入条件

- receipt が唯一の contained verdict を指す。
- receipt の説明文だけでは bypass を検出しない。
- 正規 receipt mutation は引き続き拒否される。

## 検証方法

- 自動検証: python3 scripts/lint-live-trial-verdict.py --all。
- 手動検証: Draft PR の対象差分と evidence path を確認する。
- 証跡: eval-log/dev-graph/ と本受領書。

## リスクとロールバック

- リスク: 不正 receipt ref を legacy fallback が隠すこと。
- ロールバック: ref を修正し fresh live-trial を再実行する。

## Handoff

- 実装 route: human。
- 次に利用するノード: issue-required-heading-presence-validation-20260729。
