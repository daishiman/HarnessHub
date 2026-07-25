# Harness Hub testing-qa アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/testing-qa.md](../system-spec/testing-qa.md) (sha256: `fd302fb5f8f8…` (完全値は frontmatter source_lineage.source_digest))

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260724-testing-qa-r2.json`)
- 取込日時: 2026-07-24T12:35:34Z / plugin: system-spec-harness v0.1.0

## 確定内容の要点 (参照のみ・正本は上記)

- **テストレベル網羅 (qa-070)**: タスク仕様書は単体・結合・境界値・既存回帰の 4 レベルを必須テスト戦略セクションとして持ち、変更内容からテスト種別を導出する。
- **カバレッジ品質ゲート (qa-071)**: 80% 以上 (変更対象 line/branch 既定・層別調整可) を CI で機械検証。失敗・未達はマージ停止のうえ改善ループ (失敗分析→修正→再実行) へ。数値の目的化は禁止し behavior 検証を優先。
- **層別方針と保守性 (qa-072)**: FE=component 単体 + 操作フロー結合 (behavior ベース、accessible role/ラベル選択、pixel/DOM 構造依存の禁止)、BE=API 契約 + ロジック単体 + DB 結合、インフラ=IaC 静的検証 + デプロイ後 smoke。
- **冪等な仕組み化 (qa-073/qa-075)**: テスト戦略セクションをタスク仕様書テンプレート必須項目とし、system-dev-planner の task spec 必須 section 契約で機械検証、欠落は fail-closed で拒否。
- **platform 境界 (qa-074)**: CI 実行=web 行、作者ローカル実行=desktop-windows/desktop-macos 行。mobile/tablet/desktop-linux は対象外。
- **ツール確定 (D8)**: Vitest (単体・結合) + Playwright (E2E) + @testing-library/react (UI コンポーネント、behavior ベース) の 3 点構成。

## 上流指針 (doctrine anchor)

- reliability + operations (Google SRE)。doctrine-anchor-registry.json の pending_exceptions に approved 登録済み (owner: daishiman, 2026-07-24)。
