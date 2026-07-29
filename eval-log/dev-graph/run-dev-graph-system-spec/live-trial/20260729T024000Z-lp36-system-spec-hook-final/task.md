# タスク: dev-graph:run-dev-graph-system-spec の共有 hook 更新後実走

scenario は `C19-OUT1-positive-system-spec-lineage` です。次を実行してください。

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/system-spec-lp36-hook-final"})

被験 fixture は次の初期化済み独立 Git repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/system-spec-lp36-hook-final`

fixture が置く業務入力は `system-spec/requirements-brief.md` だけです。
`spec-state.json`、`fetched-references.json`、`completeness-report.json`、`index.md` は
先回りして存在しません。

R0-context / R1-preflight 後、次の 4 entry point をすべて Skill ツールで委譲実行し、
script 直実行で代替しないでください。

1. `system-spec-harness:run-system-spec-elicit`
2. `system-spec-harness:run-system-spec-doc-fetch`
3. `system-spec-harness:run-system-spec-compile`
4. `system-spec-harness:assign-system-spec-completeness-evaluator`

必須観測:

- system-spec-harness plugin の正規 flow が完走する。
- specification / architecture は source_lineage と confirmation_evidence を保持する。
- 登録は C02 `upsert-node.py` writer だけを使い、重複 elicitation / compile logic を
  dev-graph に作らない。
- goal-seek 3 点セットは必須 6 キー、正しい hash、Skill 前 1 行目と実行後 append の
  2 行目、pending / evidence null なしを満たす。

成功・失敗・中断のいずれでも最後に次の 1 ファイルだけを書きます。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260729T024000Z-lp36-system-spec-hook-final/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C19-OUT1-positive-system-spec-lineage"}`。
最後は `DONE: <status>` の 1 行だけを報告し、fixture 以外を変更しないでください。
