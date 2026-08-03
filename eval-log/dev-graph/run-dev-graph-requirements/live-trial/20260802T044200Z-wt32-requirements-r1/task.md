# タスク: requirements live trial

scenario `C04-OUT1-positive-ready-handoff` を、次の隔離 fixture で実行してください。

fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-requirements-r1`

必ず次の Skill ツールを 1 回起動してください。内部 script の直実行で skill 本体を代替してはいけません。

`Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-requirements-r1 --feature-id F-LIVE-001 (package は fixture 内 system-plan/F-LIVE-001/ を skill が解決する)"})`

fixture の `eval-log/` に、実行前の 1 行目と実行後に append する 2 行目を持つ次の正確な 3 ファイル名で goal-seek 証跡を作成してください。

- `run-dev-graph-requirements-goal-spec.json`
- `run-dev-graph-requirements-progress.json`
- `run-dev-graph-requirements-intermediate.jsonl`

source-digest gate は feature、architecture、exact-13 tasks の全 15 node を同時に検証し、除外してはいけません。`goal_seek.fork: subagent` 契約どおり、分離 context の独立検証を少なくとも 1 回実行してください。

required_observations（scenario 正本の逐語転記）:

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the requirements skill generates no implementation source file

完了時は `out/status.json` だけを `{"status":"PASS|FAIL|ERROR","scenario":"C04-OUT1-positive-ready-handoff"}` 形式で書き、最後に `DONE: <status>` と 1 行だけ報告してください。途中で人間に質問せず最後まで自走し、skill の手順に忠実に従い、人手の追加判断・省略をしないでください。
