---
graph_node_id: "issue-in-app-improvement-request-spec-20260817"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["feat-feedback-loop","i15","system-spec","improvement-request"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "画面内改善要望 (I15) の仕様確定と system-spec 正規取込"
owners: ["daishiman"]
created_at: "2026-08-17T12:00:00Z"
updated_at: "2026-08-17T11:19:54Z"
status: "active"
depends_on: []
related_nodes: ["feat-feedback-loop","spec-system-spec-index","arch-system-spec-overview","issue-audit-multi-dispatch-null-verdict-20260808","issue-c19-live-trial-rerun-task-contract-r2-20260803"]
resource_scope: ["system-spec/spec-state.json","system-spec/00-requirements-definition.md","docs/features/feat-feedback-loop/i15-in-app-improvement-request-spec-reflection-receipt.md"]
purpose: "認証済み業務画面から離れずに改善要望を投稿する I15 契約を、system-spec 正規フローで確定し dev-graph へ取り込む"
goal: "I15 / D9-D12 が confirmed のまま lineage 付きで参照でき、Hub 実装は後続 issue に渡せる"
scope_in: ["I15 確定仕様と D9-D12","system-spec compile / completeness / C19 import","監査 fork schema 1.3 と C04 snapshot 契約","仕様反映受領書"]
scope_out: ["Hub 画面・API・DB の実装","本番 GitHub token 投入","feat-feedback-loop exact-13 の書き換え"]
acceptance: ["I15 と D9-D12 が spec-state で confirmed","completeness-report が PASS","C19 最終 live-trial が PASS","仕様反映受領書がある"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-dev-workflow","arch-system-spec-overview"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/in-app-improvement-request-spec-20260817.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7ed726cf030c9db0f1a9175068c1aea5879c32bc5d152337ae23eb485f85426b","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-17T12:00:00Z","origin_kind":"system-spec-harness","source_digest":"05cb0c36f454d4497b558824ae841f131971d10643f20bbd2eaf2cd28053fe9a","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"1.1"}
classification_confidence: 0.95
classification_reason: "I15 は既存 feedback-loop の仕様追補であり、独立 C14 feature package ではなく issue として追跡する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/in-app-improvement-request-spec-20260817.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-gjof","linked_at":"2026-08-17T11:19:54Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-17T12:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

認証済み業務画面の右下から画面を離れずに改善要望を投稿し、診断情報付きで AI 改修へ渡す I15 契約を、system-spec 正規フローで確定・取込する。

## 背景と問題

既存の `feat-feedback-loop` は CLI と S14 Web フォームの 2 経路で要望を受け付ける。利用者が「今見ている画面のまま直してほしい」と感じた瞬間に投稿できず、再現情報も手入力に依存する。本作業は製品仕様を I15 まで広げ、同時に仕様ハーネスがその確定を嘘なく取込できるようにする。

## 現在の挙動

- S14 / CLI の Feedback 資源は本番に存在する。
- I15（常設ボタン・DOM 再描画スクリーンショット・DevTools 相当の自動診断・GitHub Issue 出口）は実装されていない。
- 仕様正本 `system-spec/` には qa-232 以降と D9–D12 が確定済みで、completeness evaluator は PASS、C19 最終 live-trial は PASS である。

## 期待する挙動

- I15 の確定値が `system-spec/`・`specs/system-spec-index.md`・`architecture/system-spec-overview.md` に lineage 付きで残る。
- 画面・API・DB の実装は本 issue の範囲外として明示され、実装は後続 issue に渡る。
- 監査 fork 台帳 schema 1.3 と C19/C04 の resume 契約が、この確定を再実行できる状態になる。

## 再現手順またはユースケース

1. 認証済み業務画面で右下の「改善要望」を押す。
2. 今の画面の画像に注釈を書き、本文だけを書いて送る。
3. 裏側で診断情報が同送され、管理者一覧から GitHub Issue へ重複なく渡る。

## 影響と優先度

- 影響範囲: 製品仕様（I15 / D9–D12）。Hub 画面実装は未着手。
- 深刻度: medium
- 緊急度: 仕様を正本化して実装着手の前提を固定するため

## スコープ

- In: I15 の確定仕様、system-spec compile/import、C19/C04/監査台帳のハーネス補正、仕様反映受領書
- Out: Hub 画面・API・DB の実装、本番 GitHub token 投入、C14 の新規 13 task package

## 関連グラフ

- 原因/親ノード: feat-feedback-loop
- 関連仕様: spec-system-spec-index
- 関連アーキテクチャ: arch-system-spec-overview / arch-harness-hub-frontend / arch-harness-hub-backend
- 解決タスク: task-i15-in-app-improvement-request-spec-handoff-20260817

## 受入条件

- [x] I15 と D9–D12 が spec-state で confirmed
- [x] completeness-report verdict=PASS
- [x] C19 最終 live-trial 20260817T094952Z-mp9j-c19-r6-final が PASS
- [x] 仕様反映受領書を記録する
- [ ] Hub 実装は後続 issue（本 issue では要求しない）

## 検証証跡

- コマンド/テスト: focused pytest（監査台帳 / C19 resume / C04 snapshot）と validate-graph-schema
- 証跡 path: docs/features/feat-feedback-loop/i15-in-app-improvement-request-spec-reflection-receipt.md
