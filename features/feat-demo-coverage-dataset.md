---
graph_node_id: "feat-demo-coverage-dataset"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "testing-qa"
tags: ["macro-feature","testing-qa","seed","coverage","ui-integrity","S5"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "全画面×全状態を網羅する確認用データセット (28 route × 空/1件/大量/長文/エラー × 全 enum 値)"
owners: ["daishiman"]
created_at: "2026-08-14T00:00:00Z"
updated_at: "2026-08-15T02:00:43.585473Z"
status: "done"
depends_on: []
related_nodes: ["feat-domain-model-db","feat-metrics-tracking"]
resource_scope: ["scripts/seed","apps/hub/src/db","packages/*/src/fixtures"]
purpose: "画面を開いても空か 1 件しか無いため、大量件数での折返し・長文での横溢れ・エラー時の描画といった崩れが最も出やすい状態が一度も観測されていない。UI 崩れの自動検査に食わせる状態を先に用意しないと、データが薄いことによる「崩れていない」という偽の合格が出る。網羅的な確認用データを正本として整備し、全画面・全状態を人も機械も同じ入力で再現できるようにする。"
goal: "ローカル DB へ投入するだけで、対象 28 route のそれぞれについて 空 / 1 件 / 大量 (50 件以上) / 長文 / エラー の5 状態と、各ドメインの enum ステータス全値が画面上で再現でき、同じ seed を二度流しても結果が一致する状態。"
scope_in: ["対象 28 route と、各 route が描画する状態 (空/1件/大量50件以上/長文/エラー) の対応表の確定","各ドメインモデルの enum ステータス全値を最低 1 件ずつ含む fixture の定義","長文パターン (日本語の折返しが起きる見出し・説明文・タグ名) の明示的な収録","大量パターン (一覧の仮想化・ページング境界を跨ぐ 50 件以上) の収録","エラー状態 (取得失敗・権限不足・未同期) を画面から再現する手段","seed の冪等性 (二度流しても同じ状態に収束する) の担保","ローカル以外の DB URL を拒否する既存ガードの維持","seed 済み状態から特定 route の特定状態へ到達する手順の文書化"]
scope_out: ["本番・staging データベースへの投入 (ローカル専用ガードを緩めない)","実ブラウザ検査そのもの (feat-ui-integrity-audit-harness の担当)","UI 崩れの是正 (feat-ui-layout-remediation の担当)","顧客実データの取込み・匿名化","パフォーマンス負荷試験用の大規模データ (本 feature は表示網羅が目的で負荷が目的ではない)"]
acceptance: ["seed 投入後、28 route それぞれについて 5 状態 (空/1件/大量/長文/エラー) へ到達する手順が存在し実行できる","各ドメインモデルの enum ステータスが全値、最低 1 件ずつ seed に含まれる (未使用値 0 件を機械検査する)","大量パターンが 50 件以上で、一覧のページング境界を跨ぐ","長文パターンが日本語の折返しを実際に発生させる長さを持つ","同じ seed を連続 2 回実行し、投入後の状態が一致する","ローカル以外の DB URL を指定した seed 実行が非 0 終了で拒否される","route × 状態の対応表に未カバーの組が 0 件であることを機械検査する"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-demo-coverage-dataset.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-demo-coverage-dataset/a43737a6471ef2ebe1f2a77ef21fe644ee6a28a39f8ddc13edefaff0f197c577/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-14T00:00:00Z","origin_kind":"generated","source_digest":"bb7f49362cd1ded1d01d1dd25023533bb066d799b9d0375180310087768d1d3b","source_path":"system-spec/testing-qa.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec と 2026-08-14 の利用者要望 S1-S8 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-demo-coverage-dataset.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-7xk9","linked_at":"2026-08-14T15:00:12Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-15T01:58:58Z","evidence_refs":["docs/features/feat-demo-coverage-dataset/release-notes.md","docs/features/feat-demo-coverage-dataset/final-review-notes.md","docs/features/feat-demo-coverage-dataset/evidence/index.md","docs/features/feat-demo-coverage-dataset/runbook.md","packages/db/scripts/demo-coverage/coverage-matrix.ts","architecture/harness-hub-testing-qa.md"],"policy":"manual","reconciled_at":"2026-08-15T01:59:30Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T13:10:00Z","missing_sections":[],"status":"complete"}
---

# 全画面×全状態を網羅する確認用データセット (28 route × 空/1件/大量/長文/エラー × 全 enum 値)

## 0. なぜこの feature があるのか

利用者の要望は「様々なパターンでの確認ができるように網羅的にカバレッジ 100% となるようなデータ」であった。

現状は画面を開いても中身が空か 1 件しかなく、**大量件数での折返し・長文での溢れ・エラー時の表示**といった崩れが最も出やすい状態を誰も見たことがない。UI 崩れの自動検査 (feat-ui-integrity-audit-harness) を先に作っても、食わせるデータが空なら「崩れていない」という嘘の緑が出る。データが先で検査が後である。

## 1. 目的

画面を開いても空か 1 件しか無いため、大量件数での折返し・長文での横溢れ・エラー時の描画といった崩れが最も出やすい状態が一度も観測されていない。UI 崩れの自動検査に食わせる状態を先に用意しないと、データが薄いことによる「崩れていない」という偽の合格が出る。網羅的な確認用データを正本として整備し、全画面・全状態を人も機械も同じ入力で再現できるようにする。

## 2. ゴール

ローカル DB へ投入するだけで、対象 28 route のそれぞれについて 空 / 1 件 / 大量 (50 件以上) / 長文 / エラー の5 状態と、各ドメインの enum ステータス全値が画面上で再現でき、同じ seed を二度流しても結果が一致する状態。

## 3. 含むもの

- 対象 28 route と、各 route が描画する状態 (空/1件/大量50件以上/長文/エラー) の対応表の確定
- 各ドメインモデルの enum ステータス全値を最低 1 件ずつ含む fixture の定義
- 長文パターン (日本語の折返しが起きる見出し・説明文・タグ名) の明示的な収録
- 大量パターン (一覧の仮想化・ページング境界を跨ぐ 50 件以上) の収録
- エラー状態 (取得失敗・権限不足・未同期) を画面から再現する手段
- seed の冪等性 (二度流しても同じ状態に収束する) の担保
- ローカル以外の DB URL を拒否する既存ガードの維持
- seed 済み状態から特定 route の特定状態へ到達する手順の文書化

## 4. 含まないもの

- 本番・staging データベースへの投入 (ローカル専用ガードを緩めない)
- 実ブラウザ検査そのもの (feat-ui-integrity-audit-harness の担当)
- UI 崩れの是正 (feat-ui-layout-remediation の担当)
- 顧客実データの取込み・匿名化
- パフォーマンス負荷試験用の大規模データ (本 feature は表示網羅が目的で負荷が目的ではない)

## 5. 受入基準

- seed 投入後、28 route それぞれについて 5 状態 (空/1件/大量/長文/エラー) へ到達する手順が存在し実行できる
- 各ドメインモデルの enum ステータスが全値、最低 1 件ずつ seed に含まれる (未使用値 0 件を機械検査する)
- 大量パターンが 50 件以上で、一覧のページング境界を跨ぐ
- 長文パターンが日本語の折返しを実際に発生させる長さを持つ
- 同じ seed を連続 2 回実行し、投入後の状態が一致する
- ローカル以外の DB URL を指定した seed 実行が非 0 終了で拒否される
- route × 状態の対応表に未カバーの組が 0 件であることを機械検査する

## 6. 前提となる feature

- (なし)

## 7. 参照するアーキテクチャ

- `arch-harness-hub-data`
- `arch-harness-hub-testing-qa`

## 8. 出所

確定仕様 `spec-harness-hub-requirements` および `system-spec/testing-qa.md` を macro 分解したもの。
正本は `system-spec/spec-state.json` (完成度 evaluator 総合 PASS / `system-spec/resume-receipt.json`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
P01..P13 の phase task は本 feature からは生成せず、`run-system-dev-plan` (ミクロ層) が所有する。
