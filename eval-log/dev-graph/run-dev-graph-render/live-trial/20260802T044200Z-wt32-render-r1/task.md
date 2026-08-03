# タスク: render live trial

scenario `C05-OUT1-positive-feature-progress` を、次の隔離 fixture で実行してください。

fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-render-r1`

必ず次の Skill ツールを 1 回起動してください。内部 script の直実行で skill 本体を代替してはいけません。

`Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-render-r1"})`

fixture の `eval-log/` に、実行前の 1 行目と実行後に append する 2 行目を持つ次の正確な 3 ファイル名で goal-seek 証跡を作成してください。

- `run-dev-graph-render-goal-spec.json`
- `run-dev-graph-render-progress.json`
- `run-dev-graph-render-intermediate.jsonl`

required_observations（scenario 正本の逐語転記）:

1. the rendered HTML and CSS open with no additional runtime dependency and the SVG graph is displayed
2. the progress denominator equals the registration receipt applied_count and expected_count, which the renderer already refuses to render when they disagree
3. the progress numerator equals the number of child tasks whose status is done or closed, recomputed independently from the graph store rather than read back from the receipt
4. the rendered subject corresponds to the source_digest recorded in the registration receipt

生成 HTML、render metadata、renderer receipt の `registration_verification.status=verified` も確認してください。

完了時は `out/status.json` だけを `{"status":"PASS|FAIL|ERROR","scenario":"C05-OUT1-positive-feature-progress"}` 形式で書き、最後に `DONE: <status>` と 1 行だけ報告してください。途中で人間に質問せず最後まで自走し、skill の手順に忠実に従い、人手の追加判断・省略をしないでください。
