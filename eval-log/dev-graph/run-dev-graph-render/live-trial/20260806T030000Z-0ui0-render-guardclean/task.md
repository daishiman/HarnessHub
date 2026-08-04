# タスク: dev-graph:run-dev-graph-render の guard-clean fresh live trial

隔離 fixture:

`/Users/dm/orca/workspaces/HarnessHub/wt-25/eval-log/dev-graph/live-trial-fixtures/20260806-0ui0-render-guardclean`

scenario: `C05-OUT1-positive-feature-progress`

required observations:

1. the rendered HTML and CSS open with no additional runtime dependency and the SVG graph is displayed
2. the progress denominator equals the registration receipt applied_count and expected_count, which the renderer already refuses to render when they disagree
3. the progress numerator equals the number of child tasks whose status is done or closed, recomputed independently from the graph store rather than read back from the receipt
4. the rendered subject corresponds to the source_digest recorded in the registration receipt

実行する Skill:

`Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-25/eval-log/dev-graph/live-trial-fixtures/20260806-0ui0-render-guardclean"})`

## transcript C02 guard の絶対制約

この trial は C02 guard を通すことが必須である。次の文字列を含む Bash command は、**書込み・削除・copy・redirect・tee・Python の `open` / `write_text` / `json.dump` を 1 つも含めてはならない**: `receipt`, `registration-receipt`, `dev-graph-registration`。

- 受領書は read-only の専用 Bash command で読む。作成、編集、削除、copy、rename、scratch copy は禁止。
- goal-seek の 3 artifact (`run-dev-graph-render-goal-spec.json`、`run-dev-graph-render-progress.json`、`run-dev-graph-render-intermediate.jsonl`) と `out/status.json` は **Write tool だけ**で作成する。Bash/Python で書かない。
- goal-seek artifact の本文にも `receipt` の文字列を入れない。照合対象は `registration proof` と呼ぶ。
- renderer stdout は名前に `receipt` を含めない `render-result.json` へ保存してよい。
- negative probe は実行しない。既存 focused regression が不一致時の fail-closed を証明する。

goal-seek は上記 3 artifact を fixture の `eval-log/` に作り、intermediate は実行前の1行と完了後appendの2行だけにする。全 6 key (`original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、`merged_directive_for_next`、`drift_signal`) と同一 UTF-8 SHA-256 を使う。Skill の検証 script を実行して PASS を確認する。

正常な registration proof で `verified`、HTML、metadata、SVG、13/13 分母、独立再計算された 4 分子、source digest を確認する。変更対象の新しい stale-only `partial` は focused regression を根拠にする。

完了時は次だけを Write し、最後は `DONE: <status>` の1行だけを返す。

`/Users/dm/orca/workspaces/HarnessHub/wt-25/eval-log/dev-graph/run-dev-graph-render/live-trial/20260806T030000Z-0ui0-render-guardclean/out/status.json`

`{"status":"PASS|FAIL|ERROR","scenario":"C05-OUT1-positive-feature-progress"}`
