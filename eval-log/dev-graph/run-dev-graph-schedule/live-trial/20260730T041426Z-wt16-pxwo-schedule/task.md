# タスク: dev-graph:run-dev-graph-schedule の scenario 契約付き実走

scenario は `C15-OUT1-positive-ready-set-r16` です。被験 fixture は次の初期化済み独立
Git repository です。

`/Users/dm/orca/workspaces/HarnessHub/wt-16/eval-log/dev-graph/live-trial-fixtures/20260730T041426Z-wt16-pxwo-schedule`

次の Skill 呼出しを最初の実行アクションにし、内部 script の直実行で skill 本体を
代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-16/eval-log/dev-graph/live-trial-fixtures/20260730T041426Z-wt16-pxwo-schedule --max-parallel 2"})

skill の手順に忠実に従い、人手の追加判断・省略をせず、途中で人間に質問せず最後まで
自走してください。fixture と、この task に明記した host 側の完了マーカー・証拠以外は
変更しないでください。

## scenario required_observations（逐語）

次の 4 項目をすべて実測してください。要約・言い換え・取捨選択は禁止です。

1. the overlapping resource_scope pair is never placed in the same batch
2. the blocked task is excluded from the ready set and the reason is reported
3. the active lease suppresses its task while the stale lease is reclaimed
4. batches respect --max-parallel and suggested_branch and worktree claim commands stay unique

## goal-seek 契約

SKILL.md の original_goal を使い、fixture の `eval-log/` に次の 3 点を作成してください。

- `run-dev-graph-schedule-goal-spec.json`
- `run-dev-graph-schedule-progress.json`
- `run-dev-graph-schedule-intermediate.jsonl`

intermediate の 1 行目は Skill 実行前に作成し、実行と検証後は 2 行目だけを append
してください。各行には `original_goal`、`original_goal_hash`、
`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、
`drift_signal` の 6 キーが必要です。original_goal_hash は正本文の UTF-8 SHA-256
実値にしてください。progress は全条件の実測後に completed / PASS と具体的 evidence
へ更新し、pending と evidence null を残さないでください。

## 証拠契約

実行後、fixture の graph・schedule receipt・lease snapshot・goal-seek 成果物を独立に
読み直して 4 観測を再計算し、次の 1 ファイルへ JSON で保存してください。

`/Users/dm/orca/workspaces/HarnessHub/wt-16/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260730T041426Z-wt16-pxwo-schedule/evidence/schedule-execution.json`

JSON は `scenario_id` と `observations` を持ち、`observations` は `"1"`〜`"4"` の各
キーに、逐語の observation、実測値、fixture 内の根拠 path を記録してください。
同じ receipt の申告を言い換えるだけでなく、graph / lease authority から再計算した値と
突き合わせてください。

## 完了契約

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを書いてください。

`/Users/dm/orca/workspaces/HarnessHub/wt-16/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260730T041426Z-wt16-pxwo-schedule/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C15-OUT1-positive-ready-set-r16"}`。
`out/` には status.json 以外を書かず、最後は `DONE: <status>` の 1 行だけを報告して
ください。
