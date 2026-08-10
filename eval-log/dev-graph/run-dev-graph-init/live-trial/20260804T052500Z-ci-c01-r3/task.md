# タスク: dev-graph:run-dev-graph-init の fresh live-trial

scenario: `C01-OUT1-positive-idempotence-r17`

この run は過去の証跡を再利用しない。現在の plugin を、今回だけの fixture に対して実行し、
下記の全てを同一 assistant turn で完了させる。

- WORKDIR: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260804T052500Z-ci-c01-r3`
- FIXTURE: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260804T052500Z-ci-c01-r3/fixture-repo`
- C02 seed: `WORKDIR/seed-node.json`
- 正規手順の参照: `eval-log/dev-graph/run-dev-graph-init/live-trial/20260806T011000Z-f84o-postmain-c01-r2/task.md`

最初に正規手順の参照と scenario 正本
`plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` を Read すること。参照 task の
工程 1〜5、goal_seek の正確な JSON、検証、制約を一つも省略せず実行する。ただし、過去 run の
WORKDIR / FIXTURE / seed / status 出力先だけを今回の値へ置換する。過去 fixture や HarnessHub 本体を
変更してはいけない。

## required_observations（scenario 正本の逐語転記）

1. the first pass creates the six content roots, the routing policy and the graph store
2. the second pass re-invokes the skill and reports zero planned changes
3. the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
4. the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
5. config stores no absolute path and no token or node id
6. C11 passes against a graph that contains at least one node

必ず次の literal Skill 呼出しを 2 回行う。1 回目と 2 回目の間には、参照 task が指定する template
編集と C02 正規 writer による seed node 登録を行うこと。各 Skill の summary は完了ではなく、2 回目の
呼出し後にも直ちに検証・goal_seek evidence・status marker の工程へ続けること。

```text
Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260804T052500Z-ci-c01-r3/fixture-repo --hook-source plugin"})
```

完了 marker は次だけを Write する。

`/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260804T052500Z-ci-c01-r3/out/status.json`

```json
{"status":"PASS|FAIL|ERROR","scenario":"C01-OUT1-positive-idempotence-r17"}
```

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には status.json 以外を書かないこと。
- marker の後だけ `DONE: <status>` と 1 行で報告すること。
