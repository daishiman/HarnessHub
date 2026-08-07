---
graph_node_id: "feat-post-signin-landing-surface"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["post-signin","landing","ui-ux","dashboard","web-only"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "サインイン後の着地画面と業務画面への導線"
owners: ["daishiman"]
created_at: "2026-08-07T11:12:00Z"
updated_at: "2026-08-07T11:12:00Z"
status: "draft"
depends_on: ["feat-post-signin-transition-observability"]
related_nodes: ["spec-post-signin-landing-observability","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["apps/hub/src/app/dashboard","apps/hub/src/app/page.tsx","apps/hub/src/components"]
purpose: "サインイン後に稼働状況しか出ない状態は、利用者から見れば『何もできない画面に着いた』のと同じである。着地した先が業務の起点として機能する状態にする。"
goal: "遷移元が無いサインイン成功で既定着地へ着き、その画面が所属の把握・直近の作業への復帰・業務画面群への導線を備えた状態にする。"
scope_in: ["既定着地の決定と、遷移元が無い場合の着地先解決","所属テナント／ワークスペースの常時表示と複数所属時のその場切替","自分が最後に触ったものの種別横断提示と、空状態での次の行動への導線","既存業務画面群への導線 (行き止まりにしない)","稼働状況を通常時に出さない扱い"]
scope_out: ["S09 ダッシュボードの KPI・推移・完了率・ランキング・部門別削減 (P5 据え置き)","縮退の記録そのもの (feat-post-signin-transition-observability の担当)","業務画面群それぞれの内容"]
acceptance: ["遷移元が無いサインイン成功で既定着地へ着地し / に留まらない","着地画面が所属テナント／ワークスペースを常時表示し、複数所属ならその場で切り替えられる","着地画面が自分が最後に触ったものを種別横断で提示し、空状態でも次の行動への導線を示す","着地画面が既存業務画面群への導線を持ち行き止まりにならない","稼働状況が通常時に表示されず、稼働状況が主役の画面が既定着地になっていない"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-post-signin-landing-surface.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-07T11:12:00Z","origin_kind":"system-spec-harness","source_digest":"e1ecf64f6bd0dfc66926fc252aae33dd70303563a0bfda48954e3f58f64a9146","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "確定仕様追補 spec-post-signin-landing-observability (qa-170〜qa-199) を macro 分解した feature"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-post-signin-landing-surface.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-07T11:12:00Z","missing_sections":[],"status":"incomplete"}
---

# サインイン後の着地画面と業務画面への導線

## 0. なぜこの feature があるのか

利用者が最初に報告した症状は「詳細画面とかダッシュボードとか、作成しているこのシステムのページに遷移しない」だった。

原因は古いビルドだったが、**着いた先が「稼働状況 / Hub の実行基盤が起動しています」だけだった**ことも、症状を分かりにくくした。稼働状況は運用者向けの情報であり、業務の起点ではない。本 feature は着地先そのものを業務の起点にする。

## 1. 目的

サインイン後に稼働状況しか出ない状態は、利用者から見れば『何もできない画面に着いた』のと同じである。着地した先が業務の起点として機能する状態にする。

## 2. ゴール

遷移元が無いサインイン成功で既定着地へ着き、その画面が所属の把握・直近の作業への復帰・業務画面群への導線を備えた状態にする。

## 3. 含むもの

- 既定着地の決定と、遷移元が無い場合の着地先解決
- 所属テナント／ワークスペースの常時表示と複数所属時のその場切替
- 自分が最後に触ったものの種別横断提示と、空状態での次の行動への導線
- 既存業務画面群への導線 (行き止まりにしない)
- 稼働状況を通常時に出さない扱い

## 4. 含まないもの

- S09 ダッシュボードの KPI・推移・完了率・ランキング・部門別削減 (P5 据え置き)
- 縮退の記録そのもの (feat-post-signin-transition-observability の担当)
- 業務画面群それぞれの内容

## 5. 受入基準

- 遷移元が無いサインイン成功で既定着地へ着地し / に留まらない
- 着地画面が所属テナント／ワークスペースを常時表示し、複数所属ならその場で切り替えられる
- 着地画面が自分が最後に触ったものを種別横断で提示し、空状態でも次の行動への導線を示す
- 着地画面が既存業務画面群への導線を持ち行き止まりにならない
- 稼働状況が通常時に表示されず、稼働状況が主役の画面が既定着地になっていない

## 6. 前提となる feature

- `feat-post-signin-transition-observability`

## 7. 参照するアーキテクチャ

- `arch-harness-hub-frontend`
- `arch-harness-hub-security`

## 8. 補足

> **稼働状況を通常時に出さない**は利用者の直接決定である (「通常時は出さず異常時だけ」)。運用情報を消すのではなく、既定着地の主役から外す。

> 既定着地の値は**実装定数を import** する。テスト側で値を複製すると、実装を変えてもテストが緑のまま通り、本件と同じ穴が開く。

## 9. 出所

確定仕様追補 [`spec-post-signin-landing-observability`](../specs/harness-hub-post-signin-landing-observability-addendum.md) を macro 分解したもの。
正本は `system-spec/spec-state.json` (qa-170〜qa-199, digest `e1ecf64f6bd0dfc6…`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
