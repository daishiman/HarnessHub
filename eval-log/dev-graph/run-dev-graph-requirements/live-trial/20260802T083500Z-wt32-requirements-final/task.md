# タスク: requirements live trial r2

scenario `C04-OUT1-positive-ready-handoff` を、次の隔離 fixture で実行してください。

fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-requirements-final`

必ず次の Skill ツールを 1 回起動してください。内部 script の直実行で skill 本体を代替してはいけません。

`Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-requirements-final --feature-id F-LIVE-001 (package は fixture 内 system-plan/F-LIVE-001/ を skill が解決する)"})`

## goal-seek 証跡の厳格契約

fixture の `eval-log/` に次の正確な 3 ファイル名を作成してください。

- `run-dev-graph-requirements-goal-spec.json`: JSON object 1 個だけ。JSONL にしない。
- `run-dev-graph-requirements-progress.json`: JSON object 1 個だけ。全 checklist の status/evidence を持つ。
- `run-dev-graph-requirements-intermediate.jsonl`: Skill 実行前に 1 行目を作り、実行・検証後に 2 行目だけを append する。後から 2 行をまとめて書かない。

`intermediate.jsonl` の各行は、同一の `original_goal` とその正しい UTF-8 SHA-256 を使い、`original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal` の 6 key をすべて持たせてください。1 行目も省略不可です。SKILL.md の検証 script を実行し PASS を確認してください。

source-digest gate は feature、architecture、exact-13 tasks の全 15 node を同時に検証し、除外してはいけません。`goal_seek.fork: subagent` 契約どおり、分離 context の独立検証を少なくとも 1 回実行してください。

## required_observations（scenario 正本の逐語転記）

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the requirements skill generates no implementation source file

完了時は `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260802T083500Z-wt32-requirements-final/out/status.json` だけを `{"status":"PASS|FAIL|ERROR","scenario":"C04-OUT1-positive-ready-handoff"}` 形式で書き、最後に `DONE: <status>` と 1 行だけ報告してください。fixture の `out/status.json` へ書いて代替してはいけません。途中で人間に質問せず最後まで自走し、skill の手順に忠実に従い、人手の追加判断・省略をしないでください。
