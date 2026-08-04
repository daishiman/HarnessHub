---
graph_node_id: "feat-task-spec-test-strategy"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "testing-qa"
tags: ["macro-feature","testing-qa","task-spec","quality-gate","qa-076","qa-078","qa-079","qa-081","qa-134","decision-d8"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "タスク仕様書のテスト戦略必須化 (4レベル網羅・カバレッジ80%目標・層別方針の fail-closed 組込)"
owners: ["daishiman"]
created_at: "2026-07-24T20:58:52Z"
updated_at: "2026-08-02T11:52:52.665067Z"
status: "active"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","feat-doc-governance-portability","feat-mvp-first-scheduling"]
resource_scope: ["features/feat-task-spec-test-strategy.md"]
purpose: "タスク仕様書がテスト網羅を明記しない、あるいは書き方が実行ごとにぶれるため、実装後に「結合が通らない」「既存機能が壊れた」を後追いで発見している (qa-076/qa-079)。仕様生成の時点でテスト戦略を必須 section 化し欠落を機械的に拒否することで、何度実行しても同じ品質基準の仕様書が出る冪等な仕組みへ移す。あわせて、ボタン配置など見た目の微調整でテストが壊れる保守性崩壊 (qa-078) を、実装ではなく仕様段階の制約として先に封じる"
goal: "system-dev-planner が生成する P01..P13 タスク仕様書が、テストレベル選定 (単体・結合・境界値・回帰)・カバレッジ目標 (既定 80%、層別上書き可)・層別方針 (フロント behavior ベース / バックエンド API 契約+ロジック単体+DB 結合 / インフラ IaC 静的検証+デプロイ後 smoke)・保守性制約 (pixel 位置・DOM 構造依存の禁止、過剰テストを作らない線引き) の 4 項目を必須 section として持ち、欠落した仕様書は promotion 前に fail-closed で拒否され、同一入力の再生成で section 構成が冪等に一致する状態"
scope_in: ["タスク仕様書テスト戦略 section のスキーマ定義 (テストレベル選定・カバレッジ目標・層別方針・保守性制約の 4 項目)","system-dev-planner の task spec テンプレート (P01..P13) への必須 section 組込","テスト戦略 section 欠落を promotion 前に非0終了で拒否する fail-closed validator","変更内容の種別 (フロント/バックエンド/インフラ) からテストレベルと層別方針を導出する規則","層別テスト方針の明文化 (フロント= accessible role/ラベル選択の behavior ベース必須かつ pixel 位置・DOM 構造依存禁止、バックエンド= API 契約テスト+ビジネスロジック単体+DB 結合、インフラ= IaC/設定の静的検証+デプロイ後 smoke)","「どこまで管理するか」の線引き (実装詳細への密結合となる過剰テストを作らない基準) の仕様記述","同一 feature context での再生成における section 構成の冪等性検証"]
scope_out: ["テスト実行基盤 (Vitest / Playwright / @testing-library/react) の scaffold・設定・CI 配線","カバレッジ計測と未達時マージブロックの CI 実装","flaky 検出・quarantine・再実行ポリシーの運用実装","pixel 位置・DOM 構造依存を検出する lint の実装 (本 feature は仕様上の制約明記までを範囲とする)","Hub プロダクト本体機能 (Web/API/DB) のテストケース追加","既存タスク仕様書資産の一括再生成","P01..P13 exact-13 契約そのものの変更"]
acceptance: ["テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する","4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を全て持つ task spec が validator PASS する","同一 feature context で仕様生成を二回実行し、テスト戦略 section の項目集合と順序が一致する","生成された task spec のテストレベル選定が、変更内容の種別に対応する層別方針を含む","カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される","保守性制約に pixel 位置・DOM 構造依存の禁止が明記される","既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-task-spec-test-strategy.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-task-spec-test-strategy/7d185f453466523edcc7c6071fde7c24001612da367de329c10ba13c82a43bae/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-02T11:50:05Z","origin_kind":"system-spec-harness","source_digest":"8e8d4833fcbbbcab16ec7e9580472ce226b372d9cd0c9e0373fb88ef908e480d","source_path":"system-spec/testing-qa.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 testing-qa 章 qa-076/qa-078/qa-079/qa-081 と D8 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-task-spec-test-strategy.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-a4ks","linked_at":"2026-07-25T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T21:59:18Z","missing_sections":[],"status":"complete"}
---

# 目的

タスク仕様書がテスト網羅を明記しない、あるいは書き方が実行ごとにぶれるため、実装後に「結合が通らない」「既存機能が壊れた」を後追いで発見している (qa-076 / qa-079)。テスト戦略を仕様生成の時点で必須 section 化し、欠落を機械的に拒否することで、何度実行しても同じ品質基準の仕様書が出る冪等 (べきとう＝何回実行しても結果が同じ) な仕組みへ移す。

あわせて、ボタン配置など見た目の微調整でテストが壊れる保守性崩壊 (qa-078) を、実装時の努力目標ではなく**仕様段階の制約**として先に封じる。テストを書くこと自体より、「壊れにくいテストしか書けない仕様にすること」が本 feature の価値である。

## 到達状態

system-dev-planner が生成する P01..P13 タスク仕様書が、次の 4 項目を必須 section として持つ。

1. **テストレベル選定** — 単体 / 結合 / 境界値 / 既存回帰の 4 レベルのうち、対象変更に対しどれを追加・実行するか (qa-076)
2. **カバレッジ目標** — 既定 80%、層別に上書き可能 (qa-077)
3. **層別方針** — フロント / バックエンド / インフラのどの方針を適用するか (qa-078)
4. **保守性制約** — pixel 位置・DOM 構造への依存禁止、過剰テストを作らない線引き (qa-078)

欠落した仕様書は promotion 前に fail-closed (条件を満たさないときは通さずに止める) で拒否され、同一入力の再生成では section 構成が冪等に一致する。

## スコープ

- スコープ内:
  - タスク仕様書テスト戦略 section のスキーマ定義 (上記 4 項目)
  - system-dev-planner の task spec テンプレート (P01..P13) への必須 section 組込
  - テスト戦略 section 欠落を promotion 前に非0終了で拒否する fail-closed validator
  - 変更内容の種別 (フロント / バックエンド / インフラ) からテストレベルと層別方針を導出する規則
  - 層別テスト方針の明文化
    - フロント: accessible role / ラベルでの要素選択による behavior ベースを必須とし、pixel 位置・DOM 構造依存を禁止
    - バックエンド: API 契約テスト + ビジネスロジック単体 + DB 結合テスト
    - インフラ: IaC / 設定の静的検証 + デプロイ後 smoke テスト
  - 「どこまで管理するか」の線引き (実装詳細への密結合となる過剰テストを作らない基準) の仕様記述
  - 同一 feature context での再生成における section 構成の冪等性検証
- スコープ外:
  - テスト実行基盤 (Vitest / Playwright / @testing-library/react) の scaffold・設定・CI 配線
  - カバレッジ計測と未達時マージブロックの CI 実装
  - flaky (実行するたび結果が変わる不安定テスト) 検出・quarantine・再実行ポリシーの運用実装
  - pixel 位置・DOM 構造依存を検出する lint の実装 (本 feature は仕様上の制約明記までを範囲とする)
  - Hub プロダクト本体機能 (Web / API / DB) のテストケース追加
  - 既存タスク仕様書資産の一括再生成
  - P01..P13 exact-13 契約そのものの変更

## 受入

- [ ] テスト戦略 section を欠いた task spec 入力に対し validator が非0終了で拒否する
- [ ] 4 項目 (テストレベル選定・カバレッジ目標・層別方針・保守性制約) を全て持つ task spec が validator PASS する
- [ ] 同一 feature context で仕様生成を二回実行し、テスト戦略 section の項目集合と順序が一致する
- [ ] 生成された task spec のテストレベル選定が、変更内容の種別に対応する層別方針を含む
- [ ] カバレッジ目標が既定 80% で表現され、層別に上書き可能な形で記録される
- [ ] 保守性制約に pixel 位置・DOM 構造依存の禁止が明記される
- [ ] 既存の P01..P13 exact-13 契約と 13-node DAG 検査が非退行である

## アーキテクチャ参照

- `architecture_refs`: `arch-harness-hub-testing-qa`
- 由来する確定仕様: `system-spec/testing-qa.md` (qa-076 / qa-078 / qa-079 / qa-081、意思決定 D8)
- 上流指針: Google SRE の reliability / operations concern (testing-qa 章の doctrine anchor)

## 機能間依存

- `depends_on`: (なし)
- 依存理由: 変更対象が `plugins/system-dev-planner` の仕様生成契約に閉じており、Hub プロダクト本体の実装 feature を前提としない。テスト**実行**基盤 (Vitest / Playwright) はスコープ外のため、基盤未整備でも本 feature は単独で完了できる。関連する `feat-dev-pipeline-improvement` (done) / `feat-doc-governance-portability` / `feat-mvp-first-scheduling` とは同じ dev pipeline 領域を触るが、担当する契約が異なるため順序依存ではなく `related_nodes` で表現する。

## Handoff

- per-feature planning: ready 時に system-dev-planner (`run-system-dev-plan`) を起動、または人間の手動 `/system-dev-plan` 実行結果を同じ登録経路として受理する
- 生成物: P01..P13 exact 13 executable task specs + 13-node intra-feature DAG
- 登録先: 全 task を同一 `parent_feature` / `feature_package_id` で C02 経由 atomic 登録。expected/applied=13 必須
- 完了 rollup: exact 13 全 done + P07 / P10 / P11 evidence が上記「受入」を満たす場合だけ done

## 2026-07-30 横断適用: slide-report-generator browser CI

`HarnessHub-nznu` / `task-slide-report-generator-browser-ci-20260730` で、
本 feature が定義したテスト戦略を `slide-report-generator` の実ブラウザ検証へ
横断適用した。これは scope_out の「CI 配線」を本 feature 自身へ追加する変更ではなく、
独立 task が確定済み qa-076〜qa-081 を利用した実装フィードバックである。

- 単体: workflow の trigger、working directory、install/test/check 順序を pytest で固定。
- 結合・受入: plugin-local Chromium を実起動し、16:9 と 2 slide screenshot を確認。
- 境界値: global browser cache を成功根拠にせず、plugin-local path 包含を最終 check。
- 回帰: EVALS、`npm test`、GitHub Actions の三経路へ同じ受入試験を接続。

正本は `system-spec/testing-qa.md` の qa-109、設計は
`architecture/harness-hub-testing-qa.md`、task 仕様書は
`tasks/task-slide-report-generator-browser-ci-20260730.md`、判断と証拠は
`docs/features/feat-task-spec-test-strategy/slide-report-browser-ci-spec-reflection-receipt.md`
を参照する。

## 2026-08-02 C12 再実行コマンドの改善

`HarnessHub-ji8y` で、task spec が公開後も記載どおり検証できるようにした。
生成中の内部検証は実 staging path を使い、公開 task spec は
`--feature-package <self-package-id>` から current generation を解決する。
contract 1.3.0 の validator は `--staging`、flag 欠落、package mismatch を
CommonMark の fenced/inline code から検出し、旧 immutable package は従来契約で守る。
仕様・設計・検証の対応は
`docs/features/feat-task-spec-test-strategy/rerun-command-spec-reflection-receipt.md`
を正とする。
