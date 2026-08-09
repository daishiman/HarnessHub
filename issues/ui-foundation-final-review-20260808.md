---
graph_node_id: "issue-ui-foundation-final-review-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-foundation","browser-test","vrt","responsive","final-review"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "UI 基盤 wave の最終レビュー・仕様反映・公開"
owners: ["daishiman"]
created_at: "2026-08-08T07:07:57Z"
updated_at: "2026-08-08T11:08:55Z"
status: "closed"
depends_on: []
related_nodes: ["feat-hub-foundation","arch-harness-hub-frontend"]
resource_scope: [".github/workflows/ci.yml",".github/workflows/ui-visual.yml","apps/hub/","packages/ui/","pnpm-lock.yaml","system-spec/","specs/harness-hub-ui-foundation-addendum.md","architecture/harness-hub-frontend.md","features/feat-hub-foundation.md","issues/ui-foundation-final-review-20260808.md","tasks/feat-hub-foundation/sys-hub-foundation-p12.md","tasks/feat-hub-foundation/sys-hub-foundation-p13.md","docs/frontend-spec.md","docs/frontend-ui-foundation-spec.md","docs/features/feat-hub-foundation/"]
purpose: "5 Beads に分かれた UI 基盤実装を、仕様・設計・検証・公開が一致する単一の final-review closure に束ねる"
goal: "対象差分だけの commit、正規仕様反映、全品質ゲート、Beads notes、base main の draft PR が同じ UI 基盤契約を指す"
scope_in: ["AppShell / design token / screen state の最終レビュー","real browser / VRT / responsive regression の最終レビュー","system-spec / specs / architecture / features / tasks / docs 反映","Beads 更新と draft PR 公開"]
scope_out: ["公開 API・DB schema・認証認可判定の変更","Cloudflare 本番デプロイ","既存 user-org-admin skip/todo と U1-U9 source-index debt の解消"]
acceptance: ["5 Beads の対象差分だけが commit される","task spec と repository quality gate が blocking failure 0 で完了する","frontend/ui-ux/testing-qa の仕様影響が正規 writer と全文書層へ反映される","remote main 取込後の devgraph branch が origin へ push され base main の draft PR が作成される"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-foundation-final-review-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"4d6201eddc88115e2ed94716435de16cb1596f9e314bfa76ba989995cac65ad6","evaluator":"final review + system-spec transition writer","evidence_ref":"docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-08T07:07:57Z","origin_kind":"manual","source_digest":"9310f064f5f79d8e2b0ef53d3b1dfc25c8afcb25a51fe92e6890cd4ddc0230e2","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "複数の既存 Beads を一つの commit / PR / spec receipt に束ねる独立 final-review issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-foundation-final-review-20260808.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-08T09:21:38Z","evidence_refs":["docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md","https://github.com/daishiman/HarnessHub/pull/679"],"policy":"manual","reconciled_at":"2026-08-08T11:08:55Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-08T07:07:57Z","missing_sections":[],"status":"complete"}
---

# 概要

`HarnessHub-tiqw` / `HarnessHub-snlo` / `HarnessHub-xuhj` / `HarnessHub-xaa3` / `HarnessHub-4a2z` の UI 基盤実装を、一つの仕様・検証・公開単位として最終レビューする。

## 背景と問題

5 issue は AppShell / design token、標準画面状態、実ブラウザ harness、component catalog / VRT、responsive regression という相互依存した UI 基盤を構成する。個別 issue の実装だけでは breakpoint 値と CI 契約が system-spec / specs / architecture / docs へ戻らず、次の画面実装で別の基準が増える。

## 現在の挙動

5 Beads の実装とローカル検証は存在するが、対象差分の final review、正規仕様反映、remote main の再取込、Linux VRT baseline、draft PR、Beads notes を単一の受領証跡へ束ねる必要がある。

## 期待する挙動

対象差分だけが commit され、qa-201 / qa-203 / qa-204、全文書層、全品質ゲート、Beads、base `main` の draft PR が同じ UI 基盤契約を参照する。

## 再現手順またはユースケース

1. `git status` / diff と 5 Beads の scope を照合する。
2. task / system-spec / repository / browser の品質ゲートを再実行する。
3. 仕様影響を正規 writer で system-spec / specs / architecture / docs へ反映する。
4. `origin/main` → local `main` →本 branch の順で merge し、競合と回帰を検査する。
5. 対象ファイルだけを commit / push し、base `main` の draft PR と Beads notes を作る。

## 影響と優先度

- 影響範囲: Harness Hub の全画面が共有する UI layout / token / 状態表現と、その品質ゲート。
- 深刻度: high。
- 緊急度: 5 Beads の未公開差分を、仕様と検査を欠いたまま次の画面実装へ持ち越さないため。

## スコープ

- In: `packages/ui`、`apps/hub`、Vitest Browser Mode / Playwright / VRT、system-spec / specs / architecture / features / tasks / docs、5 Beads、draft PR。
- Out: 公開 API、DB schema、認証認可判定、Cloudflare 本番 deploy、既存 user-org-admin todo、system-spec U1〜U9 source-index debt の解消。

## 関連グラフ

- 原因/親ノード: `feat-hub-foundation`。
- 関連仕様: `spec-harness-hub-ui-foundation-addendum`。
- 関連アーキテクチャ: `arch-harness-hub-frontend`。
- 解決 task: 既存 5 Beads を本 issue が final-review closure として束ねる。

## 受入条件

- [x] 5 Beads の差分だけが commit 対象として特定されている。
- [x] task spec validator と repository quality gate が blocking failure 0 で完了する。
- [x] frontend / ui-ux / testing-qa の仕様影響が正規 writer で反映されている。
- [x] 変更対象の手書きファイルが 500 行以下、Markdown が 300 行以下である。
- [x] remote main → local main →本 branch の順で同期済みである。
- [x] `devgraph/issue-ui-foundation-final-review-20260808` を push し、base `main` の draft PR #679 を作る。
- [x] PR 本文が目的・変更・検証・仕様反映・Beads IDs・node ID・残課題を含む。

## 検証証跡

- task spec: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hub-foundation`
- repository: `pnpm verify`。
- browser: `pnpm --filter @harness-hub/hub run test:browser`。
- system-spec: coverage / source citation / compile comparison。
- document / graph: placement、line limit、schema、`git diff --check`。
- 受領書: `docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md`。

## 仕様反映

- `system-spec/spec-state.json`: qa-201 / qa-203 / qa-204
- `specs/harness-hub-ui-foundation-addendum.md`
- `architecture/harness-hub-frontend.md`
- `features/feat-hub-foundation.md`
- `docs/frontend-ui-foundation-spec.md`
- `docs/features/feat-hub-foundation/ui-foundation-spec-reflection-receipt.md`

## 完了投影

PR #679 は 2026-08-08 に `main` へ merge 済みである。5 Beads は closed、本 issue は manual reconciliation（マージ結果を正本へ同期する処理）で closed / done へ収束した。
