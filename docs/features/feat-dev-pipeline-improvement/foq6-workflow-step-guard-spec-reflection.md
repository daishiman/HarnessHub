---
layer: feature-spec-reflection
status: recorded
feature: feat-dev-pipeline-improvement
beads_id: HarnessHub-foq6
dev_graph_node_id: issue-workflow-step-guard-empty-scan-20260728
updated: 2026-07-29
---

# workflow step guard 空走査 fail-closed — 仕様反映受領書

## 目的と背景

`lint-workflow-step-guard.py` は「workflow に検査 step が書かれていても、条件が恒久 false
なら実行されない」欠陥を防ぐ。しかし検査器自身が directory 不在・YAML 0 件を exit 0
にしていたため、「違反 0 件」と「1 件も検査していない」を区別できなかった。

## 結論

仕様・設計への影響はある。影響は Harness Hub repository の開発品質ゲートだけで、
製品 API、DB schema、認証認可、UI、Cloudflare deploy unit には影響しない。

## 中学生向けの説明

学校の持ち物検査で「忘れ物は 0 個でした」と言っても、実は誰のかばんも見ていなければ
検査したことにはならない。今回の変更は、かばんを 1 個も見ていないときは合格にせず、
「今日は検査対象が無い」と明示した場合だけ例外として認める仕組みである。

## 技術的な説明

- `--workflows-dir` が存在しない、または `*.yml` / `*.yaml` が 0 件なら exit 1。
- 単独配布物など意図的な空走査は `--allow-empty` を指定した場合だけ exit 0。
- 通常の CI、`make lint`、pre-push は `--allow-empty` を使わず、検査件数を出力する。
- missing / empty / allow-empty を専用 CLI テストへ分離し、包括テストを 500 行未満に戻した。
- `--allow-empty` を付けても実 workflow の違反は exit 1 のままになる負例を固定した。

## 正規フローの反映

- 承認記録: `system-spec/spec-state.json` `appr-013`
- 確定質疑: `system-spec/spec-state.json` `qa-092`
- 確定章: `system-spec/dev-workflow.md`
- 仕様 wrapper: `specs/harness-hub-system-specification.md`
- 設計: `architecture/harness-hub-dev-workflow.md`
- feature: `features/feat-dev-pipeline-improvement.md`
- task: `tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p11.md` /
  `sys-dev-pipeline-improvement-p12.md`

## 変更ファイル

- `scripts/lint-workflow-step-guard.py`
- `tests/scripts-root/test_root__lint_workflow_step_guard.py`
- `tests/scripts-root/test_root__lint_workflow_step_guard_empty_scan.py`
- `issues/sys-workflow-step-guard-empty-scan-20260728.md`
- 上記「正規フローの反映」に列挙した仕様・設計・説明文書

## 検証結果

- focused pytest: 41 passed
- self-test: 9 checks passed
- repository workflow scan: 10 workflows / 0 violations
- 行数: 実装 497 / 包括テスト 482 / 空走査テスト 66
- system-spec coverage: complete + foundation PASS
- completeness evaluator: PASS（C07/C06/C08 の fork 台帳を同一 session で照合）
- task spec gate: PASS（published baseline contract 1.1.0 /
  `contract_baseline_exemption=true` / test strategy `legacy`）
- Dev Graph: source-digest / evidence-ref / schema gate PASS
- `make lint`: PASS
- CI 等価チェック: PASS 123 / WARN 4（既存・非 blocking）/ FAIL 0

## 残課題

本変更の実装・仕様反映に blocking な残課題はない。C08 が検出した drizzle-orm /
Playwright の medium 2 件と pnpm / Zod の low 2 件は本変更と非関連の出典鮮度追跡として
既存 Beads `HarnessHub-e2u` で管理する。C06 が再確認した qa-070 系譜の既知課題は
`HarnessHub-5rb` で管理する。draft PR 作成後の remote CI 結果は PR 上で確認する。
