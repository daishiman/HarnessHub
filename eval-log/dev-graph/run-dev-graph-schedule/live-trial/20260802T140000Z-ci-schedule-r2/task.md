# C15 live trial: run-dev-graph-schedule

質問せず最後まで自走し、fixture だけを変更する。最初の実行アクションは次の literal Skill 呼出しであり、script の直接実行で代替しない。

```
Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/schedule-ci-rerun-r2-20260802 --max-parallel 2"})
```

skill の goal-seek を完全に保存する。fixture の `eval-log/` に、次の3ファイルを正確な名前で作る: `run-dev-graph-schedule-goal-spec.json`、`run-dev-graph-schedule-progress.json`、`run-dev-graph-schedule-intermediate.jsonl`。progress は execution の結果を具体的な checklist / status / evidence として記録し、goal-seek 検証を実行して PASS を確認する。

指定の ready set を実測し、以下4観測の根拠を `eval-log/independent-verification.json` に保存する。fresh Agent を少なくとも1回 fork し、親セッションの自己評価で代替しない。

1. the overlapping resource_scope pair is never placed in the same batch
2. the blocked task is excluded from the ready set and the reason is reported
3. the active lease suppresses its task while the stale lease is reclaimed
4. batches respect --max-parallel and suggested_branch and worktree claim commands stay unique

終了時に out/status.json のみへ `{"status":"PASS|FAIL|ERROR","scenario":"C15-OUT1-positive-ready-set-r16"}` を書き、最後は `DONE: <status>` の1行だけにする。
