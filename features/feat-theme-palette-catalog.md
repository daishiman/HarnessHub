---
graph_node_id: "feat-theme-palette-catalog"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["macro-feature","ui-ux","theme","palette","metrics","S6"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "配色テーマの複数パレット化 (3〜4 パレット × light/dark・参考画像・選択実績の計測)"
owners: ["daishiman"]
created_at: "2026-08-14T00:00:00Z"
updated_at: "2026-08-15T13:37:01Z"
status: "draft"
depends_on: ["feat-ui-integrity-audit-harness"]
related_nodes: ["feat-ui-integrity-audit-harness","feat-ui-layout-remediation","feat-metrics-tracking","feat-user-org-admin"]
resource_scope: ["packages/ui/src","apps/hub/src/app","apps/hub/src/db"]
purpose: "現在の配色はグレー系の light / dark しか無く、利用者が好む色合いを選べない。さらに利用者の狙いはパレットを増やすこと自体ではなく、どの色合いが受け入れられるかを選択実績から実測して将来の既定を選定することにある。パレットの追加と選択実績の計測を同時に用意し、選定の根拠を後から作り直さなくてよい状態にする。"
goal: "3〜4 種類の配色パレットがそれぞれ light / dark を持ち、利用者が切り替えられ、切替画面が各パレットの参考画像を提示し、どのパレットが選択されたかが集計できる状態。"
scope_in: ["3〜4 種類の配色パレットの定義 (現行グレー系を含み、ブルー系・明色寄り・暗色寄りを加える)","各パレットの light / dark 2 モードの定義","パレットの色をトークンとして定義し、画面ごとの直接指定にしない","配色切替 UI と、切替結果の永続化","各パレットの参考画像 (実画面のスクリーンショット) の生成と切替 UI での提示","参考画像が実装のパレットと乖離したときに検知する仕組み","パレット選択実績の記録と、パレット別の選択数を集計できる形での保持","既存の自動検査 (feat-ui-integrity-audit-harness) の検査軸を 2 テーマから全パレット × 2 モードへ拡張"]
scope_out: ["利用者ごとの自由な色指定 (カスタムカラーピッカー)","選択実績の分析ダッシュボード・可視化 (集計可能な形での保持までを範囲とする)","人気に基づく既定パレットの自動切替 (選定は将来の人の判断)","テナント単位でのパレット強制 (本 feature は個人選択とする)","UI 崩れの是正 (feat-ui-layout-remediation の担当)","ロゴ・イラストなど配色トークン外の意匠変更"]
acceptance: ["3 種類以上のパレットが定義され、各パレットが light / dark の 2 モードを持つ","利用者がパレットとモードを切り替えられ、再読込後も選択が保持される","切替 UI が各パレットの参考画像を提示する","参考画像がパレット定義から生成され、定義変更後に再生成されていない画像を検知できる","パレットが選択されるたびに実績が記録され、パレット別の選択数を集計できる","自動検査が全パレット × 2 モードで実行され、いずれのパレットでも横溢れ 0 件である","配色が全てトークン経由で参照され、画面側に色の直接指定が新規に増えていない"]
architecture_refs: ["arch-harness-hub-design-system","arch-harness-hub-frontend","arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-theme-palette-catalog.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-15T13:37:01Z","origin_kind":"generated","source_digest":"df3a55215acaabb543e3dd5288f893470f928e2fb44622fef177ac540880e39f","source_path":"system-spec/ui-ux.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec と 2026-08-14 の利用者要望 S1-S8 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-theme-palette-catalog.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-14T00:00:00Z","missing_sections":[],"status":"incomplete"}
---

# 配色テーマの複数パレット化 (3〜4 パレット × light/dark・参考画像・選択実績の計測)

## 0. なぜこの feature があるのか

利用者は「現在グレー系だけなので、ブルー系や明るい感じ・暗い感じなど様々なパターンで切り替えられるように」と述べ、加えて「**将来的にユーザーがどのモードを選択したかをカウントできるようにし、どの色合いが人気があるかを把握できるようにしてほしい**」と述べた。

後半が本質である。パレットを増やすこと自体が目的ではなく、**どれが受け入れられるかを実測して選定したい**というのが狙いである。だから選択実績の計測は「あとで足す」ではなく最初から入れる。

参考スクリーンショットの添付も利用者の明示要望である (「こんなイメージです」が分かるように)。

## 1. 目的

現在の配色はグレー系の light / dark しか無く、利用者が好む色合いを選べない。さらに利用者の狙いはパレットを増やすこと自体ではなく、どの色合いが受け入れられるかを選択実績から実測して将来の既定を選定することにある。パレットの追加と選択実績の計測を同時に用意し、選定の根拠を後から作り直さなくてよい状態にする。

## 2. ゴール

3〜4 種類の配色パレットがそれぞれ light / dark を持ち、利用者が切り替えられ、切替画面が各パレットの参考画像を提示し、どのパレットが選択されたかが集計できる状態。

## 3. 含むもの

- 3〜4 種類の配色パレットの定義 (現行グレー系を含み、ブルー系・明色寄り・暗色寄りを加える)
- 各パレットの light / dark 2 モードの定義
- パレットの色をトークンとして定義し、画面ごとの直接指定にしない
- 配色切替 UI と、切替結果の永続化
- 各パレットの参考画像 (実画面のスクリーンショット) の生成と切替 UI での提示
- 参考画像が実装のパレットと乖離したときに検知する仕組み
- パレット選択実績の記録と、パレット別の選択数を集計できる形での保持
- 既存の自動検査 (feat-ui-integrity-audit-harness) の検査軸を 2 テーマから全パレット × 2 モードへ拡張

## 4. 含まないもの

- 利用者ごとの自由な色指定 (カスタムカラーピッカー)
- 選択実績の分析ダッシュボード・可視化 (集計可能な形での保持までを範囲とする)
- 人気に基づく既定パレットの自動切替 (選定は将来の人の判断)
- テナント単位でのパレット強制 (本 feature は個人選択とする)
- UI 崩れの是正 (feat-ui-layout-remediation の担当)
- ロゴ・イラストなど配色トークン外の意匠変更

## 5. 受入基準

- 3 種類以上のパレットが定義され、各パレットが light / dark の 2 モードを持つ
- 利用者がパレットとモードを切り替えられ、再読込後も選択が保持される
- 切替 UI が各パレットの参考画像を提示する
- 参考画像がパレット定義から生成され、定義変更後に再生成されていない画像を検知できる
- パレットが選択されるたびに実績が記録され、パレット別の選択数を集計できる
- 自動検査が全パレット × 2 モードで実行され、いずれのパレットでも横溢れ 0 件である
- 配色が全てトークン経由で参照され、画面側に色の直接指定が新規に増えていない

## 6. 前提となる feature

- `feat-ui-integrity-audit-harness`

## 7. 参照するアーキテクチャ

- `arch-harness-hub-design-system`
- `arch-harness-hub-frontend`
- `arch-harness-hub-data`

## 8. 出所

確定仕様 `spec-harness-hub-requirements` および `system-spec/ui-ux.md` を macro 分解したもの。
正本は `system-spec/spec-state.json` (完成度 evaluator 総合 PASS / `system-spec/resume-receipt.json`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
P01..P13 の phase task は本 feature からは生成せず、`run-system-dev-plan` (ミクロ層) が所有する。
