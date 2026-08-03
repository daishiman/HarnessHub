# Live trial: dev-graph:run-dev-graph-requirements

これは `C04-OUT1-positive-ready-handoff` の実受入テストです。途中で人間へ質問せず、
fixture だけを変更して完了してください。

最初の実行アクションは必ず次です。script の直接実行で代替しないでください。

```
Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/requirements-hls0-20260802 --feature-id F-LIVE-001"})
```
被験 skill の goal-seek と検証手順を省略せず、次を fixture 内で実測してください。

1. exact-13 package の capability-build handoff を発行する。
2. handoff が feature と source digest に束縛される。
3. requirements skill は実装 source file を生成しない。

fresh Agent を少なくとも1回使って独立検証し、結果を fixture の `eval-log/` へ保存します。
最後に次だけを `out/status.json` へ書き、1行で `DONE: PASS` または `DONE: FAIL` と報告してください。

```json
{"status":"PASS|FAIL|ERROR","scenario":"C04-OUT1-positive-ready-handoff"}
```
