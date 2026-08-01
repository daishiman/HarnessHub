# タスク: dev-graph:run-dev-graph-schedule の実走 (scenario C15-OUT1-positive-ready-set-r16)

この run は scenario C15-OUT1-positive-ready-set-r16 の充足を確認するものです。

必須観測:

1. the overlapping resource_scope pair is never placed in the same batch
2. the blocked task is excluded from the ready set and the reason is reported
3. the active lease suppresses its task while the stale lease is reclaimed
4. batches respect --max-parallel and suggested_branch and worktree claim commands stay unique

この task.md を読んだ直後の最初の tool call は、必ず次の Skill 呼び出しにしてください。
Skill より前に Read、Task、Agent、Bash などで調査してはいけません。内部 script の直接実行で
Skill 本体を代替してはいけません。

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-15/eval-log/dev-graph/live-trial-fixtures/schedule-fcth-20260730-finalmain-r3 --max-parallel 2"})

skill の goal-seek 契約に従い、fixture の `eval-log/` に
`run-dev-graph-schedule-goal-spec.json`、
`run-dev-graph-schedule-progress.json`、
`run-dev-graph-schedule-intermediate.jsonl` を作成してください。
intermediate は Skill 実行前の行を先に書き、実行・検証後の行だけを append してください。

特に、未完了依存を持つ LT-SCHED-005 が ready set に入らず、実行 receipt の unmapped に
`reason="dependency_unsatisfied"` と `blocking_depends_on=["LT-SCHED-001"]` を伴って
報告されることを確認し、progress evidence に具体的に記録してください。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/orca/workspaces/HarnessHub/wt-15/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260730T134837Z-fcth-schedule-finalmain-r3/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status":"PASS|FAIL|ERROR","scenario":"C15-OUT1-positive-ready-set-r16"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- fixture 以外の repository を変更しないこと。
- out/ には status.json 以外を書かないこと。
