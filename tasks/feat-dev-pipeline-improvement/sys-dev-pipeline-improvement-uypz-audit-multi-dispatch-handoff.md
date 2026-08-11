---
graph_node_id: "task-uypz-audit-multi-dispatch-handoff-20260811"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["system-spec-harness","audit-ledger","schema-1.2","final-review"]
priority: "high"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "uypz 複数監査 dispatch schema 1.2 最終レビュー handoff"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-11T07:30:00Z"
status: "active"
depends_on: ["issue-audit-multi-dispatch-null-verdict-20260808"]
related_nodes: ["feat-dev-pipeline-improvement","issue-audit-fork-ledger-forgery-20260728","arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
resource_scope: ["tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-uypz-audit-multi-dispatch-handoff.md","docs/features/feat-dev-pipeline-improvement/uypz-audit-fork-schema12-spec-reflection-receipt.md","issues/sys-audit-multi-dispatch-null-verdict-20260808.md","plugins/system-spec-harness/hooks/record-audit-fork.py","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/"]
purpose: "凍結済み exact-13 を変更せず、HarnessHub-uypz の最終レビュー・仕様反映・Draft PR 境界を追跡する"
goal: "commit・Draft PR・Beads・Dev Graph・検証証拠が同じ変更境界を参照する"
scope_in: ["最終差分レビュー","品質ゲート再実行","仕様影響判断と受領書","main 同期","Draft PR と Beads 更新"]
scope_out: ["製品 runtime の追加機能","fresh live-trial の完遂そのもの","無関係な VRT / pipeline-board 差分"]
acceptance: ["仕様反映受領書に検証と影響判断を記録する","対象 branch を main 同期後に Draft PR として公開する","fresh live-trial 未達を残課題として明示し close しない"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-uypz-audit-multi-dispatch-handoff.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":null,"evaluator":"final-review","evidence_ref":"docs/features/feat-dev-pipeline-improvement/uypz-audit-fork-schema12-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-dev-pipeline-improvement/uypz-audit-fork-schema12-spec-reflection-receipt.md","source_plugin":"final-review","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "follow-up issue の最終公開条件だけを追跡する単一責務 handoff"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-uypz-audit-multi-dispatch-handoff.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-uypz","linked_at":"2026-08-11T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

複数監査 dispatch の台帳 schema 1.2 実装について、最終レビュー結果と公開条件を
凍結済み exact-13 task を書き換えずに引き継ぐ。

## 背景

Beads `HarnessHub-uypz` は製品 runtime ではなく、system-spec-harness の監査 fork 証跡と
completeness evaluator の帰属照合を改善する。local unit / fixture は完了し、
current runtime の fresh live-trial だけが未達である。

## 入力と前提条件

- 入力: 対象 branch の差分、Beads 状態、issue 本文、focused pytest 結果。
- 前提: exact-13 package 本文は手編集しない。無関係な VRT / pipeline-board 差分は commit しない。

## 出力と成果物

- 生成物: `docs/features/feat-dev-pipeline-improvement/uypz-audit-fork-schema12-spec-reflection-receipt.md`
- 更新対象: issue 本文、architecture 追記、Draft PR、Beads notes

## 依存関係

- `depends_on`: `issue-audit-multi-dispatch-null-verdict-20260808`
- ブロッカー: fresh live-trial 未達の間は issue を close しない。正式 evaluator の parallel 許可も行わない。

## 実装対象

- Frontend / Backend / Database / Infrastructure: N/A（製品 runtime 非変更）
- Security/Privacy: 監査 receipt の ID / digest / verdict 取り違えを fail-closed で拒否する
- Documentation: `docs/` / `features/` / `architecture/` / `tasks/` / issue を同期する

## Write scope

- `touches`: `record-audit-fork.py`、attribution consumer、receipt schema、関連 test・hook docs
- branch: `devgraph/issue-audit-multi-dispatch-null-verdict-20260808`
- completion: Draft PR 時点では Beads を `in_progress` 維持。live-trial 後に close する

## 実行手順

1. git status/diff と focused pytest、行数、仕様影響を確認する
2. `origin/main` を local `main`、続いて本 branch へ merge する
3. 対象変更だけを commit・push し、Draft PR と Beads notes を相互に結ぶ

## 検証（MVP）

- hooks + completeness-evaluator focused: 141 passed
- schema JSON load: OK
- 手書き変更ファイル: すべて 500 行以下
- task package exact-13: 本 issue は follow-up のため package 再 promote 対象外（handoff で追跡）

## 残課題

- fresh live-trial による 3 dispatch e2e 実証
- `HarnessHub-preq`（VRT）と `HarnessHub-9am.3`（pipeline design review notes）は別 PR
