# タスク: dev-graph:run-dev-graph-node の fresh live-trial

scenario: `C02-OUT1-positive-mixed-artifacts`

この run は過去の証跡を再利用しない。現在の plugin を、今回だけの fixture に対して実行し、
下記の全てを同一 assistant turn で完了させる。

- WORKDIR: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260804T052500Z-ci-c02-r2`
- FIXTURE: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260804T052500Z-ci-c02-r2/fixture-repo`
- 正規手順の参照: `eval-log/dev-graph/run-dev-graph-node/live-trial/20260806T010000Z-f84o-postmain-c02/task.md`

最初に正規手順の参照と scenario 正本
`plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` を Read すること。参照 task の
工程 1〜4、goal_seek evidence の正確な内容、検証、制約を一つも省略せず実行する。ただし、過去 run の
WORKDIR / FIXTURE / status 出力先だけを今回の値へ置換する。過去 fixture や HarnessHub 本体を
変更してはいけない。

## required_observations（scenario 正本の逐語転記）

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

必ず次の literal Skill 呼出しを最初の実行として行う。1 回目の登録後、参照 task に従って 5 件全てを
同じ Skill で連続更新し、直ちに全検証、goal_seek evidence、status marker の工程を終えるまで戻らない。

```text
Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260804T052500Z-ci-c02-r2/fixture-repo --input /Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260804T052500Z-ci-c02-r2/fixture-repo/mixed-artifacts.json"})
```

完了 marker は次だけを Write する。

`/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260804T052500Z-ci-c02-r2/out/status.json`

```json
{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}
```

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には status.json 以外を書かないこと。
- marker の後だけ `DONE: <status>` と 1 行で報告すること。
