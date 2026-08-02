# Live trial: dev-graph:run-dev-graph-sync

これは `C03-OUT1-positive-second-sync-zero` の実受入テストです。途中で人間へ質問せず、
fixture だけを変更して完了してください。

最初の実行アクションは必ず次です。script の直接実行で代替しないでください。

```
Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/sync-hls0-20260802。fixture 内の決定論 remote を使い、dry-run、apply、確認 dry-run を同じ入力で順に実行する"})
```
被験 skill の goal-seek と検証手順を省略せず、次を fixture 内で実測してください。

1. 最初の sync は期待する import/export を適用する。
2. 2回目は imports / exports とも `changes=0` を報告する。
3. 2回目で stable IDs と snapshots は不変である。

fresh Agent を少なくとも1回使って独立検証し、結果を fixture の `eval-log/` へ保存します。
最後に次だけを `out/status.json` へ書き、1行で `DONE: PASS` または `DONE: FAIL` と報告してください。

```json
{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}
```
