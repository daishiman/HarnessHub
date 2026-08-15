---
graph_node_id: "feat-ui-integrity-audit-harness"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "testing-qa"
tags: ["macro-feature","testing-qa","browser-test","ui-integrity","S1"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "実ブラウザによる全画面 UI 崩れ自動検査基盤 (28 route × 3 幅 × 2 テーマ)"
owners: ["daishiman"]
created_at: "2026-08-14T00:00:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "draft"
depends_on: ["feat-demo-coverage-dataset"]
related_nodes: ["feat-demo-coverage-dataset","feat-dev-pipeline-improvement"]
resource_scope: ["tests/browser","apps/hub/src/app","packages/ui/src"]
purpose: "UI 崩れを全実 route で再現可能に監査する。既存の 5 合成 fixture を 28 実 route の証拠と誤認せず、COVERAGE_MATRIX から直接導出した母数を fail-closed で保護する。"
goal: "COVERAGE_MATRIX の 28 route・105 applicable state cell と、28 route × 3 幅 × 2 theme = 168 runtime キーを別の母数として検査し、0 件・欠落・Next route 不一致を非 0 終了にする実アプリ監査契約。"
scope_in: ["COVERAGE_MATRIX からの route/state 導出と Next page.tsx の静的 parity","360/768/1280 × light/dark の 168 runtime キー生成と実 origin runner","横溢れ・44px 未満操作域・意味セグメント内改行の検出","route/state/runtime の母数 0 ・不足・未到達を PASS にしない判定","通常テストから分離した browser audit 実行入口"]
scope_out: ["5 合成 fixture の 28 実 route への読み替え","未実行の 168 runtime キーを PASS と報告すること","検出した UI 崩れの是正","seed データ自体の整備"]
acceptance: ["COVERAGE_MATRIX から route 28・applicable state cell 105・runtime キー 168 を導出し、それぞれの母数を区別する","Next page.tsx と route 正本の不一致、母数 0、欠落、実 route 未到達は fail-closed になる","横溢れ・44px 操作域・意味セグメント内改行の negative fixture が検出器の生存を証明する","実 origin の代表 smoke と全 168 キー実行入口があり、実行していない受入範囲は未確認として残る","5 合成 fixture を 28 実画面の実走証拠に数えない"]
architecture_refs: ["arch-harness-hub-testing-qa","arch-harness-hub-design-system","arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-ui-integrity-audit-harness.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-14T00:00:00Z","origin_kind":"generated","source_digest":"bb7f49362cd1ded1d01d1dd25023533bb066d799b9d0375180310087768d1d3b","source_path":"system-spec/testing-qa.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec と 2026-08-14 の利用者要望 S1-S8 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-ui-integrity-audit-harness.md","confidence":0.9}]
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

# 実ブラウザ UI 崩れ監査

## 目的

既存の `COVERAGE_MATRIX` を route/state の単一正本にし、実 Next route との parity および実ブラウザでの UI 崩れを fail-closed に検査する。

## 母数

- 実 route: 28
- applicable state cell: 105
- runtime キー: 28 route × 3 幅 × 2 theme = 168

これらは別の母数であり、既存 5 合成 fixture は 28 実 route の実走証拠に数えない。

## 検査契約

- `COVERAGE_MATRIX` から route/state/runtime を直接導出し、二重台帳を作らない。
- Next `page.tsx` との不一致、母数 0、欠落、実 route 未到達を PASS にしない。
- 横溢れ、44px 未満操作域、`data-hh-meaning-segment` 内改行を検出する。
- 代表 smoke と全 168 キーの実行入口を分け、実行していない受入範囲は未確認として残す。

## 依存

seed は `feat-demo-coverage-dataset`、検出後の是正は `feat-ui-layout-remediation` が所有する。
