# タスク: dev-graph:run-dev-graph-schedule の CI 証跡再実走

scenario `C15-OUT1-positive-ready-set-r16` を次の隔離 fixture で実走してください。

## required_observations（scenario 正本の逐語転記）

1. the overlapping resource_scope pair is never placed in the same batch
2. the blocked task is excluded from the ready set and the reason is reported
3. the active lease suppresses its task while the stale lease is reclaimed
4. batches respect --max-parallel and suggested_branch and worktree claim commands stay unique

この task.md を読んだ直後の最初の tool call は、必ず次の Skill 呼び出しにしてください。Skill より前に Read、Task、Agent、Bash などで調査せず、内部 script の直接実行で Skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260803-wt32-ci-schedule-r1 --max-parallel 2"})

fixture の `eval-log/` に次の正確な 3 ファイル名で goal-seek 証跡を作成してください。`run-dev-graph-schedule-goal-spec.json`、`run-dev-graph-schedule-progress.json`、`run-dev-graph-schedule-intermediate.jsonl`。intermediate の各行は同一の `original_goal` と正しい UTF-8 SHA-256 を用い、`original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal` の 6 key をすべて持たせる。SKILL.md の検証 script を実行し PASS を確認してください。

LT-SCHED-005 は未完了依存のため ready set から除外し、receipt の unmapped に `reason="dependency_unsatisfied"` と `blocking_depends_on=["LT-SCHED-001"]` を記録してください。active lease と stale lease、overlapping resource_scope、max parallel=2、branch/claim uniqueness を fixture の graph・lease と実行結果から独立に検証してください。

SKILL.md が指定する `dev-graph:dev-graph-parallel-safety-verifier` を分離 context で起動し、その Task が最終結果を返すまで必ず待ってください。background の `running` 状態、timeout、または別 path を読んでいる状態では完了扱いにせず、同じ Task の結果を再取得してください。トップレベル session の inline Python や自己検証を C17 verifier の代替にしてはいけません。verifier の明示的な PASS と根拠を progress evidence に記録してから status.json を書いてください。DONE 時点で background task を 1 件も残してはいけません。

完了時は `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260803T011300Z-wt32-ci-schedule-r1/out/status.json` だけを `{"status":"PASS|FAIL|ERROR","scenario":"C15-OUT1-positive-ready-set-r16"}` 形式で書き、最後に `DONE: <status>` と 1 行だけ報告してください。途中で人間に質問せず最後まで自走し、skill の手順に忠実に従い、人手の追加判断・省略をしないでください。fixture 以外の repository は変更しないでください。
