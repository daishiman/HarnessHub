---
graph_node_id: "task-i15-in-app-improvement-request-spec-handoff-20260817"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["feat-feedback-loop","i15","final-review"]
priority: "medium"
start_date: "2026-08-17"
target_date: null
iteration: null
title: "I15 画面内改善要望 仕様確定の最終レビュー handoff"
owners: ["daishiman"]
created_at: "2026-08-17T12:00:00Z"
updated_at: "2026-08-17T12:00:00Z"
status: "active"
depends_on: ["issue-in-app-improvement-request-spec-20260817"]
related_nodes: ["feat-feedback-loop","arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-dev-workflow"]
resource_scope: ["tasks/feat-feedback-loop/sys-feedback-loop-i15-spec-handoff-20260817.md","docs/features/feat-feedback-loop/i15-in-app-improvement-request-spec-reflection-receipt.md"]
purpose: "凍結済み exact-13 を変更せず、I15 仕様確定の最終レビューと Draft PR 境界を追跡する"
goal: "commit・Draft PR・Beads・Dev Graph・検証証拠が同じ変更境界を参照する"
scope_in: ["最終差分レビュー","品質ゲート再実行","仕様影響判断と受領書","main 同期","Draft PR と Beads 更新"]
scope_out: ["Hub runtime 実装","exact-13 再 promote","無関係な rubric 文言差分"]
acceptance: ["仕様反映受領書に検証と影響判断を記録する","対象 branch を main 同期後に Draft PR として公開する","Hub 実装未着手を残課題として明示する"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-feedback-loop/sys-feedback-loop-i15-spec-handoff-20260817.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a2c839764c78e6bfefd6813f072fdae0512c28d67a8b6013b248cb5fdba228ad","evaluator":"final-review","evidence_ref":"docs/features/feat-feedback-loop/i15-in-app-improvement-request-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-17T12:00:00Z","origin_kind":"manual","source_digest":"a2c839764c78e6bfefd6813f072fdae0512c28d67a8b6013b248cb5fdba228ad","source_path":"docs/features/feat-feedback-loop/i15-in-app-improvement-request-spec-reflection-receipt.md","source_plugin":"final-review","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "follow-up issue の最終公開条件だけを追跡する単一責務 handoff"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-feedback-loop/sys-feedback-loop-i15-spec-handoff-20260817.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-17T12:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

I15 画面内改善要望の確定仕様と、それを通す system-spec ハーネス補正を、
凍結済み exact-13 を書き換えずに公開できる状態にする。

## 背景

本 worktree で正規ヒアリングが I15 / D9–D12 を confirmed にした。既存
`feat-feedback-loop` の P01–P13 は S14/CLI の契約であり、I15 は追補である。
同時に監査台帳 schema 1.3 と C19/C04 resume がこの確定の取込経路になった。

## 入力と前提条件

- 入力: `system-spec/` 確定成果、C19/C04 live-trial、Beads 状態、focused pytest
- 前提: exact-13 本文は手編集しない。rubric 1.3.2 文言は本 PR に混ぜない

## 出力と成果物

- 生成物: `docs/features/feat-feedback-loop/i15-in-app-improvement-request-spec-reflection-receipt.md`
- 更新対象: `system-spec/`、`specs/`、`architecture/`、`features/feat-feedback-loop.md`、Draft PR、Beads notes

## 依存関係

- `depends_on`: `issue-in-app-improvement-request-spec-20260817`
- ブロッカー: Hub 実装は本 task の完了条件にしない

## 実装対象

- Frontend: N/A（仕様のみ。常設ボタン未実装）
- Backend/API: N/A（GitHub 出口・専用 R2 は未実装）
- Database/Data: N/A
- Infrastructure: N/A
- Security/Privacy: 仕様上は Workers Secret と診断 32KB 上限を記録するだけ
- Documentation: docs / features / architecture / tasks / system-spec / specs を同期する

## Write scope と競合制約

- `touches`: system-spec-harness、dev-graph system-spec import/C19/C04、system-spec 本文、I15 文書
- 排他資源: 同じ graph.json / system-spec 章を編集する他セッション
- 並列実行条件: rubric / 無関係 eval-log 失敗 run を混在させない
- branch: `devgraph/issue-in-app-improvement-request-spec-20260817`
- worktree lease: 本 worktree で最終レビューのみ
- completion projection: Draft PR 時点では issue を open 維持。Hub 実装は後続

## GitHub publication

- Mode: local_only。公開は Draft PR to `main`
- Project aliases: N/A
- Issue labels/milestone: N/A
- Initial Project fields: N/A
- Publication gate: focused pytest と schema 検証が通り、browser 検証は実装なしのため対象外
- Failure policy: pending_retry
- Completion policy: manual
- PR linkage requirement: Beads ID と `dev-graph: issue-in-app-improvement-request-spec-20260817` を本文に書く
- Closed without merge: keep_active
- Local reconciliation: manual

## 実行手順

1. git status/diff と focused pytest、仕様影響を確認する
2. origin/main を local main、続いて本 branch へ merge する
3. 対象変更だけを commit・push し、Draft PR と Beads notes を結ぶ

## 受入条件

- [x] 仕様反映受領書に検証と影響判断を記録する
- [ ] 対象 branch を main 同期後に Draft PR として公開する
- [ ] Hub 実装未着手を残課題として明示する

## 検証方法

- 自動検証: focused pytest 209 passed。validate-system-plan feat-feedback-loop
- 手動検証: 受領書の層判定と除外ファイル一覧を確認する
- 証跡: `docs/features/feat-feedback-loop/i15-in-app-improvement-request-spec-reflection-receipt.md`

## リスクとロールバック

- リスク: 仕様確定を実装完了と誤読する → 受領書と PR 本文で未実装を明示する
- ロールバック: 本 PR を merge しなければ製品 runtime は変わらない

## Handoff

- 実装 route: human
- 次に利用するノード: `issue-in-app-improvement-request-spec-20260817`
