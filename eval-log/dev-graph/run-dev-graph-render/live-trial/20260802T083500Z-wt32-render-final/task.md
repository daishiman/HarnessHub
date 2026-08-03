# タスク: render live trial r2

scenario `C05-OUT1-positive-feature-progress` を、次の隔離 fixture で実行してください。

fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-render-final`

必ず次の Skill ツールを 1 回起動してください。内部 script の直実行で skill 本体を代替してはいけません。

`Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-render-final"})`

## goal-seek 証跡の厳格契約

fixture の `eval-log/` に次の正確な 3 ファイル名を作成してください。

- `run-dev-graph-render-goal-spec.json`: JSON object 1 個だけ。JSONL にしない。
- `run-dev-graph-render-progress.json`: JSON object 1 個だけ。全 checklist の status/evidence を持つ。
- `run-dev-graph-render-intermediate.jsonl`: Skill 実行前に 1 行目を作り、実行・検証後に 2 行目だけを append する。後から 2 行をまとめて書かない。

`intermediate.jsonl` の各行は、同一の `original_goal` とその正しい UTF-8 SHA-256 を使い、`original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal` の 6 key をすべて持たせてください。1 行目も省略不可です。SKILL.md の検証 script を実行し PASS を確認してください。

registration receipt は fixture の `system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json`、scope は `LT-FEATURE-001` を使い、生成 HTML、render metadata、renderer receipt の `registration_verification.status=verified` を確認してください。

## required_observations（scenario 正本の逐語転記）

1. the rendered HTML and CSS open with no additional runtime dependency and the SVG graph is displayed
2. the progress denominator equals the registration receipt applied_count and expected_count, which the renderer already refuses to render when they disagree
3. the progress numerator equals the number of child tasks whose status is done or closed, recomputed independently from the graph store rather than read back from the receipt
4. the rendered subject corresponds to the source_digest recorded in the registration receipt

完了時は `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-render/live-trial/20260802T083500Z-wt32-render-final/out/status.json` だけを `{"status":"PASS|FAIL|ERROR","scenario":"C05-OUT1-positive-feature-progress"}` 形式で書き、最後に `DONE: <status>` と 1 行だけ報告してください。fixture の `out/status.json` へ書いて代替してはいけません。途中で人間に質問せず最後まで自走し、skill の手順に忠実に従い、人手の追加判断・省略をしないでください。
