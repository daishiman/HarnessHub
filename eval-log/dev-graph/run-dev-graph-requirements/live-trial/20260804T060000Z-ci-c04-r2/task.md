# タスク: dev-graph:run-dev-graph-requirements の fresh live-trial

scenario: `C04-OUT1-positive-ready-handoff`

この run は過去の証跡を再利用せず、現在の plugin を今回だけの fixture で実行する。

- WORKDIR: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260804T060000Z-ci-c04-r2`
- FIXTURE: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260804T060000Z-ci-c04-r2/fixture-repo`
- 正規手順の参照: `eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260806T010000Z-f84o-postmain-c04/task.md`

最初に参照 task と scenario 正本
`plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` を Read すること。参照 task の工程
1〜4、goal_seek evidence の正確な内容、検証、制約を一つも省略せず実行する。ただし、過去 run の
WORKDIR / FIXTURE / status 出力先だけを今回の値へ置換する。package と graph store は手作業で書き換えず、
実装ソースを生成しないこと。

## required_observations（scenario 正本の逐語転記）

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the requirements skill generates no implementation source file

Skill の前後で fixture の全ファイル一覧を記録し、差分で observation 3 を実証する。必ず次の literal
Skill 呼出しを行い、summary 後にも検証・goal_seek evidence・status marker の工程を終えるまで同一 turn を継続する。

```text
Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260804T060000Z-ci-c04-r2/fixture-repo --feature-id F-LIVE-001"})
```

完了 marker は次だけを Write する。

`/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260804T060000Z-ci-c04-r2/out/status.json`

```json
{"status":"PASS|FAIL|ERROR","scenario":"C04-OUT1-positive-ready-handoff"}
```

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には status.json 以外を書かないこと。
- marker の後だけ `DONE: <status>` と 1 行で報告すること。
