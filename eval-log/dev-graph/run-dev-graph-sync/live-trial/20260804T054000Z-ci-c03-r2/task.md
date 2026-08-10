# タスク: dev-graph:run-dev-graph-sync の fresh live-trial

scenario: `C03-OUT1-positive-second-sync-zero`

この run は過去の証跡を再利用せず、現在の plugin を今回だけの fixture で実行する。

- WORKDIR: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2`
- FIXTURE: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2/fixture-repo`
- 正規手順の参照: `eval-log/dev-graph/run-dev-graph-sync/live-trial/20260807T000000Z-ci-c03/task.md`

最初に参照 task と scenario 正本
`plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` を Read すること。参照 task の工程
1〜3、goal_seek evidence の正確な内容、検証、制約を一つも省略せず実行する。ただし、過去 run の
WORKDIR / FIXTURE / status 出力先だけを今回の値へ置換する。外部 GitHub API、`gh`、実 Beads へは
アクセスせず、fixture の `.dev-graph/remote.json` の決定論 adapter だけを使う。

## required_observations（scenario 正本の逐語転記）

1. the first sync applies the expected import and export
2. the second sync reports imports changes=0 and exports changes=0
3. stable IDs and snapshots are unchanged on the second run

必ず次の 3 本の literal Skill 呼出しを順に行う。Skill の summary は完了ではなく、3 回目の直後にも
検証・goal_seek evidence・status marker の工程を終えるまで同一 turn を継続すること。

```text
Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2/fixture-repo --dry-run"})
Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2/fixture-repo --apply"})
Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2/fixture-repo --dry-run"})
```

完了 marker は次だけを Write する。

`/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2/out/status.json`

```json
{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}
```

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には status.json 以外を書かないこと。
- marker の後だけ `DONE: <status>` と 1 行で報告すること。
