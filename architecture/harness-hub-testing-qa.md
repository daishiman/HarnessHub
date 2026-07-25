---
graph_node_id: "arch-harness-hub-testing-qa"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "testing-qa"
tags: ["system-spec-import","testing-qa"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub testing-qa アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-24T12:35:34Z"
updated_at: "2026-07-24T12:35:34Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-testing-qa.md"]
purpose: "テスト戦略・品質保証 (testing-qa) の確定仕様 — テストレベル 4 種網羅 (単体・結合・境界値・回帰)、カバレッジ 80% 品質ゲートと改善ループ、FE/BE/インフラ層別テスト方針、behavior ベースの保守しやすい UI テスト、タスク仕様書へのテスト戦略の冪等組込 — を dev-graph から参照する"
goal: "qa-076/qa-077/qa-078/qa-079/qa-080/qa-081 の確定内容と D8 (Testing Library 採用) に適合し、タスク仕様書のテスト戦略セクション必須化・カバレッジ 80% ゲート・UI 微調整で壊れない behavior ベーステスト・失敗時改善ループの指針を提供する"
scope_in: ["system-spec/testing-qa.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-testing-qa.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"39b66cb40e83ad4b7977c1ed0734b1c86bf1b746511d584e8a72282019b1fd7d","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260724-testing-qa-r2.json"}
source_lineage: {"imported_at":"2026-07-24T12:35:34Z","origin_kind":"system-spec-harness","source_digest":"39b66cb40e83ad4b7977c1ed0734b1c86bf1b746511d584e8a72282019b1fd7d","source_path":"system-spec/testing-qa.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-testing-qa.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-24T12:35:34Z","missing_sections":[],"status":"complete"}
---

# Harness Hub testing-qa アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/testing-qa.md](../system-spec/testing-qa.md) (sha256: `fd302fb5f8f8…` (完全値は frontmatter source_lineage.source_digest))

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260724-testing-qa-r2.json`)
- 取込日時: 2026-07-24T12:35:34Z / plugin: system-spec-harness v0.1.0

## 確定内容の要点 (参照のみ・正本は上記)

- **テストレベル網羅 (qa-076)**: タスク仕様書は単体・結合・境界値・既存回帰の 4 レベルを必須テスト戦略セクションとして持ち、変更内容からテスト種別を導出する。
- **カバレッジ品質ゲート (qa-077)**: 80% 以上 (変更対象 line/branch 既定・層別調整可) を CI で機械検証。失敗・未達はマージ停止のうえ改善ループ (失敗分析→修正→再実行) へ。数値の目的化は禁止し behavior 検証を優先。
- **層別方針と保守性 (qa-078)**: FE=component 単体 + 操作フロー結合 (behavior ベース、accessible role/ラベル選択、pixel/DOM 構造依存の禁止)、BE=API 契約 + ロジック単体 + DB 結合、インフラ=IaC 静的検証 + デプロイ後 smoke。
- **冪等な仕組み化 (qa-079/qa-081)**: テスト戦略セクションをタスク仕様書テンプレート必須項目とし、system-dev-planner の task spec 必須 section 契約で機械検証、欠落は fail-closed で拒否。
- **platform 境界 (qa-080)**: CI 実行=web 行、作者ローカル実行=desktop-windows/desktop-macos 行。mobile/tablet/desktop-linux は対象外。
- **ツール確定 (D8)**: Vitest (単体・結合) + Playwright (E2E) + @testing-library/react (UI コンポーネント、behavior ベース) の 3 点構成。

## 上流指針 (doctrine anchor)

- reliability + operations (Google SRE)。doctrine-anchor-registry.json の pending_exceptions に approved 登録済み (owner: daishiman, 2026-07-24)。
