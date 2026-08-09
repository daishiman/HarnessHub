---
graph_node_id: "task-verification-tiering-final-review-handoff-20260809"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["verification-tier","elegant-review","phase-13","final-review"]
priority: "high"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "検証 tier・証拠整合の最終レビュー Phase 13 補助引継ぎ"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T00:00:00Z"
status: "active"
depends_on: []
related_nodes: ["issue-verification-evaluator-cache-20260809","issue-verification-tier-unwired-20260809","spec-harness-hub-verification-tiering-20260809","doc-verification-tiering-spec-reflection-receipt-20260809","feat-dev-pipeline-improvement"]
resource_scope: ["tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-verification-tiering-final-review-handoff.md","docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md","system-spec/dev-workflow.md","system-spec/testing-qa.md","specs/harness-hub-verification-tiering-addendum.md","architecture/harness-hub-dev-workflow.md","architecture/harness-hub-testing-qa.md","features/feat-dev-pipeline-improvement.md"]
purpose: "検証 tier と elegant-review 証拠整合の実装、仕様反映、検証、公開条件を凍結済み P01..P13 の外側で追跡する。"
goal: "完了済み実装と未配線残作業を混同せず、対象差分だけを main 取り込み後の draft PR へ統合する。"
scope_in: ["final review","仕様反映","品質ゲート","Beads/dev-graph/PR 追跡"]
scope_out: ["製品 API","DB schema","認証認可","UI","Cloudflare deploy unit","cache 実呼出元配線","tier による下流 step 切替"]
acceptance: ["qa-216/qa-217 が confirmed かつ coverage PASS","focused/full gate が pass","対象ファイルだけを commit","残作業 Beads を open で維持","draft PR を main 向けに作成"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-verification-tiering-final-review-handoff.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"5d357fc1659da7c469bd51ec4fec58ead4f6b02f7880884e90ed21d525da9626","evaluator":"final review + system-dev-plan validation","evidence_ref":"docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "凍結済み 13 phase を再生成せず、今回の横断的な最終統合条件だけを保持する補助 task。"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-verification-tiering-final-review-handoff.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-09T00:00:00Z","missing_sections":[],"status":"complete"}
---

# Phase 13 補助引継ぎ: 検証 tier・証拠整合の最終レビュー

## 目的

変更差分に応じた検証 tier、延期と cache の記録、elegant-review の signal 整合を公開前に一体で確認する。

## 背景

過去の P01..P13 は immutable（不変＝生成済み本文を書き換えない）なので、本 task が今回の統合条件を保持する。

## 入力と前提条件

- `qa-216` / `qa-217` が confirmed で、coverage matrix が PASS していること。
- Beads と dev-graph node の対応が確認できること。
- 無関係な作業ツリー差分を対象 commit から除外できること。

## 依存関係

仕様正本は `system-spec/dev-workflow.md` と `system-spec/testing-qa.md`、設計は verification tier 仕様追補と二つの architecture wrapper、課題状態は Beads を正とする。

## 実装対象

- `HarnessHub-6fct`: `mvp / standard / critical` selector、規則/source digest、明示降格の fail-closed。
- `HarnessHub-jb6r`: system-spec の承認遷移を正規 CLI 経由へ固定。
- `HarnessHub-hz8m`: `condition` と `condition_signal` の対応、smell 分離、strict 日付境界、verdict 導出。
- 561 行の validator を主 CLI と phase-order support module に分離。
- `qa-216` / `qa-217` と specs/architecture/feature/docs/task へ仕様・設計を反映。

## Write scope と競合制約

対象は本 task の `resource_scope` と tier/review 実装、対応するテスト・graph・issue に限定する。既存の auth/backend/database/security 等の差分、別 run の eval-log、別機能の生成物は stage しない。

## 実行手順

1. status/diff と Beads を照合する。
2. 仕様を正規 writer で反映し、docs/specs/architecture/features/tasks を同期する。
3. focused gate、task plan、repository CI、PR-ready gate を実行する。
4. remote main を local main に取り込み、local main を branch へ merge して再検証する。
5. 対象だけを commit/push し、main 向け draft PR を作成して Beads を更新する。

## 出力と成果物

- selector、plan、decision validator、cache mechanism、review signal validator とテスト。
- `qa-216` / `qa-217`、追補仕様、architecture、feature、受領書、本 handoff。
- dev-graph/Beads linkage、draft PR、最終 HEAD に束縛した機械受領書。

## 受入条件

- 完了対象の focused test と正本の coverage が PASS する。
- 人手管理コード／文書が 500 行以下で、graph/schema/frontmatter gate が PASS する。
- main 取り込み後も repository CI と PR-ready gate が PASS する。
- commit に無関係差分が含まれず、未配線課題が open のまま明記される。

## 検証方法

focused pytest、`validate-coverage-matrix.py --require-complete`、`validate-system-plan.py`、`scripts/run-ci-checks.sh`、`scripts/verify-pr-ready.sh`、`git diff --check`、graph schema を最終 HEAD で実行する。

## リスクとロールバック

tier の下流切替を先行すると検査が黙って消えるため本変更では記録までに留める。問題が出た場合は PR を merge せず、対象 commit を revert（変更を打ち消す commit）して selector step を外し、既存の全 gate 実行を維持する。

## GitHub publication

branch は `devgraph/issue-verification-evaluator-cache-20260809`、base は repository default の `main`、PR は cache 配線と下流切替が残るため draft とする。

## Handoff

- `HarnessHub-6nf1`: evaluator cache を実 evaluator 起動点へ配線する。
- `HarnessHub-xcl3`: tier decision を下流 CI step の起動・blocking 集合へ配線する。
- `HarnessHub-sy31`: deferred gate を定期的に消化する。
