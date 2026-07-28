---
status: confirmed
layer: feature-spec-reflection
task: HarnessHub-768b
parent_feature: feat-dev-pipeline-improvement
---

# C19 live-trial task 契約 — 仕様反映確認

## 対象

- Beads ID: `HarnessHub-768b`
- dev-graph node ID:
  `issue-c19-live-trial-task-fixture-contract-drift-20260726`
- 目的: C19 live-trial の task 前提と deterministic fixture の実体がずれ、正規の
  system-spec flow を実行不能にする再発を防ぐ。

## 結論

仕様影響は **なし** と判定した。本変更は dev-graph plugin の試験指示と fixture の
整合検査だけで、HarnessHub 製品の振る舞いや system-spec-harness の entry point 契約を
変更しない。

## 層別確認

| 層 | 反映 | 判断 |
|---|---|---|
| `plugins/dev-graph/` | あり | task 前提の契約、lint、回帰テストの正本 |
| `docs/` | あり | 最終レビュー、利用方法、仕様影響の判断証跡 |
| `features/` | あり | `feat-dev-pipeline-improvement` の follow-up 完了記録 |
| `issues/` | あり | standalone issue の受入条件と完了証跡 |
| `tasks/` | なし | 本件は exact-13 feature phase ではなく standalone issue。promoted task spec の手編集は source integrity を壊すため行わない。P10 の `resource_scope` が更新対象の `final-review.md` を既に参照する |
| `system-spec/` | なし | API、state、security、UI、deployment、運用 SLO の確定事項に変更なし |
| `specs/` | なし | 製品要求・外部契約の追加や変更なし |
| `architecture/` | なし | deploy unit、component 境界、データフロー、技術選定に変更なし |

## 技術的な判断根拠

変更対象は `shape_system_spec.py` の `TASK_CONTRACT`、scenario JSON、task premise
lint とそのテストで閉じている。正規 4 entry point の集合は
`plugins/system-spec-harness/references/package-contract.json` と回帰テストで突合するが、
entry point 本体の宣言や実装は変更しない。したがって製品仕様層へ plugin 内部契約を
複製すると二重正本になる。

500 行を超えていた lint は、CLI／report と契約解析 module に分けた。さらに
scenario ID 欠落を `LT-001`、被験 skill 名のずれを `LT-006` として fail-closed にした。

## 検証

- focused pytest: `29 passed`
- lint `--all`: checked `1`、violation `0`
- fixture の配置入力: `requirements-brief.md` のみ
- fixture の未配置成果物: `spec-state.json`、`fetched-references.json`、
  `completeness-report.json`、`index.md`
- 既存 fresh PASS evidence:
  `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260726T050519Z-sysspec-final2/`

PR 作成直前には `scripts/build-spec-reflection-receipt.py` を
`--spec-impact none` と本判断理由で実行し、branch と最終 HEAD に束縛した受領書を
git common directory に記録する。
