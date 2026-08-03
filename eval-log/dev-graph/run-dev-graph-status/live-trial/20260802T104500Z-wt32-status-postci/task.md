# タスク: dev-graph:run-dev-graph-status の CI 修復再実走

scenario は `C18-OUT1-positive-read-only-status` です。被験 fixture は次の初期化済み
独立 Git repository です。

`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-status-postci`

次の Skill 呼出しを最初の実行アクションにし、内部 script の直実行や Task / Agent
への委譲で skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-status", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-status-postci"})

## goal-seek 契約

SKILL.md の original_goal を使い、fixture の `eval-log/` に次の 3 点を作成してください。

- `run-dev-graph-status-goal-spec.json`
- `run-dev-graph-status-progress.json`
- `run-dev-graph-status-intermediate.jsonl`

intermediate の 1 行目は Skill 実行前に作成し、実行と検証後は 2 行目だけを append
してください。各行には `original_goal`、`original_goal_hash`、
`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、
`drift_signal` の 6 キーが必要です。original_goal_hash は正本文の UTF-8 SHA-256
実値にしてください。progress は全条件の実測後に completed / PASS と具体的 evidence
へ更新し、pending と evidence null を残さないでください。

実行と機械検証後、fresh Agent を 1 つ fork して、下記3観測とgoal-seek証拠だけを
独立評価させてください。完了マーカーはAgent評価の後に書くため、Agentは
`out/status.json` の不在をblockerにしてはいけません。Agentの判定とblockerは一字も
改変・省略せず `eval-log/independent-verification.json` に保存してください。
FAILなら修正や再評価で上書きせず、このrunをFAILで終えてください。

## required_observations（scenario 正本の逐語転記）

1. the reported status, closed_at and dependency edges equal the values stored in the graph store, compared field by field rather than by summary count
2. the dependent task is reported as blocked by its predecessor and the predecessor as ready
3. the run leaves graph, config, content and GitHub state unchanged

## 完了契約

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを書いてください。

`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-status/live-trial/20260802T104500Z-wt32-status-postci/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C18-OUT1-positive-read-only-status"}`。
`out/` には status.json 以外を書かず、最後は `DONE: <status>` の 1 行だけを報告して
ください。途中で人間へ質問せず、fixture 以外の repository を変更しないでください。
