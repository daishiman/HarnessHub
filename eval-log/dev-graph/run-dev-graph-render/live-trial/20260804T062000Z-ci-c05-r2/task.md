# タスク: dev-graph:run-dev-graph-render の fresh live-trial

scenario: `C05-OUT1-positive-feature-progress`

この run は過去の証跡を再利用せず、現在の plugin を今回だけの fixture で実行する。

- WORKDIR: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-render/live-trial/20260804T062000Z-ci-c05-r2`
- FIXTURE: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-render/live-trial/20260804T062000Z-ci-c05-r2/fixture-repo`
- 正規手順の参照: `eval-log/dev-graph/run-dev-graph-render/live-trial/20260806T030000Z-0ui0-render-guardclean/task.md`

最初に参照 task と scenario 正本
`plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` を Read すること。参照 task の C02 guard
制約、goal_seek evidence の正確な内容、検証、制約を一つも省略せず実行する。ただし、過去 run の
WORKDIR / FIXTURE / status 出力先だけを今回の値へ置換する。registration proof は read-only command でのみ
読み、Bash/Python による作成・編集・削除・copy・redirect・tee は使わない。

## required_observations（scenario 正本の逐語転記）

1. the rendered HTML and CSS open with no additional runtime dependency and the SVG graph is displayed
2. the progress denominator equals the registration receipt applied_count and expected_count, which the renderer already refuses to render when they disagree
3. the progress numerator equals the number of child tasks whose status is done or closed, recomputed independently from the graph store rather than read back from the receipt
4. the rendered subject corresponds to the source_digest recorded in the registration receipt

必ず次の literal Skill 呼出しを行い、summary 後にも検証・goal_seek evidence・status marker の工程を終えるまで同一 turn を継続する。

```text
Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-render/live-trial/20260804T062000Z-ci-c05-r2/fixture-repo"})
```

完了 marker は次だけを Write する。

`/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-render/live-trial/20260804T062000Z-ci-c05-r2/out/status.json`

```json
{"status":"PASS|FAIL|ERROR","scenario":"C05-OUT1-positive-feature-progress"}
```

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には status.json 以外を書かないこと。
- marker の後だけ `DONE: <status>` と 1 行で報告すること。
