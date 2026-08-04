---
graph_node_id: "task-hooks-entry-point-parity-final-review-handoff-20260804"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["plugin-governance","hooks","phase-13","final-review"]
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
goal: "Beads、issue node、仕様反映受領書、commit、draft PR が同じ hook parity 契約を指す。"
scope_in: ["final review","仕様反映","品質ゲート","Beads と draft PR の追跡"]
scope_out: ["製品 API、DB schema、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["HK-001..003 の検査と回帰が pass","C01/C03 の仕様反映が記録済み","PR 作成前の機械受領書が clean HEAD に束縛される"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-hooks-parity-final-review-handoff.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a36840d65a7e675352d6d28bb8c778662252814ad4c05b8958dcf0a769ba5760","evaluator":"final-review + system-dev-plan validation","evidence_ref":"docs/features/feat-dev-pipeline-improvement/hooks-entry-point-parity-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-04T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "凍結済み P13 本体の行数上限を越えず、vf66 の最終統合条件だけを記録する補助 task。"
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
- 反映先は `system-spec/dev-workflow.md` の qa-143、`specs/harness-hub-plugin-hook-governance-addendum.md`、`architecture/harness-hub-dev-workflow.md`、feature/changelog、仕様反映受領書である。製品 API・DB・認証認可・UI・deploy unit は非変更である。
- 完了前に focused pytest、全 plugin 完全性、script naming、Python compile、shell syntax、task 仕様書ゲート、graph/schema gate を再実行する。Beads `HarnessHub-vf66`、issue node、commit、draft PR を相互に記録し、main merge 後に Beads を close する。
