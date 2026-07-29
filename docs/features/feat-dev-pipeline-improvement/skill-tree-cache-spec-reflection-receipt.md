---
layer: feature-spec-reflection
feature_id: feat-dev-pipeline-improvement
graph_node_id: issue-lint-skill-tree-pytest-cache-false-positive-20260726
beads_id: HarnessHub-xswf
status: recorded
updated: 2026-07-29
---

# skill tree cache 偽陽性修正 — 仕様反映受領書

## 1. 目的と背景

`lint-skill-tree.py` の第13条は、人が設計した skill directory の深さを検査する。
しかし per-plugin pytest が生成した `.pytest_cache/v/cache` も同じ構造として数え、
続けて repository criteria test を実行すると 7 件の偽陽性を発生させていた。

本変更は、test tool の生成物と人が管理する skill tree の境界を明確にし、
テストの実行順序にかかわらず同じ品質判定を再現するための修正である。

## 2. 対象

| 項目 | 値 |
|---|---|
| Beads | `HarnessHub-xswf` |
| dev-graph node | `issue-lint-skill-tree-pytest-cache-false-positive-20260726` |
| branch | `devgraph/issue-lint-skill-tree-pytest-cache-false-positive-20260726` |
| base | `main` |
| task type | implementation / NON_VISUAL |

## 3. 実装

- `plugins/skill-governance-lint/scripts/lint-skill-tree.py`
  - `__pycache__` / `.pyc` の既存除外を維持した。
  - dot で始まる directory とその配下を、個別 tool 名を列挙せず構造判定から除外した。
  - 通常の `references/deep` などは引き続き第13条違反にする。
- `scripts/lint-skill-tree.py`
  - repository root の入口は上記 plugin script への symlink であり、同じ実装を参照する。
- `tests/scripts-plugins/test_skill_governance_lint__lint_skill_tree.py`
  - `.pytest_cache`、`.mypy_cache`、任意の `.tool-cache` を回帰検体にした。
  - root / plugin の同一バイト列を固定した。

## 4. 仕様・設計への影響判定

**影響あり**と判定した。製品機能は変わらないが、repository 内の開発品質ゲートが
「何を人の設計として検査し、何を一時生成物として除外するか」という判定契約を変更するためである。

影響境界は次のとおり。

- 変更する: skill 構造 lint、local desktop のテスト再現性、task の回帰証拠。
- 変更しない: Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit。

## 5. 正規フローでの反映

| 層 | 反映先 | 内容 |
|---|---|---|
| system-spec | `system-spec/spec-state.json` / `system-spec/testing-qa.md` | R4-reopen → qa-092 再確定。Windows / macOS の生成物境界を確定 |
| specs | `specs/harness-hub-system-specification.md` | repository tooling の受入契約を要約 |
| architecture | `architecture/harness-hub-testing-qa.md` | qa-092 の参照 wrapper と source digest を更新 |
| feature | `features/feat-dev-pipeline-improvement.md` | 実装履歴・影響境界・受領書導線 |
| task | P12 / P13 task spec | 品質ゲート再実行と仕様書き戻しを記録 |
| issue | `issues/sys-lint-skill-tree-pytest-cache-false-positive-20260726.md` | completion evidence と最終結果を記録 |

`system-spec/spec-state.json` は
`apply-spec-transition.py chunk` の単一 writer で `appr-013` / `qa-092` を追加し、
`testing-qa.desktop-windows` と `testing-qa.desktop-macos` を R4-reopen 後に再確定した。
章本文は `compile-spec-doc.py` で再生成した。
既存の qa-089 横断追補は今回の変更範囲外であるため、コンパイル後も内容を保持した。

## 6. 品質ゲート

2026-07-29 の最終レビューで次を再実行し、すべての blocking gate を通過した。

| ゲート | 結果 |
|---|---|
| focused pytest | `41 passed` |
| CI 実順序回帰 | 全21 per-plugin group 成功後、repository pytest `7626 passed, 5 skipped, 0 failed` |
| system-spec | coverage complete / source citation PASS / compile integration `7 passed` |
| task package | P01-P13 exact、validation PASS (`sha256:af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6`) |
| dev-graph | schema valid、source digest mismatch 0、対象 evidence dangling 0、open residue 0 |
| repository CI | `PASS 123 / WARN 4 / FAIL 0`。WARN は段階導入中の既知 advisory |
| package / docs | 22 plugin blocking failure 0、artifact placement PASS、tracked docs 500 行制限 PASS |

## 7. 残課題

`lint-skill-tree.py` の root / plugin 二重配置は現在 symlink で同一実装を参照しており、
本変更で追加の残課題は検出していない。500 行を超える変更対象ファイルも無い。
