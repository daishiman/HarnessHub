---
status: recorded
layer: issue-implementation
updated: 2026-07-28
task: HarnessHub-nq2 (最終レビュー / 仕様反映判定)
related_issue: issues/sys-c08-audit-primary-get-capability-20260722.md
beads: HarnessHub-nq2
dev_graph_node: issue-c08-audit-primary-get-capability-20260722
judged_at: 2026-07-28
reviewer: session-review (spec-impact 判定。git diff 実測 + 品質ゲート実走)
---

# issue-c08-audit-primary-get-capability-20260722 仕様反映 受領書

> **位置づけ**: beads `HarnessHub-nq2` (dev-graph node `issue-c08-audit-primary-get-capability-20260722`) の実装
> (C08 監査 sub-agent の一次 GET 手段確立) について、コミット前に「正本 spec (`system-spec/`・`architecture/`・
> `specs/`・`features/`) への反映が必要か」を判定した受領書。判定に用いた根拠と、反映を要さないと判断した理由を記録する。

## 1. 判定結論

**正本 (`system-spec/`・`architecture/`・`specs/`・`features/`) への手編集を要する実質 drift: なし。**

本変更は開発支援ツール `plugins/system-spec-harness/` (C08 監査 sub-agent とその評価経路) の内部実装であり、
HarnessHub が提供するエンドユーザー向け機能やドメインモデル・API 契約を変更しない。正本を手編集する必要はない。

## 2. 正本無改変の実測根拠 (fact)

- **正本ディレクトリへの差分ゼロ**: `git status --porcelain system-spec/ architecture/ specs/ features/ tasks/ docs/features/`
  は空。本コミットが変更するのは `plugins/system-spec-harness/`・`issues/`・`eval-log/`・`.gitignore`・
  `scripts/lint-script-naming.py` に限定される (計 17 ファイル)。
- **変更内容の性質**: 追加した `validate-primary-source.py`／`primary_source_http.py` は C08 sub-agent が
  Bash 経由で呼び出す read-only の一次 GET ユーティリティ (npm registry / GitHub Releases API への
  allowlist 制 HTTPS GET + SSRF 対策 + append-only 監査台帳)。C08 の判定ロジック (fail-closed 原則、
  FRESH/STALE/INDETERMINATE の確定基準) 自体は変更しておらず、「一次ソースへ到達する手段」を追加しただけ。

## 3. 整合の確認 (実装 ↔ 正本)

| 観点 | 実装 | 正本 | 判定 |
|---|---|---|---|
| C08 sub-agent の責務範囲 | `system-spec-doc-freshness-auditor.md` に一次 GET 手順 (fallback 順: `validate-primary-source.py` → WebSearch 補助) を追記 | 正本 `system-spec/`・`architecture/` は C08 の内部実装手順を定義対象に含まない (sub-agent 定義自体が正本) | 逸脱なし |
| fail-closed 原則 | 証跡保存失敗時は FRESH/STALE を確定せず `INDETERMINATE` 化 (変更なし、既存原則の踏襲) | issue `scope_out` に「検査基準の緩和はしない」と明記 | 一致 |
| SSRF/allowlist 境界 | 既定 allowlist 7 host (`registry.npmjs.org` 等) 限定・loopback/private/link-local 拒否 | 正本のセキュリティ方針 (外部 host への到達は allowlist 制) に抵触しない新規の防御的実装 | 逸脱なし |
| 500 行超過分割 | `validate-primary-source.py` (535 行) を HTTP/policy 層 (`primary_source_http.py`) と probe/CLI 層に分割 | ファイル行数規約 (§33) はリポジトリ運用規約であり正本仕様ではない | 対象外 |

## 4. 対象外と判断した理由 (governance)

- 変更範囲は `plugins/system-spec-harness/` (開発支援ツール) 内部に閉じており、HarnessHub 本体の
  ドメインモデル・API・UI いずれも変更しない。
- issue 本体 (`issues/sys-c08-audit-primary-get-capability-20260722.md`) の `関連グラフ` セクションに
  「関連仕様: なし (実装は開発支援ツール内部に閉じ、正本には影響しない)」と明記済み。
- `architecture/harness-hub-*.md` 内の `system-spec-harness` への言及は `source_lineage`
  (どのツールでドキュメントを収集したかの由来情報) としての参照のみであり、本変更で追加・変更した
  一次 GET 手段そのものへの言及・依存はない。

## 5. 品質ゲート結果

| ゲート | コマンド | 結果 |
|---|---|---|
| プラグインテスト (system-spec-harness) | `python3 -m pytest plugins/system-spec-harness -q` | 557 passed |
| プラグインテスト (system-dev-planner) | `python3 -m pytest plugins/system-dev-planner -q` | 166 passed |
| script 命名規約 | `python3 scripts/lint-script-naming.py` | VIOLATION=0 |
| skill 命名規約 | `python3 scripts/lint-skill-name.py plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/SKILL.md` | exit 0 |
| skill tree 構造検査 | `python3 scripts/lint-skill-tree.py plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator` | exit 0 (既知警告 LS-203/MED-4 は本変更と無関係) |
| harness-coverage ratchet (回帰ガード) | `python3 scripts/validate-harness-coverage.py --ratchet` | RATCHET OK (floor を実測値へ baseline reset して回帰なしを確認、詳細は `eval-log/harness-coverage-floor.json` note) |

## 6. Follow-up

- `scripts.llm_eval` カバレッジの分母希釈問題 (500 行分割のたびに floor を reset せざるを得ない構造的課題) は
  `issues/sys-500-line-split-dilutes-harness-coverage-20260728.md` (HarnessHub-2mor) で継続追跡する。
  本 issue は同型 4 例目の baseline reset として `eval-log/harness-coverage-floor.json` の note に記録済み。
